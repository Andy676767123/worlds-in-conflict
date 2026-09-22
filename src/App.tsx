import { useEffect, useMemo, useState } from 'react';

type Mood = 'peace' | 'war' | 'alliance';
type Nation = {
  id: string;
  name: string;
  color: string;
  mood: Mood;
  army: number;
  morale: number;
  gold: number;
  food: number;
  economy: number;
  influence: number;
  labelX: number;
  labelY: number;
};
type Attack = { id: number; from: string; to: string };
type Event = { id: number; text: string; kind: 'battle' | 'economy' | 'frontier'; turn: number };
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
  ['Helios', '42,26 57,27 67,38 59,48 45,45 35,34', 51, 37],
];

const sandColors = ['#c9a86a', '#b9945b', '#d1b477', '#bfa064', '#d7bd83', '#aa8853', '#c4a36b', '#d0b274', '#b18f5b', '#cbb17a'];
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const random = (min: number, max: number) => Math.random() * (max - min) + min;
const distance = (a: Nation, b: Nation) => Math.hypot(a.labelX - b.labelX, a.labelY - b.labelY);

function makeOwners(): Record<string, string> {
  return Object.fromEntries(territories.map(([name], index) => [name, `nation-${index}`]));
}

function createWorld(): Nation[] {
  return territories.map(([name, , labelX, labelY], index) => ({
    id: `nation-${index}`,
    name,
    color: sandColors[index],
    mood: index % 3 === 0 ? 'war' : index % 3 === 1 ? 'alliance' : 'peace',
    army: random(35, 95),
    morale: random(50, 95),
    gold: random(45, 120),
    food: random(45, 110),
    economy: random(35, 95),
    influence: random(25, 80),
    labelX,
    labelY,
  }));
}

