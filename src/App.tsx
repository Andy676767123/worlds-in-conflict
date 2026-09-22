import { useEffect, useMemo, useState } from 'react';

type Mood = 'peace' | 'war' | 'alliance';
type Nation = { id: string; name: string; x: number; y: number; color: string; mood: Mood; army: number; economy: number; morale: number; gold: number; food: number; tech: number };

type Event = { id: number; kind: string; text: string; turn: number };

const names = ['Aurelia', 'Northmere', 'Vardor', 'Solara', 'Kharon', 'Fjord', 'Tharven', 'Eryndor', 'Rivara', 'Helios'];
const colors = ['#788b55', '#9b6552', '#b58c52', '#657d82', '#9a7654', '#6f8658', '#8f625e', '#a28755', '#687d62', '#947056'];
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const random = (min: number, max: number) => Math.random() * (max - min) + min;
const distance = (a: Nation, b: Nation) => Math.hypot(a.x - b.x, a.y - b.y);

function createWorld(): Nation[] {
  return names.map((name, index) => ({
    id: `nation-${index}`, name, x: random(10, 90), y: random(12, 88), color: colors[index],
    mood: index % 3 === 0 ? 'war' : index % 3 === 1 ? 'alliance' : 'peace',
    army: random(25, 90), economy: random(30, 100), morale: random(45, 100),
    gold: random(40, 120), food: random(40, 110), tech: random(15, 75)
  }));
}

