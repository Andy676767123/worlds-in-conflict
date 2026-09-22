import { useEffect, useMemo, useState } from 'react';

type Mood = 'peace' | 'war' | 'alliance';
type Nation = { id: string; name: string; color: string; mood: Mood; army: number; morale: number; gold: number; food: number; economy: number; influence: number; labelX: number; labelY: number };
type Attack = { id: number; from: string; to: string; turn: number };
type Event = { id: number; text: string; kind: 'battle' | 'diplomacy' | 'economy' | 'frontier'; turn: number };
type Territory = readonly [string, string, number, number];

const territories: Territory[] = [
  ['Aurelia', '3,8 18,4 31,12 28,29 16,34 4,25', 17, 18],
  ['Northmere', '34,5 49,7 58,19 51,34 35,30 28,17', 43, 19],
  ['Vardor', '61,7 78,5 91,15 87,31 72,35 56,23', 75, 19],
  ['Solara', '8,39 24,34 36,43 31,59 16,66 3,55', 19, 50],
  ['Kharon', '39,37 53,34 65,45 59,62 44,66 32,53', 49, 50],
  ['Fjord', '70,37 87,34 98,45 94,61 78,67 63,53', 81, 50],
  ['Tharven', '5,70 20,64 34,73 30,91 13,96 2,85', 18, 80],
  ['Eryndor', '38,69 52,64 66,74 61,91 45,96 32,83', 49, 80],
  ['Rivara', '69,69 84,65 98,76 94,92 78,96 63,83', 81, 80],
  ['Helios', '42,26 57,27 67,38 59,48 45,45 35,34', 51, 37]
];

const sandColors = ['#c9a86a', '#b9945b', '#d1b477', '#bfa064', '#d7bd83', '#aa8853', '#c4a36b', '#d0b274', '#b18f5b', '#cbb17a'];
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const distance = (a: Nation, b: Nation) => Math.hypot(a.labelX - b.labelX, a.labelY - b.labelY);

function createWorld(): Nation[] {
  return territories.map(([name, , labelX, labelY], index) => ({
    id: `nation-${index}`, name, color: sandColors[index], labelX, labelY,
    mood: index % 3 === 0 ? 'war' : index % 3 === 1 ? 'alliance' : 'peace',
    army: randomBetween(35, 95), morale: randomBetween(50, 95), gold: randomBetween(45, 120),
    food: randomBetween(45, 110), economy: randomBetween(35, 95), influence: randomBetween(25, 80)
  }));
}

