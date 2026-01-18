import React, { useMemo, useState, useEffect } from "react";

const STORAGE_KEY = "mount-doom-tracker-v2";

// Route milestones (approx totals along ~1,800 miles)
const DEFAULT_MILESTONES = [
  { id: "shire", name: "The Shire (Bag End)", miles: 0, event: "The journey begins.", reward: "Pick your playlist." },
  { id: "bree", name: "Bree", miles: 120, event: "You’ve left comfort behind.", reward: "Treat yourself to coffee." },
  { id: "rivendell", name: "Rivendell", miles: 570, event: "A place of rest.", reward: "Buy something new for walking." },
  { id: "moria", name: "Moria", miles: 1030, event: "A tough stretch.", reward: "Movie night: Fellowship." },
  { id: "lorien", name: "Lothlórien", miles: 1135, event: "Calm checkpoint.", reward: "Take a peaceful walk." },
  { id: "rauros", name: "Rauros", miles: 1540, event: "Hard part begins.", reward: "Write a note to future you." },
  { id: "blackgate", name: "Black Gate", miles: 1685, event: "Final stretch.", reward: "Favorite meal." },
  { id: "cirith", name: "Cirith Ungol", miles: 1740, event: "Rough climb.", reward: "Light day and rest." },
  { id: "doom", name: "Mount Doom", miles: 1800, event: "Quest complete.", reward: "Big celebration." }
];

// Default ramp plan: 4-week blocks, then cap at 5
const DEFAULT_RAMP_STAGES = [
  { weeks: 4, milesPerDay: 2.0 },
  { weeks: 4, milesPerDay: 2.5 },
  { weeks: 4, milesPerDay: 3.0 },
  { weeks: 4, milesPerDay: 3.5 },
  { weeks: 4, milesPerDay: 4.0 },
  { weeks: 4, milesPerDay: 4.5 }
];

function safeParse(str, fallback) {
  try { return JSON.parse(str) ?? fallback; } catch { return fallback; }
}

