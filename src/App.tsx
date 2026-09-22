import { useEffect, useMemo, useState } from 'react';

type Mood = 'peace' | 'war' | 'alliance';
type Relation = 'neutral' | 'war' | 'alliance';
type EventKind = 'battle' | 'diplomacy' | 'economy' | 'frontier';
type Nation = { id:string; name:string; x:number; y:number; color:string; mood:Mood; army:number; economy:number; influence:number; morale:number; gold:number; food:number; technology:number };
type Event = { id:number; kind:EventKind; text:string; turn:number };

const names = ['Aurelia','Northmere','Vardor','Solara','Kharon','Fjord','Tharven','Eryndor','Rivara','Helios'];
const colors = ['#5dade2','#ec7063','#52be80','#af7ac5','#f5b041','#48c9b0','#7dcea0','#f1948a','#82e0aa','#d7bde2'];
const clamp = (v:number,min:number,max:number) => Math.min(Math.max(v,min),max);
const random = (min:number,max:number) => Math.random()*(max-min)+min;
const distance = (a:Nation,b:Nation) => Math.hypot(a.x-b.x,a.y-b.y);

function createWorld(): Nation[] { return names.map((name,index) => ({ id:`nation-${index}`, name, x:random(10,90), y:random(12,88), color:colors[index], mood:index%3===0?'war':index%3===1?'alliance':'peace', army:random(25,90), economy:random(25,100), influence:random(20,80), morale:random(45,100), gold:random(40,120), food:random(40,110), technology:random(15,75) })); }

