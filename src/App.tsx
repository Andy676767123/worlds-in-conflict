import { useEffect, useMemo, useState } from 'react';

type Mood = 'peace' | 'war' | 'alliance';

type Nation = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  mood: Mood;
  army: number;
  economy: number;
  influence: number;
  morale: number;
};

const names = ['Aurelia', 'Northmere', 'Vardor', 'Solara', 'Kharon', 'Fjord', 'Tharven', 'Eryndor', 'Rivara', 'Helios'];
const colors = ['#5dade2', '#ec7063', '#52be80', '#af7ac5', '#f5b041', '#48c9b0', '#7dcea0', '#f1948a', '#82e0aa', '#d7bde2'];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const random = (min: number, max: number) => Math.random() * (max - min) + min;
const distance = (a: Nation, b: Nation) => Math.hypot(a.x - b.x, a.y - b.y);

function createWorld(): Nation[] {
  return names.map((name, index) => ({
    id: `nation-${index}`,
    name,
    x: random(10, 90),
    y: random(12, 88),
    color: colors[index],
    mood: index % 3 === 0 ? 'war' : index % 3 === 1 ? 'alliance' : 'peace',
    army: random(25, 90),
    economy: random(25, 100),
    influence: random(20, 80),
    morale: random(45, 100)
  }));
}

function App() {
  const [nations, setNations] = useState<Nation[]>(createWorld);
  const [selectedId, setSelectedId] = useState('');
  const [turn, setTurn] = useState(1);
  const [running, setRunning] = useState(true);
  const [log, setLog] = useState<string[]>(['The world awakens.']);

  const selected = useMemo(
    () => nations.find((nation) => nation.id === selectedId) ?? nations[0],
    [nations, selectedId]
  );

  const addLog = (message: string) => {
    setLog((current) => [message, ...current].slice(0, 10));
  };

  useEffect(() => {
    if (!selectedId && nations[0]) setSelectedId(nations[0].id);
  }, [nations, selectedId]);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setNations((current) => {
        const next = current.map((nation) => ({
          ...nation,
          army: clamp(nation.army + (nation.mood === 'war' ? 2 : 1), 1, 180),
          economy: clamp(nation.economy + random(-2, 3), 5, 150),
          influence: clamp(nation.influence + random(-1, 2), 5, 150),
          morale: clamp(nation.morale + random(-2, 2), 10, 100),
          x: clamp(nation.x + random(-1.2, 1.2), 6, 94),
          y: clamp(nation.y + random(-1.2, 1.2), 6, 94)
        }));

        for (const attacker of next) {
          const targets = next.filter(
            (target) => target.id !== attacker.id && distance(attacker, target) < 24
          );
          const target = [...targets].sort((a, b) => a.army - b.army)[0];

          if (target && attacker.mood === 'war' && attacker.army > target.army && Math.random() < 0.18) {
            target.army = clamp(target.army - random(5, 14), 1, 180);
            target.morale = clamp(target.morale - random(3, 10), 10, 100);
            attacker.army = clamp(attacker.army - random(2, 8), 1, 180);
            attacker.influence = clamp(attacker.influence + 4, 5, 150);
            addLog(`${attacker.name} attacks ${target.name}.`);
          }
        }

        return next;
      });
      setTurn((value) => value + 1);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [running]);

  const setMood = (mood: Mood) => {
    if (!selected) return;
    setNations((current) => current.map((nation) =>
      nation.id === selected.id ? { ...nation, mood } : nation
    ));
    addLog(`${selected.name} chooses ${mood}.`);
  };

  const invest = () => {
    if (!selected) return;
    setNations((current) => current.map((nation) =>
      nation.id === selected.id
        ? { ...nation, economy: nation.economy + 10, army: nation.army + 5, influence: nation.influence + 3 }
        : nation
    ));
    addLog(`${selected.name} invests in its future.`);
  };

  const attack = () => {
    if (!selected) return;
    const target = nations
      .filter((nation) => nation.id !== selected.id && distance(nation, selected) < 28)
      .sort((a, b) => a.army - b.army)[0];

    if (!target) {
      addLog(`${selected.name} has no nearby target.`);
      return;
    }

    setNations((current) => current.map((nation) => {
      if (nation.id === selected.id) return { ...nation, army: clamp(nation.army - 6, 1, 180), mood: 'war' };
      if (nation.id === target.id) return { ...nation, army: clamp(nation.army - 12, 1, 180), morale: clamp(nation.morale - 8, 10, 100) };
      return nation;
    }));
    addLog(`${selected.name} attacks ${target.name}.`);
  };

  const totalArmy = nations.reduce((sum, nation) => sum + nation.army, 0);
  const strongest = [...nations].sort((a, b) => b.army - a.army)[0];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Global simulation</p>
          <h1>Worlds in Conflict</h1>
        </div>
        <div className="toolbar">
          <button onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : 'Resume'}</button>
          <button className="accent" onClick={() => { setNations(createWorld()); setTurn(1); setLog(['A new world has been created.']); }}>New world</button>
        </div>
      </header>

      <main className="layout">
        <section className="world-panel">
          <div className="stats-grid">
            <div className="stat"><span>Turn</span><strong>{turn}</strong></div>
            <div className="stat"><span>Total army</span><strong>{Math.round(totalArmy)}</strong></div>
            <div className="stat"><span>Strongest</span><strong>{strongest?.name ?? '—'}</strong></div>
            <div className="stat"><span>Status</span><strong>{running ? 'Live' : 'Paused'}</strong></div>
          </div>

          <div className="map">
            <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
              {nations.flatMap((nation) => nations.filter((other) => other.id !== nation.id && distance(nation, other) < 24).map((other) => (
                <line key={`${nation.id}-${other.id}`} x1={nation.x} y1={nation.y} x2={other.x} y2={other.y} stroke="rgba(255,255,255,.16)" strokeWidth=".7" />
              )))}
            </svg>
            {nations.map((nation) => (
              <button key={nation.id} className={`nation ${selected?.id === nation.id ? 'selected' : ''}`} style={{ left: `${nation.x}%`, top: `${nation.y}%`, background: nation.color }} onClick={() => setSelectedId(nation.id)}>
                <span>{nation.name}</span><small>{Math.round(nation.army)}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <div className="card">
            <h2>{selected?.name ?? 'Select a nation'}</h2>
            <div className="metrics">
              <div><span>Army</span><strong>{Math.round(selected?.army ?? 0)}</strong></div>
              <div><span>Economy</span><strong>{Math.round(selected?.economy ?? 0)}</strong></div>
              <div><span>Morale</span><strong>{Math.round(selected?.morale ?? 0)}</strong></div>
              <div><span>Influence</span><strong>{Math.round(selected?.influence ?? 0)}</strong></div>
              <div className="wide"><span>Mood</span><strong>{selected?.mood ?? 'peace'}</strong></div>
            </div>
            <div className="actions">
              <button onClick={() => setMood('war')}>Declare war</button>
              <button onClick={() => setMood('peace')}>Seek peace</button>
              <button onClick={() => setMood('alliance')}>Alliance</button>
              <button onClick={invest}>Invest</button>
              <button className="accent full" onClick={attack}>Launch attack</button>
            </div>
          </div>
          <div className="card"><h3>World log</h3><ul className="log">{log.map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}</ul></div>
        </aside>
      </main>
    </div>
  );
}

export default App;