function formatMiles(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDate(iso) {
  return new Date(iso + "T00:00:00");
}

function daysDiffInclusive(startISO, endISO) {
  const a = toDate(startISO);
  const b = toDate(endISO);
  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return days + 1;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getStageForDayIndex(dayIndex, stages) {
  const daysPerStage = stages.map(s => s.weeks * 7);
  let remaining = dayIndex;
  for (let i = 0; i < stages.length; i++) {
    if (remaining < daysPerStage[i]) return { stageIndex: i, milesPerDay: stages[i].milesPerDay };
    remaining -= daysPerStage[i];
  }
  return { stageIndex: stages.length, milesPerDay: null };
}

function isActiveDay(dayIndex, daysPerWeek) {
  const dayOfWeek = dayIndex % 7;
  return dayOfWeek < daysPerWeek;
}

function plannedMilesThroughDate(planStartISO, targetISO, stages, capMiles, daysPerWeek) {
  if (!planStartISO || !targetISO) return 0;
  if (toDate(targetISO) < toDate(planStartISO)) return 0;

  const totalDays = daysDiffInclusive(planStartISO, targetISO);
  let sum = 0;

  for (let i = 0; i < totalDays; i++) {
    if (!isActiveDay(i, daysPerWeek)) continue;
    const stageInfo = getStageForDayIndex(i, stages);
    const mpd = stageInfo.milesPerDay ?? capMiles;
    sum += mpd;
  }

  return sum;
}

function todaysPlannedMiles(planStartISO, todayISOValue, stages, capMiles, daysPerWeek) {
  if (!planStartISO) return 0;
  if (toDate(todayISOValue) < toDate(planStartISO)) return 0;

  const dayIndex = daysDiffInclusive(planStartISO, todayISOValue) - 1;
  if (!isActiveDay(dayIndex, daysPerWeek)) return 0;

  const stageInfo = getStageForDayIndex(dayIndex, stages);
  return stageInfo.milesPerDay ?? capMiles;
}

export default function App() {
  const saved = useMemo(() => safeParse(localStorage.getItem(STORAGE_KEY), null), []);

  const [goalMiles, setGoalMiles] = useState(saved?.goalMiles ?? 1800);
  const [goalDate, setGoalDate] = useState(saved?.goalDate ?? "2027-10-12");
  const [logs, setLogs] = useState(saved?.logs ?? []);
  const [entryMiles, setEntryMiles] = useState("");
  const [entryDate, setEntryDate] = useState(todayISO());
  const [toast, setToast] = useState("");

  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);

  const [planEnabled, setPlanEnabled] = useState(saved?.planEnabled ?? true);
  const [planStartDate, setPlanStartDate] = useState(saved?.planStartDate ?? todayISO());
  const [capMiles, setCapMiles] = useState(saved?.capMiles ?? 5);
  const [daysPerWeek, setDaysPerWeek] = useState(saved?.daysPerWeek ?? 7);
  const [rampStages, setRampStages] = useState(saved?.rampStages ?? DEFAULT_RAMP_STAGES);

  const milestones = DEFAULT_MILESTONES;

  const totalMiles = useMemo(() => logs.reduce((s, r) => s + Number(r.miles || 0), 0), [logs]);

  const progressPct = useMemo(() => {
    const denom = Number(goalMiles) || 1;
    return clamp((totalMiles / denom) * 100, 0, 100);
  }, [totalMiles, goalMiles]);

  const nextMilestone = useMemo(() => milestones.find(m => totalMiles < m.miles) ?? null, [milestones, totalMiles]);
  const reachedMilestones = useMemo(() => milestones.filter(m => totalMiles >= m.miles), [milestones, totalMiles]);
  const lastReached = reachedMilestones.at(-1) ?? milestones[0];

  const milesRemaining = Math.max(0, (Number(goalMiles) || 0) - totalMiles);

  const today = todayISO();
  const daysLeftToGoal = Math.max(0, Math.ceil((toDate(goalDate) - toDate(today)) / (1000 * 60 * 60 * 24)));
  const neededPerDay = daysLeftToGoal > 0 ? milesRemaining / daysLeftToGoal : milesRemaining;

  const plannedToToday = useMemo(() => {
    if (!planEnabled) return 0;
    return plannedMilesThroughDate(planStartDate, today, rampStages, Number(capMiles) || 5, Number(daysPerWeek) || 7);
  }, [planEnabled, planStartDate, today, rampStages, capMiles, daysPerWeek]);

  const plannedToGoal = useMemo(() => {
    if (!planEnabled) return 0;
    return plannedMilesThroughDate(planStartDate, goalDate, rampStages, Number(capMiles) || 5, Number(daysPerWeek) || 7);
  }, [planEnabled, planStartDate, goalDate, rampStages, capMiles, daysPerWeek]);

  const todayTarget = useMemo(() => {
    if (!planEnabled) return 0;
    return todaysPlannedMiles(planStartDate, today, rampStages, Number(capMiles) || 5, Number(daysPerWeek) || 7);
  }, [planEnabled, planStartDate, today, rampStages, capMiles, daysPerWeek]);

  const aheadBehind = useMemo(() => {
    if (!planEnabled) return 0;
    return totalMiles - plannedToToday;
  }, [planEnabled, totalMiles, plannedToToday]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        goalMiles,
        goalDate,
        logs,
        planEnabled,
        planStartDate,
        capMiles,
        daysPerWeek,
        rampStages
      })
    );
  }, [goalMiles, goalDate, logs, planEnabled, planStartDate, capMiles, daysPerWeek, rampStages]);

  function addLog() {
    const m = Number(entryMiles);
    if (!Number.isFinite(m) || m <= 0) {
      setToast("Enter miles greater than 0");
      return;
    }

    const before = totalMiles;
    const after = before + m;
    const newly = milestones.filter(x => before < x.miles && after >= x.miles);

    const newLog = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: entryDate,
      miles: m
    };

    setLogs(prev => [...prev, newLog].sort((a, b) => b.date.localeCompare(a.date)));
    setEntryMiles("");

    if (newly.length > 0) {
      const last = newly.at(-1);
      setToast(`Unlocked: ${last.name}. ${last.event} Reward: ${last.reward}`);
    } else if (nextMilestone) {
      setToast(`Logged! ${formatMiles(Math.max(0, nextMilestone.miles - after))} miles to next milestone.`);
    } else {
      setToast("Logged! Quest complete.");
    }
  }

  function removeLog(id) {
    setLogs(prev => prev.filter(x => x.id !== id));
    setToast("Entry removed.");
  }

  function resetAll() {
    if (!confirm("Reset everything?")) return;
    setGoalMiles(1800);
    setGoalDate("2027-10-12");
    setLogs([]);
    setPlanEnabled(true);
    setPlanStartDate(todayISO());
    setCapMiles(5);
    setDaysPerWeek(7);
    setRampStages(DEFAULT_RAMP_STAGES);
    setToast("Reset complete.");
  }

  function updateStage(index, field, value) {
    setRampStages(prev => {
      const copy = prev.map(x => ({ ...x }));
      const v = Number(value);
      if (field === "weeks") copy[index].weeks = clamp(Math.round(v || 1), 1, 52);
      if (field === "milesPerDay") copy[index].milesPerDay = clamp(v || 0, 0.5, Number(capMiles) || 5);
      return copy;
    });
  }

  const selectedMilestone = selectedMilestoneId ? milestones.find(m => m.id === selectedMilestoneId) : null;

  return (
    <div className="container">
      <div className="grid cols2">
        <div className="card">
          <h1 className="h1">Journey to Mount Doom</h1>
          <p className="sub">Track your miles across Middle-earth.</p>

          <div className="hr" />

          <div className="row">
            <div>
              <label>Goal miles</label><br />
              <input type="number" min="1" step="1" value={goalMiles} onChange={e => setGoalMiles(Number(e.target.value))} />
            </div>
            <div>
              <label>Goal date</label><br />
              <input type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} />
            </div>
            <button className="danger" onClick={resetAll}>Reset</button>
          </div>

          <div className="hr" />

          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="badge">Total: {formatMiles(totalMiles)} mi</div>
            <div className="badge">Remaining: {formatMiles(milesRemaining)} mi</div>
            <div className="badge">Needed/day: {formatMiles(neededPerDay)} mi</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="progressWrap">
              <div className="progressBar" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              Current: <strong>{lastReached.name}</strong>
              {nextMilestone ? (
                <> · Next: <strong>{nextMilestone.name}</strong> in {formatMiles(nextMilestone.miles - totalMiles)} mi</>
              ) : (
                <> · Quest complete!</>
              )}
            </div>
          </div>

          {toast && <div className="toast">{toast}</div>}

          <div className="hr" />

          <h2 className="h1" style={{ fontSize: 18 }}>Ramp-up plan</h2>
          <div className="row">
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={planEnabled} onChange={e => setPlanEnabled(e.target.checked)} />
              Enable ramp plan
            </label>
          </div>

          {planEnabled && (
            <>
              <div className="row" style={{ marginTop: 8 }}>
                <div>
                  <label>Plan start date</label><br />
                  <input type="date" value={planStartDate} onChange={e => setPlanStartDate(e.target.value)} />
                </div>
                <div>
                  <label>Days per week</label><br />
                  <input type="number" min="1" max="7" step="1" value={daysPerWeek} onChange={e => setDaysPerWeek(clamp(Number(e.target.value), 1, 7))} />
                </div>
                <div>
                  <label>Cap miles/day</label><br />
                  <input type="number" min="1" max="20" step="0.5" value={capMiles} onChange={e => setCapMiles(clamp(Number(e.target.value), 1, 20))} />
                </div>
              </div>

              <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
                <div className="badge">Today target: {formatMiles(todayTarget)} mi</div>
                <div className="badge">Planned by today: {formatMiles(plannedToToday)} mi</div>
                <div className="badge">
                  {aheadBehind >= 0 ? "Ahead: " : "Behind: "}
                  {formatMiles(Math.abs(aheadBehind))} mi
                </div>
              </div>

              <div className="small" style={{ marginTop: 8 }}>
                Plan total by goal date: <strong>{formatMiles(plannedToGoal)}</strong> mi · {plannedToGoal >= goalMiles ? "Enough to reach your goal." : "Not enough yet (increase days/week or cap)."}
              </div>

              <div className="hr" />

              <div className="small">Ramp stages (edit if you want)</div>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {rampStages.map((s, i) => (
                  <div key={i} className="milestone">
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <strong>Stage {i + 1}</strong>
                      <span className="small">then caps at {formatMiles(capMiles)} mi/day</span>
                    </div>
                    <div className="row" style={{ marginTop: 6 }}>
                      <div>
                        <label>Weeks</label><br />
                        <input type="number" min="1" max="52" step="1" value={s.weeks} onChange={e => updateStage(i, "weeks", e.target.value)} />
                      </div>
                      <div>
                        <label>Miles/day</label><br />
                        <input type="number" min="0.5" max={capMiles} step="0.5" value={s.milesPerDay} onChange={e => updateStage(i, "milesPerDay", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="hr" />

          <h2 className="h1" style={{ fontSize: 18 }}>Log miles</h2>
          <div className="row">
            <div>
              <label>Date</label><br />
              <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div>
              <label>Miles</label><br />
              <input type="number" min="0" step="0.1" value={entryMiles} onChange={e => setEntryMiles(e.target.value)} />
            </div>
            <button className="primary" onClick={addLog}>Add</button>
          </div>

          <div className="hr" />

          <h2 className="h1" style={{ fontSize: 18 }}>Recent entries</h2>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {logs.length === 0 ? (
              <div className="small">No entries yet.</div>
            ) : (
              logs.slice(0, 12).map(item => (
                <div key={item.id} className="milestone">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div><strong>{item.date}</strong> · {formatMiles(item.miles)} mi</div>
                    <button className="danger" onClick={() => removeLog(item.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="h1" style={{ fontSize: 18 }}>Milestones</h2>
          <div className="hr" />

          <div className="mapWrap">
            <div className="mapHeader">
              <div>
                <div className="badge">Journey Map</div>
                <div className="small">Click a marker to see details</div>
              </div>
              <div className="badge">You: {formatMiles(totalMiles)} mi</div>
            </div>

            <div className="mapTrack">
              <div className="mapLine" />
            </div>

            <MapOverlay
              milestones={milestones}
              totalMiles={totalMiles}
              goalMiles={goalMiles}
              onSelect={setSelectedMilestoneId}
              selectedId={selectedMilestoneId}
            />

            {selectedMilestone && (
              <div className="mapPopup">
                <strong>{selectedMilestone.name}</strong>
                <div className="small">{selectedMilestone.event}</div>
                <div className="small">Reward: {selectedMilestone.reward}</div>
                <button onClick={() => setSelectedMilestoneId(null)}>Close</button>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {milestones.map(m => {
              const unlocked = totalMiles >= m.miles;
              return (
                <div key={m.id} className={`milestone ${unlocked ? "" : "locked"}`}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                      <strong>{m.name}</strong>
                      <div className="small">{formatMiles(m.miles)} mi</div>
                    </div>
                    <div className="badge">
                      {unlocked ? "Unlocked" : `${formatMiles(m.miles - totalMiles)} mi away`}
                    </div>
                  </div>
                  <div className="small">{m.event}</div>
                  <div className="small">Reward: {m.reward}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function pctAlongRoute(miles, goalMiles) {
  const denom = Number(goalMiles) || 1;
  return Math.max(0, Math.min((Number(miles) || 0) / denom, 1));
}

function MapOverlay({ milestones, totalMiles, goalMiles, onSelect, selectedId }) {
  const youPct = pctAlongRoute(totalMiles, goalMiles);
  const inset = 16;

  const leftForPct = (pct) =>
    `calc(${inset}px + ${pct * 100}% * (100% - ${inset * 2}px) / 100)`;

  return (
    <div style={{ position: "relative", marginTop: "-84px", height: 84 }}>
      <div
        className="youAreHere"
        style={{ left: leftForPct(youPct) }}
        title="You are here"
        onClick={() => onSelect(null)}
      />

      {milestones.map((m) => {
        const mPct = pctAlongRoute(m.miles, goalMiles);
        const unlocked = totalMiles >= m.miles;
        const isSel = selectedId === m.id;

        return (
          <React.Fragment key={m.id}>
            <div
              className={`mapDot ${unlocked ? "unlocked" : ""}`}
              style={{
                left: leftForPct(mPct),
                outline: isSel ? "2px solid rgba(59,130,246,0.55)" : "none",
              }}
              title={`${m.name} (${m.miles} mi)`}
              onClick={() => onSelect(m.id)}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