function App() {
  const [nations,setNations] = useState<Nation[]>(createWorld);
  const [selectedId,setSelectedId] = useState('');
  const [turn,setTurn] = useState(1);
  const [running,setRunning] = useState(true);
  const [events,setEvents] = useState<Event[]>([{id:1,kind:'frontier',text:'The world awakens. Frontiers are unsettled.',turn:1}]);
  const [relations,setRelations] = useState<Record<string,Relation>>({});
  const [campaign,setCampaign] = useState({wars:0, victories:0, treaties:0, investments:0});
  const selected = useMemo(() => nations.find(n=>n.id===selectedId) ?? nations[0], [nations,selectedId]);
  const neighbors = useMemo(() => selected ? nations.filter(n=>n.id!==selected.id && distance(selected,n)<30) : [], [nations,selected]);
  const addEvent = (kind:EventKind,text:string) => setEvents(old=>[{id:Date.now()+Math.random(),kind,text,turn},...old].slice(0,14));
  const relationKey = (a:string,b:string) => [a,b].sort().join(':');
  const relationTo = (other:Nation) => relations[relationKey(selected?.id ?? '',other.id)] ?? 'neutral';

  useEffect(() => { if (!selectedId && nations[0]) setSelectedId(nations[0].id); }, [nations,selectedId]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setNations(current => {
        const next = current.map(n => ({...n, gold:clamp(n.gold+n.economy*.08-n.army*.035,0,200), food:clamp(n.food+n.economy*.05-1,0,180), technology:clamp(n.technology+(n.economy>65?.7:.25),1,150), army:clamp(n.army+(n.mood==='war'?1.8:.7)+(n.gold>90?1:0)-(n.food<25?2:0),1,180), morale:clamp(n.morale+(n.food>45?1:-3)+(n.mood==='peace'?1:0),10,100), influence:clamp(n.influence+(n.mood==='alliance'?1.2:.2),5,150), x:clamp(n.x+random(-1,1),6,94), y:clamp(n.y+random(-1,1),6,94)}));
        for (const attacker of next) {
          const target = [...next].filter(n=>n.id!==attacker.id && distance(attacker,n)<25).sort((a,b)=>a.army-b.army)[0];
          if (target && attacker.mood==='war' && attacker.army>target.army && Math.random()<.16) { target.army=clamp(target.army-random(5,13),1,180); target.morale=clamp(target.morale-8,10,100); attacker.army=clamp(attacker.army-random(2,7),1,180); addEvent('battle',`${attacker.name} attacks ${target.name} along the frontier.`); }
        }
        return next;
      });
      setTurn(v=>v+1);
    },1800);
    return () => window.clearInterval(timer);
  }, [running]);

  const setMood = (mood:Mood) => { if (!selected) return; setNations(ns=>ns.map(n=>n.id===selected.id?{...n,mood}:n)); addEvent('diplomacy',`${selected.name} changes policy to ${mood}.`); };
  const declareWar = (target:Nation) => { if (!selected) return; const key=relationKey(selected.id,target.id); setRelations(r=>({...r,[key]:'war'})); setNations(ns=>ns.map(n=>n.id===selected.id?{...n,mood:'war'}:n)); setCampaign(c=>({...c,wars:c.wars+1})); addEvent('battle',`${selected.name} declares war on ${target.name}.`); };
  const formAlliance = (target:Nation) => { if (!selected) return; const key=relationKey(selected.id,target.id); setRelations(r=>({...r,[key]:'alliance'})); setCampaign(c=>({...c,treaties:c.treaties+1})); addEvent('diplomacy',`${selected.name} signs an alliance with ${target.name}.`); };
  const invest = () => { if (!selected || selected.gold<15) return addEvent('economy',`${selected?.name ?? 'The nation'} cannot afford an investment.`); setNations(ns=>ns.map(n=>n.id===selected.id?{...n,gold:n.gold-15,economy:n.economy+10,technology:n.technology+4,food:n.food+5}:n)); setCampaign(c=>({...c,investments:c.investments+1})); addEvent('economy',`${selected.name} invests in industry and research.`); };
  const attack = (target:Nation) => { if (!selected) return; declareWar(target); setNations(ns=>ns.map(n=>n.id===selected.id?{...n,army:clamp(n.army-7,1,180)}:n.id===target.id?{...n,army:clamp(n.army-14,1,180),morale:clamp(n.morale-12,10,100)}:n)); setCampaign(c=>({...c,victories:c.victories+(selected.army>target.army?1:0)})); addEvent('battle',`${selected.name} launches an offensive against ${target.name}.`); };
  const reset = () => { setNations(createWorld()); setRelations({}); setTurn(1); setCampaign({wars:0,victories:0,treaties:0,investments:0}); setEvents([{id:Date.now(),kind:'frontier',text:'A new campaign begins.',turn:1}]); };
  const totalArmy=nations.reduce((s,n)=>s+n.army,0); const strongest=[...nations].sort((a,b)=>b.army-a.army)[0];

  return <div className="app-shell">
    <header className="topbar"><div><p className="eyebrow">Campaign command · turn {turn}</p><h1>Worlds in Conflict</h1></div><div className="toolbar"><button onClick={()=>setRunning(v=>!v)}>{running?'Pause':'Resume'}</button><button className="accent" onClick={reset}>New campaign</button></div></header>
    <main className="layout"><section className="world-panel"><div className="stats-grid"><div className="stat"><span>Selected nation</span><strong>{selected?.name??'—'}</strong></div><div className="stat"><span>Total army</span><strong>{Math.round(totalArmy)}</strong></div><div className="stat"><span>Strongest power</span><strong>{strongest?.name??'—'}</strong></div><div className="stat"><span>Campaign</span><strong>{campaign.wars} wars</strong></div></div>
      <div className="map"><svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">{nations.flatMap(a=>nations.filter(b=>b.id!==a.id&&distance(a,b)<25).map(b=><line key={`${a.id}-${b.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>))}</svg>{nations.map(n=><button key={n.id} className={`nation ${selected?.id===n.id?'selected':''}`} style={{left:`${n.x}%`,top:`${n.y}%`,background:n.color}} onClick={()=>setSelectedId(n.id)}><span>{n.name}</span><small>{Math.round(n.army)}</small></button>)}</div>
    </section><aside className="sidebar"><div className="card"><h2>Selected nation</h2><h3>{selected?.name??'Select a nation'}</h3><div className="metrics"><div><span>Army</span><strong>{Math.round(selected?.army??0)}</strong></div><div><span>Morale</span><strong>{Math.round(selected?.morale??0)}</strong></div><div><span>Gold</span><strong>{Math.round(selected?.gold??0)}</strong></div><div><span>Food</span><strong>{Math.round(selected?.food??0)}</strong></div><div><span>Industry</span><strong>{Math.round(selected?.economy??0)}</strong></div><div><span>Technology</span><strong>{Math.round(selected?.technology??0)}</strong></div><div className="wide"><span>Policy</span><strong>{selected?.mood??'peace'}</strong></div></div><div className="actions"><button onClick={()=>setMood('war')}>Mobilize</button><button onClick={()=>setMood('peace')}>Seek peace</button><button onClick={()=>setMood('alliance')}>Diplomacy</button><button onClick={invest}>Invest · 15 gold</button></div></div>
      <div className="card"><h3>Frontier command</h3>{neighbors.length===0?<p className="muted">No nearby powers.</p>:neighbors.slice(0,5).map(target=><div className="frontier-row" key={target.id}><div><b>{target.name}</b><small>{Math.round(target.army)} army · {relationTo(target)}</small></div><div className="row-actions"><button onClick={()=>declareWar(target)}>War</button><button onClick={()=>formAlliance(target)}>Pact</button><button className="accent" onClick={()=>attack(target)}>Attack</button></div></div>)}</div>
      <div className="card"><h3>Campaign tracker</h3><div className="tracker"><span>Wars declared <b>{campaign.wars}</b></span><span>Victories <b>{campaign.victories}</b></span><span>Treaties <b>{campaign.treaties}</b></span><span>Investments <b>{campaign.investments}</b></span></div></div>
      <div className="card"><h3>Frontier events</h3><ul className="log">{events.map(e=><li key={e.id}><small className={`event-${e.kind}`}>{e.kind}</small>{e.text}<em>Turn {e.turn}</em></li>)}</ul></div>
    </aside></main></div>;
}
export default App;