function App() {
  const [nations, setNations] = useState<Nation[]>(createWorld);
  const [owners, setOwners] = useState<Record<string, string>>(() => Object.fromEntries(territories.map(([name], index) => [name, `nation-${index}`])));
  const [selectedId, setSelectedId] = useState('nation-0');
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [events, setEvents] = useState<Event[]>([{ id: 1, kind: 'frontier', text: 'The borders are drawn. Armies gather at the frontier.', turn: 1 }]);
  const [turn, setTurn] = useState(1);
  const [running, setRunning] = useState(true);

  const selected = useMemo(() => nations.find(nation => nation.id === selectedId) ?? nations[0], [nations, selectedId]);
  const addEvent = (kind: Event['kind'], text: string) => setEvents(current => [{ id: Date.now() + Math.random(), kind, text, turn }, ...current].slice(0, 14));
  const findNation = (id: string) => nations.find(nation => nation.id === id);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setNations(current => {
        const next = current.map(nation => ({
          ...nation,
          gold: clamp(nation.gold + nation.economy * 0.07 - nation.army * 0.03, 0, 200),
          food: clamp(nation.food + nation.economy * 0.04 - 1, 0, 180),
          army: clamp(nation.army + (nation.mood === 'war' ? 1.8 : 0.7) + (nation.gold > 90 ? 0.8 : 0), 1, 180),
          morale: clamp(nation.morale + (nation.food > 45 ? 0.8 : -2.5), 10, 100)
        }));
        const attacker = next.filter(nation => nation.mood === 'war').find(nation => {
          const target = next.filter(other => other.id !== nation.id && distance(nation, other) < 38 && other.army < nation.army * 0.88)[0];
          return Boolean(target) && Math.random() < 0.3;
        });
        if (attacker) {
          const target = next.filter(nation => nation.id !== attacker.id && distance(attacker, nation) < 38 && nation.army < attacker.army * 0.88).sort((a, b) => a.army - b.army)[0];
          if (target) {
            const attackerLoss = randomBetween(3, 9);
            const defenderLoss = randomBetween(8, 18);
            attacker.army = clamp(attacker.army - attackerLoss, 1, 180);
            target.army = clamp(target.army - defenderLoss, 1, 180);
            target.morale = clamp(target.morale - 10, 10, 100);
            const captured = attacker.army > target.army * 1.15 && Math.random() < 0.65;
            if (captured) {
              setOwners(currentOwners => ({ ...currentOwners, [target.name]: attacker.id }));
              attacker.influence = clamp(attacker.influence + 8, 0, 150);
              addEvent('battle', `${attacker.name} captures ${target.name}'s territory and expands its borders.`);
            } else {
              addEvent('battle', `${attacker.name} attacks ${target.name}, but the frontier holds.`);
            }
            setAttacks(currentAttacks => [...currentAttacks.slice(-5), { id: Date.now(), from: attacker.id, to: target.id, turn }]);
          }
        }
        return next;
      });
      setTurn(value => value + 1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [running, turn]);

  const declareWar = (target: Nation) => {
    if (!selected || selected.id === target.id) return;
    setNations(current => current.map(nation => nation.id === selected.id ? { ...nation, mood: 'war' } : nation));
    setAttacks(current => [...current.slice(-5), { id: Date.now(), from: selected.id, to: target.id, turn }]);
    addEvent('battle', `${selected.name} declares war on ${target.name}. The red arrow marks the target.`);
  };

  const attack = (target: Nation) => {
    if (!selected) return;
    declareWar(target);
    const captured = selected.army > target.army * 1.2;
    setNations(current => current.map(nation => {
      if (nation.id === selected.id) return { ...nation, army: clamp(nation.army - 7, 1, 180), mood: 'war' };
      if (nation.id === target.id) return { ...nation, army: clamp(nation.army - 14, 1, 180), morale: clamp(nation.morale - 12, 10, 100) };
      return nation;
    }));
    if (captured) {
      setOwners(current => ({ ...current, [target.name]: selected.id }));
      addEvent('battle', `${selected.name} conquers ${target.name}. The sandy territory changes ownership.`);
    } else addEvent('battle', `${selected.name} attacks ${target.name}, but does not take the territory.`);
  };

  const invest = () => {
    if (!selected || selected.gold < 15) return addEvent('economy', `${selected?.name ?? 'The nation'} lacks gold for investment.`);
    setNations(current => current.map(nation => nation.id === selected.id ? { ...nation, gold: nation.gold - 15, economy: nation.economy + 10, food: nation.food + 5 } : nation));
    addEvent('economy', `${selected.name} invests in farms, workshops, and supplies.`);
  };

  const reset = () => { setNations(createWorld()); setOwners(Object.fromEntries(territories.map(([name], index) => [name, `nation-${index}`]))); setSelectedId('nation-0'); setAttacks([]); setTurn(1); setEvents([{ id: Date.now(), kind: 'frontier', text: 'A new campaign begins.', turn: 1 }]); };
  const target = (id: string) => nations.find(nation => nation.id === id);

  return <div className="app-shell"><header className="topbar"><div><p className="eyebrow">Grand campaign · turn {turn}</p><h1>Worlds in Conflict</h1></div><div className="toolbar"><button onClick={() => setRunning(value => !value)}>{running ? 'Pause' : 'Resume'}</button><button className="accent" onClick={reset}>New campaign</button></div></header><main className="layout"><section className="world-panel"><div className="stats-grid"><div className="stat"><span>Selected nation</span><strong>{selected?.name}</strong></div><div className="stat"><span>Army</span><strong>{Math.round(selected?.army ?? 0)}</strong></div><div className="stat"><span>Land held</span><strong>{Object.values(owners).filter(id => id === selected?.id).length}</strong></div><div className="stat"><span>Attacks shown</span><strong>{attacks.length}</strong></div></div><div className="map"><div className="compass">N</div><svg className="territory-map" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Sandy territory map"><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="#8b2f1e" /></marker></defs>{territories.map(([name, points]) => { const owner = findNation(owners[name]); return <polygon key={name} points={points} fill={owner?.color ?? '#c9a86a'} className={selected?.name === name ? 'territory selected-territory' : 'territory'} onClick={() => setSelectedId(owner?.id ?? '')} />; })}{attacks.map(currentAttack => { const from = target(currentAttack.from); const to = target(currentAttack.to); if (!from || !to) return null; return <g key={currentAttack.id}><line className="attack-line" markerEnd="url(#arrow)" x1={from.labelX} y1={from.labelY} x2={to.labelX} y2={to.labelY} /><circle className="attack-pulse" cx={to.labelX} cy={to.labelY} r="2" /></g>; })}{nations.map(nation => <g key={nation.id} className="territory-label" onClick={() => setSelectedId(nation.id)}><text x={nation.labelX} y={nation.labelY - 1} textAnchor="middle">{nation.name}</text><text x={nation.labelX} y={nation.labelY + 3} textAnchor="middle" className="army-label">⚔ {Math.round(nation.army)}</text></g>)}</svg>{attacks.length > 0 && <div className="map-legend"><span className="red-dot" /> Red arrows show active attacks and targets</div>}</div></section><aside className="sidebar"><div className="card command-card"><p className="panel-kicker">Selected nation</p><h2>{selected?.name}</h2><div className="metrics"><div><span>Army</span><strong>{Math.round(selected?.army ?? 0)}</strong></div><div><span>Morale</span><strong>{Math.round(selected?.morale ?? 0)}</strong></div><div><span>Gold</span><strong>{Math.round(selected?.gold ?? 0)}</strong></div><div><span>Food</span><strong>{Math.round(selected?.food ?? 0)}</strong></div><div><span>Industry</span><strong>{Math.round(selected?.economy ?? 0)}</strong></div><div><span>Land held</span><strong>{Object.values(owners).filter(id => id === selected?.id).length}</strong></div></div><div className="actions"><button onClick={() => setNations(current => current.map(nation => nation.id === selected?.id ? { ...nation, mood: 'war' } : nation))}>Mobilize</button><button onClick={() => setNations(current => current.map(nation => nation.id === selected?.id ? { ...nation, mood: 'peace' } : nation))}>Seek peace</button><button onClick={invest}>Invest · 15 gold</button></div></div><div className="card"><p className="panel-kicker">Frontier command</p>{nations.filter(nation => nation.id !== selected?.id).slice(0, 5).map(nation => <div className="frontier-row" key={nation.id}><div><b>{nation.name}</b><small>{Math.round(nation.army)} army · target territory</small></div><div className="row-actions"><button onClick={() => declareWar(nation)}>War</button><button className="accent" onClick={() => attack(nation)}>Attack</button></div></div>)}</div><div className="card"><p className="panel-kicker">Frontier events</p><ul className="log">{events.map(event => <li key={event.id}><small className={`event-${event.kind}`}>{event.kind}</small>{event.text}<em>Turn {event.turn}</em></li>)}</ul></div></aside></main></div>;
}

export default App;
