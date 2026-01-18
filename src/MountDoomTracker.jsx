import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "mount-doom-tracker-v9";

const MILESTONES = [
  { id: "shire", name: "The Shire (Bag End)", miles: 0, event: "The journey begins.", reward: "Pick your playlist." },
  { id: "bree", name: "Bree", miles: 120, event: "You’ve left comfort behind.", reward: "Treat yourself to coffee." },
  { id: "rivendell", name: "Rivendell", miles: 570, event: "A place of rest.", reward: "Buy something new for walking." },
  { id: "moria", name: "Moria", miles: 1030, event: "A tough stretch.", reward: "Movie night: Fellowship." },
  { id: "lothlorien", name: "Lothlórien", miles: 1120, event: "A calm after darkness.", reward: "Stretch + rest day." },
  { id: "gondor", name: "Gondor", miles: 1400, event: "The final push begins.", reward: "New audiobook." },
  { id: "mountdoom", name: "Mount Doom", miles: 1800, event: "The Ring is destroyed.", reward: "Celebrate big." }
];

function getUnlockedMilestone(miles) {
  return [...MILESTONES].reverse().find(m => miles >= m.miles) || MILESTONES[0];
}

function getNextMilestone(miles) {
  return MILESTONES.find(m => m.miles > miles) || null;
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MountDoomTracker() {
  const [entries, setEntries] = useState([]);
  const [inputMiles, setInputMiles] = useState("");

  const [isEditingLast, setIsEditingLast] = useState(false);
  const [editMiles, setEditMiles] = useState("");

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.entries)) setEntries(parsed.entries);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries }));
  }, [entries]);

  const totalMiles = useMemo(
    () => entries.reduce((sum, e) => sum + e.miles, 0),
    [entries]
  );

  const currentMilestone = useMemo(() => getUnlockedMilestone(totalMiles), [totalMiles]);
  const nextMilestone = useMemo(() => getNextMilestone(totalMiles), [totalMiles]);
  const milesToNext = nextMilestone ? Math.max(0, nextMilestone.miles - totalMiles) : 0;

  const progressToNext = useMemo(() => {
    if (!nextMilestone) return 100;
    const start = currentMilestone.miles;
    const end = nextMilestone.miles;
    const span = Math.max(1, end - start);
    const into = Math.min(span, Math.max(0, totalMiles - start));
    return (into / span) * 100;
  }, [totalMiles, currentMilestone, nextMilestone]);

  const lastEntry = entries[entries.length - 1];

  const showRewardToast = (milestone) => {
    if (!milestone) return;
    setToast(`Reward unlocked at ${milestone.name}: ${milestone.reward}`);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  };

  const addMiles = () => {
    const value = parseFloat(inputMiles);
    if (isNaN(value) || value <= 0) return;

    const prevTotal = totalMiles;
    const nextTotal = prevTotal + value;

    const prevUnlocked = getUnlockedMilestone(prevTotal);
    const nextUnlocked = getUnlockedMilestone(nextTotal);

    setEntries(prev => [
      ...prev,
      { id: crypto.randomUUID(), miles: value, date: new Date().toISOString(), edited: false }
    ]);

    setInputMiles("");
    setIsEditingLast(false);

    if (nextUnlocked.id !== prevUnlocked.id) showRewardToast(nextUnlocked);
  };

  const deleteLast = () => {
    if (!lastEntry) return;
    setEntries(prev => prev.slice(0, -1));
    setIsEditingLast(false);
    setEditMiles("");
    setToast(null);
  };

  const startEditLast = () => {
    if (!lastEntry) return;
    setEditMiles(String(lastEntry.miles));
    setIsEditingLast(true);
  };

  const saveEditLast = () => {
    const value = parseFloat(editMiles);
    if (isNaN(value) || value <= 0 || !lastEntry) return;

    const prevTotal = totalMiles;
    const nextTotal = prevTotal - lastEntry.miles + value;

    const prevUnlocked = getUnlockedMilestone(prevTotal);
    const nextUnlocked = getUnlockedMilestone(nextTotal);

    setEntries(prev => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], miles: value, edited: true };
      return next;
    });

    setIsEditingLast(false);
    setEditMiles("");

    if (nextTotal > prevTotal && nextUnlocked.id !== prevUnlocked.id) {
      showRewardToast(nextUnlocked);
    }
  };

  const cancelEditLast = () => {
    setIsEditingLast(false);
    setEditMiles("");
  };

  // LOTR-ish palette (earth + parchment + gold)