function App() {
  const [nations, setNations] = useState<Nation[]>(createWorld);
  const [owners, setOwners] = useState<Record<string, string>>(makeOwners);
  const [selectedId, setSelectedId] = useState('nation-0');
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [turn, setTurn] = useState(1);
  const [running, setRunning] = useState(true);
  const [events, setEvents] = useState<Event[]>([
    { id: 1, kind: 'frontier', text: 'The frontier is alive. Armies move across the desert.', turn: 1 },
  ]);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const selected = useMemo(
    () => nations.find((nation) => nation.id === selectedId) ?? nations[0],
    [nations, selectedId]
  );

  const addEvent = (kind: Event['kind'], text: string) => {
    setEvents((current) => [{ id: Date.now() + Math.random(), kind, text, turn }, ...current].slice(0, 12));
  };

  const findNation = (id: string) => nations.find((nation) => nation.id === id);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setNations((current) => {
        const next = current.map((nation) => ({
          ...nation,
          gold: clamp(nation.gold + nation.economy * 0.08 - nation.army * 0.03, 0, 200),
          food: clamp(nation.food + nation.economy * 0.04 - 1, 0, 180),
          army: clamp(nation.army + (nation.mood === 'war' ? 1.8 : 0.7), 1, 180),
          morale: clamp(nation.morale + (nation.food > 45 ? 0.8 : -2.5), 10, 100),
        }));

        const warNation = next
          .filter((nation) => nation.mood === 'war')
          .find((nation) =>
            next.some(
              (other) =>
                other.id !== nation.id &&
                other.army < nation.army * 0.88 &&
                distance(nation, other) < 38 &&
                Math.random() < 0.35
            )
          );

        if (warNation) {
          const target = next
            .filter(
              (other) =>
                other.id !== warNation.id &&
                other.army < warNation.army * 0.88 &&
                distance(warNation, other) < 38
            )
            .sort((a, b) => a.army - b.army)[0];

          if (target) {
            warNation.army = clamp(warNation.army - random(4, 11), 1, 180);
            target.army = clamp(target.army - random(8, 18), 1, 180);
            target.morale = clamp(target.morale - 10, 10, 100);

            setAttacks((currentAttacks) => [
              ...currentAttacks.slice(-5),
              { id: Date.now() + Math.random(), from: warNation.id, to: target.id },
            ]);

            if (warNation.army > target.army * 1.15 && Math.random() < 0.7) {
              setOwners((currentOwners) => ({ ...currentOwners, [target.name]: warNation.id }));
              addEvent('battle', `${warNation.name} forces its way into ${target.name} and claims new land.`);
            } else {
              addEvent('battle', `${warNation.name} clashes with ${target.name} on the frontier.`);
            }
          }
        }

        return next;
      });

      setTurn((value) => value + 1);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [running]);

  const declareWar = (target: Nation) => {
    if (!selected || selected.id === target.id) return;
    setNations((current) =>
      current.map((nation) => (nation.id === selected.id ? { ...nation, mood: 'war' } : nation))
    );
    setAttacks((current) => [
      ...current.slice(-5),
      { id: Date.now() + Math.random(), from: selected.id, to: target.id },
    ]);
    addEvent('battle', `${selected.name} declares war on ${target.name}.`);
  };

  const launchAttack = (target: Nation) => {
    if (!selected) return;
    declareWar(target);

    setNations((current) =>
      current.map((nation) => {
        if (nation.id === selected.id) {
          return { ...nation, army: clamp(nation.army - 8, 1, 180), mood: 'war' };
        }
        if (nation.id === target.id) {
          return { ...nation, army: clamp(nation.army - 14, 1, 180), morale: clamp(nation.morale - 12, 10, 100) };
        }
        return nation;
      })
    );

    if (selected.army > target.army * 1.2) {
      setOwners((currentOwners) => ({ ...currentOwners, [target.name]: selected.id }));
      addEvent('battle', `${selected.name} captures ${target.name}'s territory.`);
    } else {
      addEvent('battle', `${selected.name} attacks ${target.name}, but the line holds.`);
    }
  };

  const invest = () => {
    if (!selected || selected.gold < 15) {
      addEvent('economy', `${selected?.name ?? 'The nation'} cannot afford a new investment.`);
      return;
    }

    setNations((current) =>
      current.map((nation) =>
        nation.id === selected.id
          ? { ...nation, gold: nation.gold - 15, economy: nation.economy + 10, food: nation.food + 5 }
          : nation
      )
    );
    addEvent('economy', `${selected.name} strengthens its farms and workshops.`);
  };

  const reset = () => {
    setNations(createWorld());
    setOwners(makeOwners());
    setSelectedId('nation-0');
    setAttacks([]);
    setTurn(1);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setEvents([{ id: Date.now(), kind: 'frontier', text: 'A new campaign begins.', turn: 1 }]);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const startOffset = offset;

    const move = (moveEvent: PointerEvent) => {
      setOffset({
        x: startOffset.x + (moveEvent.clientX - startX),
        y: startOffset.y + (moveEvent.clientY - startY),
      });
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const ownedCount = selected ? Object.values(owners).filter((id) => id === selected.id).length : 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Grand campaign · turn {turn}</p>
          <h1>Worlds in Conflict</h1>
        </div>
        <div className="toolbar">
          <button onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : 'Resume'}</button>
          <button className="accent" onClick={reset}>New campaign</button>
        </div>
      </header>

      <main className="layout">
        <section className="world-panel">
          <div className="stats-grid">
            <div className="stat">
              <span>Command</span>
              <strong>{selected?.name}</strong>
            </div>
            <div className="stat">
              <span>Army</span>
              <strong>{Math.round(selected?.army ?? 0)}</strong>
            </div>
            <div className="stat">
              <span>Land held</span>
              <strong>{ownedCount}</strong>
            </div>
            <div className="stat">
              <span>Map</span>
              <strong>{Math.round(zoom * 100)}%</strong>
            </div>
          </div>

          <div
            className="map"
            onWheel={(event) => {
              event.preventDefault();
              const delta = event.deltaY < 0 ? 0.12 : -0.12;
              setZoom((current) => clamp(current + delta, 0.75, 2.4));
            }}
          >
            <div className="map-controls">
              <button onClick={() => setZoom((value) => clamp(value + 0.15, 0.75, 2.4))}>+</button>
              <button onClick={() => setZoom((value) => clamp(value - 0.15, 0.75, 2.4))}>-</button>
              <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>Reset</button>
            </div>

            <div className="compass">N</div>

            <svg
              className="territory-map"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              onPointerDown={handlePointerDown}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
            >
              <defs>
                <marker id="attack-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L5,2.5 L0,5 z" fill="#8b2f1e" />
                </marker>
              </defs>

              {territories.map(([name, points]) => {
                const ownerId = owners[name];
                const owner = findNation(ownerId ?? '');
                const isSelected = owner && owner.id === selected?.id;

                return (
                  <polygon
                    key={name}
                    points={points}
                    fill={owner?.color ?? '#c9a86a'}
                    className={isSelected ? 'territory selected-territory' : 'territory'}
                    onClick={() => owner && setSelectedId(owner.id)}
                  />
                );
              })}

              {attacks.map((attack) => {
                const from = findNation(attack.from);
                const to = findNation(attack.to);

                if (!from || !to) return null;

                return (
                  <line
                    key={attack.id}
                    className="attack-line"
                    x1={from.labelX}
                    y1={from.labelY}
                    x2={to.labelX}
                    y2={to.labelY}
                    markerEnd="url(#attack-arrow)"
                  />
                );
              })}

              {nations.map((nation) => (
                <g key={nation.id} className="territory-label" onClick={() => setSelectedId(nation.id)}>
                  <text x={nation.labelX} y={nation.labelY - 1} textAnchor="middle" className="nation-name">
                    {nation.name}
                  </text>
                  <text x={nation.labelX} y={nation.labelY + 3} textAnchor="middle" className="army-label">
                    ⚔ {Math.round(nation.army)}
                  </text>
                </g>
              ))}
            </svg>

            <div className="map-legend">
              <span className="red-dot" /> Red arrows show active attacks and targets
            </div>
          </div>
        </section>

        <aside className="sidebar">
          <div className="card command-card">
            <p className="panel-kicker">Selected nation</p>
            <h2>{selected?.name}</h2>

            <div className="metrics">
              <div>
                <span>Army</span>
                <strong>{Math.round(selected?.army ?? 0)}</strong>
              </div>
              <div>
                <span>Morale</span>
                <strong>{Math.round(selected?.morale ?? 0)}</strong>
              </div>
              <div>
                <span>Gold</span>
                <strong>{Math.round(selected?.gold ?? 0)}</strong>
              </div>
              <div>
                <span>Food</span>
                <strong>{Math.round(selected?.food ?? 0)}</strong>
              </div>
              <div>
                <span>Land held</span>
                <strong>{ownedCount}</strong>
              </div>
              <div>
                <span>Policy</span>
                <strong>{selected?.mood}</strong>
              </div>
            </div>

            <div className="actions">
              <button onClick={() => setNations((current) => current.map((nation) => nation.id === selected?.id ? { ...nation, mood: 'war' } : nation))}>Mobilize</button>
              <button onClick={() => setNations((current) => current.map((nation) => nation.id === selected?.id ? { ...nation, mood: 'peace' } : nation))}>Seek peace</button>
              <button onClick={invest}>Invest · 15 gold</button>
            </div>
          </div>

          <div className="card">
            <p className="panel-kicker">Frontier command</p>
            {nations
              .filter((nation) => nation.id !== selected?.id)
              .slice(0, 5)
              .map((nation) => (
                <div className="frontier-row" key={nation.id}>
                  <div>
                    <b>{nation.name}</b>
                    <small>{Math.round(nation.army)} army · target territory</small>
                  </div>
                  <div className="row-actions">
                    <button onClick={() => declareWar(nation)}>War</button>
                    <button className="accent" onClick={() => launchAttack(nation)}>Attack</button>
                  </div>
                </div>
              ))}
          </div>

          <div className="card">
            <p className="panel-kicker">Frontier events</p>
            <ul className="log">
              {events.map((event) => (
                <li key={event.id}>
                  <small className={`event-${event.kind}`}>{event.kind}</small>
                  {event.text}
                  <em>Turn {event.turn}</em>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