function App() {
  const [nations, setNations] = useState<Nation[]>(createWorld);
  const [selectedId, setSelectedId] = useState('');
  const [turn, setTurn] = useState(1);
  const [running, setRunning] = useState(true);
  const [events, setEvents] = useState<Event[]>([{ id: 1, kind: 'frontier', text: 'The campaign begins. The frontiers are unsettled.', turn: 1 }]);
  const selected = useMemo(() => nations.find(n => n.id === selectedId) ?? nations[0], [nations, selectedId]);
  const neighbours = useMemo(() => selected ? nations.filter(n => n.id !== selected.id && distance(n, selected) < 30) : [], [nations, selected]);
  const totalArmy = nations.reduce((sum, n) => sum + n.army, 0);
  const addEvent = (kind: string, text: string) => setEvents(old => [{ id: Date.now() + Math.random(), kind, text, turn }, ...old].slice(0, 12));

  useEffect(() => { if (!selectedId && nations[0]) setSelectedId(nations[0].id); }, [nations, selectedId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setNations(current => {
        const next = current.map(n => ({
          ...n,
          gold: clamp(n.gold + n.economy * .08 - n.army * .035, 0, 200),
          food: clamp(n.food + n.economy * .05 - 1, 0, 180),
          tech: clamp(n.tech + (n.economy > 65 ? .7 : .25), 1, 150),
          army: clamp(n.army + (n.mood === 'war' ? 1.8 : .7) + (n.gold > 90 ? 1 : 0) - (n.food < 25 ? 2 : 0), 1, 180),
          morale: clamp(n.morale + (n.food > 45 ? 1 : -3) + (n.mood === 'peace' ? 1 : 0), 10, 100),
          x: clamp(n.x + random(-1, 1), 6, 94), y: clamp(n.y + random(-1, 1), 6, 94)
        }));
        for (const attacker of next) {
          const target = [...next].filter(n => n.id !== attacker.id && distance(attacker, n) < 25).sort((a, b) => a.army - b.army)[0];
          if (target && attacker.mood === 'war' && attacker.army > target.army && Math.random() < .16) {
            target.army = clamp(target.army - random(5, 13), 1, 180); target.morale = clamp(target.morale - 8, 10, 100); attacker.army = clamp(attacker.army - random(2, 7), 1, 180);
            addEvent('battle', `${attacker.name} attacks ${target.name} along the frontier.`);
          }
        }
        return next;
      });
      setTurn(value => value + 1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [running]);

  const changeMood = (mood: Mood) => { if (!selected) return; setNations(ns => ns.map(n => n.id === selected.id ? { ...n, mood } : n)); addEvent('diplomacy', `${selected.name} adopts a ${mood} policy.`); };
  const invest = () => { if (!selected || selected.gold < 15) return; setNations(ns => ns.map(n => n.id === selected.id ? { ...n, gold: n.gold - 15, economy: n.economy + 10, tech: n.tech + 4, food: n.food + 5 } : n)); addEvent('economy', `${selected.name} invests in industry and research.`); };
  const declareWar = (target: Nation) => { if (!selected) return; setNations(ns => ns.map(n => n.id === selected.id ? { ...n, mood: 'war' } : n)); addEvent('war', `${selected.name} declares war on ${target.name}.`); };
  const attack = (target: Nation) => { if (!selected) return; declareWar(target); setNations(ns => ns.map(n => n.id === selected.id ? { ...n, army: clamp(n.army - 7, 1, 180) } : n.id === target.id ? { ...n, army: clamp(n.army - 14, 1, 180), morale: clamp(n.morale - 12, 10, 100) } : n)); addEvent('battle', `${selected.name} launches an offensive against ${target.name}.`); };
  const reset = () => { setNations(createWorld()); setTurn(1); setEvents([{ id: Date.now(), kind: 'frontier', text: 'A new campaign begins.', turn: 1 }]); };

  return <div className="app-shell">
    <header className="topbar"><div><p className="eyebrow">Grand campaign · turn {turn}</p><h1>Worlds in Conflict</h1></div><div className="toolbar"><button onClick={() => setRunning(v => !v)}>{running ? 'Pause' : 'Resume'}</button><button className="accent" onClick={reset}>New campaign</button></div></header>
    <main className="layout"><section className="world-panel"><div className="stats-grid"><div className="stat"><span>Command</span><strong>{selected?.name ?? '—'}</strong></div><div className="stat"><span>Total army</span><strong>{Math.round(totalArmy)}</strong></div><div className="stat"><span>Frontier powers</span><strong>{neighbours.length}</strong></div><div className="stat"><span>Campaign</span><strong>{running ? 'Live' : 'Paused'}</strong></div></div>
      <div className="map"><div className="compass">N</div><svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">{nations.flatMap(a => nations.filter(b => b.id !== a.id && distance(a, b) < 25).map(b => <line key={`${a.id}-${b.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />))}</svg>{nations.map(n => <button key={n.id} className={`nation ${selected?.id === n.id ? 'selected' : ''}`} style={{ left: `${n.x}%`, top: `${n.y}%`, background: n.color }} onClick={() => setSelectedId(n.id)}><span>{n.name}</span><small>{Math.round(n.army)}</small></button>)}</div>
    </section><aside className="sidebar"><div className="card command-card"><p className="panel-kicker">Selected nation</p><h2>{selected?.name ?? 'Select a nation'}</h2><div className="metrics">{[['Army', selected?.army], ['Morale', selected?.morale], ['Gold', selected?.gold], ['Food', selected?.food], ['Industry', selected?.economy], ['Technology', selected?.tech]].map(([label, value]) => <div key={label as string}><span>{label as string}</span><strong>{Math.round(Number(value) || 0)}</strong></div>)}<div className="wide"><span>Policy</span><strong>{selected?.mood ?? 'peace'}</strong></div></div><div className="actions"><button onClick={() => changeMood('war')}>Mobilize</button><button onClick={() => changeMood('peace')}>Seek peace</button><button onClick={() => changeMood('alliance')}>Diplomacy</button><button onClick={invest}>Invest · 15 gold</button></div></div>
      <div className="card"><p className="panel-kicker">Frontier command</p>{neighbours.length === 0 ? <p className="muted">No nearby powers.</p> : neighbours.slice(0, 5).map(target => <div className="frontier-row" key={target.id}><div><b>{target.name}</b><small>{Math.round(target.army)} army · {target.mood}</small></div><div className="row-actions"><button onClick={() => declareWar(target)}>War</button><button className="accent" onClick={() => attack(target)}>Attack</button></div></div>)}</div>
      <div className="card"><p className="panel-kicker">Frontier events</p><ul className="log">{events.map(event => <li key={event.id}><small className={`event-${event.kind}`}>{event.kind}</small>{event.text}<em>Turn {event.turn}</em></li>)}</ul></div>
    </aside></main></div>;
}

export default App;