const C = {
  bg: "#2f6f73",            // blue-green background

  // DARKER CARDS (aged parchment / stone)
  card: "#ca7826",          // darker parchment
  border: "#bdb7a6",

  ink: "#2b2418",
  muted: "rgba(43,36,24,.72)",

  accent: "#1f5b4d",        // elven green
  accent2: "#7a5a2a",
  gold: "#b08d2a",
  danger: "#7a2d2d",

  shadow: "0 18px 40px rgba(0,0,0,0.35)",

  // INNER DATA BOXES — dark blue / river / night sky
  dataBg: "rgba(61, 131, 223, 0.85)",
  dataBorder: "rgba(120, 160, 210, 0.35)"
};




  const page = { maxWidth: "100%", margin: "0 auto", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: 18, color: C.ink };
  const header = { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 };
  const title = { margin: 0, letterSpacing: 0.2 };
  const grid = { display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16, alignItems: "start" };
  const card = { border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, background: C.card, boxShadow: C.shadow };
  const label = { fontSize: 12, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase" };
  const big = { fontSize: 30, fontWeight: 800, margin: "6px 0 2px" };
  const small = { fontSize: 14, color: C.muted, marginTop: 6 };
  const row = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 };
  const barWrap = { background: "#efe8d9", borderRadius: 999, overflow: "hidden", height: 12, marginTop: 10, border: `1px solid ${C.border}` };
  const barFill = { width: `${Math.min(100, Math.max(0, progressToNext))}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.gold})`, height: "100%" };

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: "#ffffff",
    color: C.ink,
    outline: "none"
  };

  const btnBase = {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    cursor: "pointer",
    fontWeight: 600
  };

  const btnPrimary = { ...btnBase, background: `linear-gradient(180deg, ${C.accent}, #18463b)`, color: "#fff", border: "1px solid rgba(0,0,0,0.08)" };
  const btnGhost = { ...btnBase, background: "transparent", color: C.ink };
  const btnDanger = { ...btnBase, background: "transparent", color: C.danger, border: `1px solid rgba(122,45,45,0.35)` };

  const toastStyle = {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(176,141,42,0.14)",
    border: "1px solid rgba(176,141,42,0.35)",
    color: C.ink
  };

  const list = { margin: 0, paddingLeft: 0, listStyle: "none" };
  const milestoneRow = (isCurrent) => ({
    padding: "10px 10px",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: isCurrent ? "rgba(31,91,77,0.10)" : "rgba(255,255,255,0.65)",
    boxShadow: isCurrent ? "0 6px 18px rgba(31,91,77,0.10)" : "none",
    marginBottom: 10
  });

  const pill = (bg, fg) => ({
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 12,
    background: bg,
    color: fg,
    border: `1px solid ${C.border}`
  });

  return (
    <div style={{ background: "hotpink", minHeight: "100vh" }}>

      <div style={page}>
        <div style={header}>
          <h2 style={title}>Dixon’s Journey to Mount Doom</h2>
          <div style={{ fontSize: 14, color: C.muted }}>
            Total: <span style={{ color: C.ink, fontWeight: 800 }}>{totalMiles.toFixed(1)}</span> miles
          </div>
        </div>

        {toast && <div style={toastStyle}>✨ {toast}</div>}

        <div style={grid}>
          {/* LEFT */}
          <div style={card}>
            <div style={label}>Current stage</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{currentMilestone.name}</div>
            <div style={small}>{currentMilestone.event}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div>
                <div style={label}>Miles to next</div>
                <div style={big}>{nextMilestone ? milesToNext.toFixed(1) : "0.0"}</div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  {nextMilestone ? <>Next: <strong style={{ color: C.ink }}>{nextMilestone.name}</strong></> : <>You made it 🎉</>}
                </div>
              </div>
              <div>
                <div style={label}>Reward (current stage)</div>
                <div style={{ fontSize: 15, marginTop: 10, color: C.accent2 }}>
                  <em>{currentMilestone.reward}</em>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={label}>Progress to next milestone</div>
              <div style={barWrap}>
                <div style={barFill} />
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
                {nextMilestone ? `${progressToNext.toFixed(0)}% of this leg` : "100%"}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={label}>Add entry</div>
              <div style={row}>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="Miles walked"
                  value={inputMiles}
                  onChange={e => setInputMiles(e.target.value)}
                />
                <button style={btnPrimary} onClick={addMiles}>Add</button>
              </div>

              <div style={row}>
                <button style={btnDanger} onClick={deleteLast} disabled={!lastEntry}>Delete last</button>
                <button style={btnGhost} onClick={startEditLast} disabled={!lastEntry || isEditingLast}>Edit last</button>

                {lastEntry && !isEditingLast && (
                  <span style={{ fontSize: 13, color: C.muted }}>
                    Last: <strong style={{ color: C.ink }}>{lastEntry.miles}</strong> mi • {fmtDateTime(lastEntry.date)}
                    {lastEntry.edited ? " (edited)" : ""}
                  </span>
                )}
              </div>

              {isEditingLast && (
                <div style={row}>
                  <input
                    style={inputStyle}
                    type="number"
                    value={editMiles}
                    onChange={e => setEditMiles(e.target.value)}
                    placeholder="New miles for last entry"
                  />
                  <button style={btnPrimary} onClick={saveEditLast}>Save</button>
                  <button style={btnGhost} onClick={cancelEditLast}>Cancel</button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Milestones</div>
              <div style={{ fontSize: 12, color: C.muted }}>Miles left</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <ul style={list}>
                {MILESTONES.map(m => {
                  const left = Math.max(0, m.miles - totalMiles);
                  const unlocked = left === 0;
                  const isCurrent = currentMilestone.id === m.id;

                  return (
                    <li key={m.id} style={milestoneRow(isCurrent)}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: isCurrent ? 900 : 600 }}>
                          {unlocked ? "✅" : "🔒"} {m.name}
                        </div>
                        <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, color: unlocked ? C.muted : C.ink }}>
                          {left.toFixed(1)} mi
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6, alignItems: "center" }}>
                        <div style={{ fontSize: 12, color: C.muted }}>
                          Reward: <span style={{ color: C.accent2 }}>{m.reward}</span>
                        </div>
                        {isCurrent && <span style={pill("rgba(31,91,77,0.14)", C.accent)}>Current</span>}
                        {!isCurrent && unlocked && <span style={pill("rgba(176,141,42,0.14)", C.gold)}>Unlocked</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* LOG */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 900 }}>Entry Log</div>
            <div style={{ fontSize: 12, color: C.muted }}>{entries.length} entries</div>
          </div>

          {entries.length === 0 ? (
            <p style={{ fontSize: 14, color: C.muted, marginTop: 10 }}>
              No entries yet. Add your first walk above.
            </p>
          ) : (
            <ul style={{ ...list, marginTop: 12 }}>
              {[...entries].reverse().map(e => (
                <li
                  key={e.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    background: "rgba(255,255,255,0.65)",
                    marginBottom: 10
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {e.miles} <span style={{ fontWeight: 600, color: C.muted }}>mi</span>
                    {e.edited ? <span style={{ marginLeft: 8, ...pill("rgba(122,45,45,0.10)", C.danger) }}>edited</span> : null}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted }}>{fmtDateTime(e.date)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
