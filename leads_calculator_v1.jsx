import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, FolderOpen, X, TrendingUp, Sun, Moon } from "lucide-react";

const STORAGE_KEY = "lead-calc:scenarios";

const defaultStages = [
  { id: "s1", name: "Lead \u2192 MQL", rate: 50 },
  { id: "s2", name: "MQL \u2192 Opportunity", rate: 40 },
  { id: "s3", name: "Opportunity \u2192 Close", rate: 25 },
];

function fmtMoney(n) {
  if (!isFinite(n)) return "\u2014";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtInt(n) {
  if (!isFinite(n)) return "\u2014";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.ceil(n));
}

function fmtNum(n, decimals = 0) {
  if (!isFinite(n)) return "\u2014";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(days));
  return d;
}

function fmtDate(date) {
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default function LeadCalculator() {
  const [theme, setTheme] = useState("dark");
  const [goal, setGoal] = useState(50000);
  const [ytdSales, setYtdSales] = useState(0);
  const [avgTicket, setAvgTicket] = useState(2500);
  const [cycleDays, setCycleDays] = useState(45);
  const [stages, setStages] = useState(defaultStages);

  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [status, setStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // ---- calculations ----
  const remainingGoal = Math.max(0, goal - ytdSales);
  const globalConversion = stages.reduce((acc, s) => acc * (Math.max(0, Math.min(100, s.rate)) / 100), 1);
  const dealsNeeded = avgTicket > 0 ? remainingGoal / avgTicket : 0;
  const leadsPerMonth = globalConversion > 0 ? dealsNeeded / globalConversion : 0;
  const pipelineActivo = leadsPerMonth * (cycleDays / 30);
  const closeDate = addDays(new Date(), cycleDays);

  // ---- persistence ----
  const loadScenarios = useCallback(async () => {
    try {
      const res = await window.storage.get(STORAGE_KEY);
      if (res && res.value) setScenarios(JSON.parse(res.value));
    } catch {
      setScenarios([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  async function persist(next) {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next));
      setScenarios(next);
    } catch {
      setStatus({ type: "error", msg: "Couldn't save. Please try again." });
    }
  }

  function saveScenario() {
    const name = scenarioName.trim();
    if (!name) {
      setStatus({ type: "error", msg: "Give the scenario a name before saving." });
      return;
    }
    const record = {
      id: Date.now().toString(),
      name,
      goal,
      ytdSales,
      avgTicket,
      cycleDays,
      stages,
      savedAt: new Date().toISOString(),
    };
    const next = [record, ...scenarios.filter((s) => s.name !== name)];
    persist(next);
    setScenarioName("");
    setStatus({ type: "ok", msg: `Scenario "${name}" saved.` });
    setTimeout(() => setStatus(null), 2500);
  }

  function loadScenario(s) {
    setGoal(s.goal);
    setYtdSales(s.ytdSales || 0);
    setAvgTicket(s.avgTicket);
    setCycleDays(s.cycleDays);
    setStages(s.stages);
    setShowLibrary(false);
    setStatus({ type: "ok", msg: `Scenario "${s.name}" loaded.` });
    setTimeout(() => setStatus(null), 2000);
  }

  function deleteScenario(id) {
    const next = scenarios.filter((s) => s.id !== id);
    persist(next);
    setCompareIds((ids) => ids.filter((i) => i !== id));
  }

  function toggleCompare(id) {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id].slice(-3)));
  }

  function calc(s) {
    const remaining = Math.max(0, s.goal - (s.ytdSales || 0));
    const conv = s.stages.reduce((acc, st) => acc * (Math.max(0, Math.min(100, st.rate)) / 100), 1);
    const deals = s.avgTicket > 0 ? remaining / s.avgTicket : 0;
    const leads = conv > 0 ? deals / conv : 0;
    return { conv, deals, leads, pipeline: leads * (s.cycleDays / 30) };
  }

  // ---- stage editing ----
  function updateStage(id, field, value) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: field === "rate" ? Number(value) : value } : s)));
  }

  function addStage() {
    setStages((prev) => [...prev, { id: `s${Date.now()}`, name: "New stage", rate: 50 }]);
  }

  function removeStage(id) {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((s) => s.id !== id));
  }

  const comparedScenarios = scenarios.filter((s) => compareIds.includes(s.id));

  return (
    <div className="app-root min-h-screen font-sans transition-colors duration-200" data-theme={theme}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 border-b border-base pb-6">
          <div>
            <div className="flex items-center gap-2 text-accent text-xs font-mono uppercase tracking-widest mb-2">
              <TrendingUp size={14} />
              Pipeline Calculator
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary">Leads needed to hit your goal</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-strong hover-accent-outline transition-colors"
            >
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              {theme === "dark" ? "Dark" : "Light"}
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-strong hover-accent-outline transition-colors"
            >
              <FolderOpen size={16} />
              Scenarios ({scenarios.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <section className="space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-label">Goal & deal size</h2>
              <Field label="Annual goal (USD)">
                <MoneyInput value={goal} onChange={setGoal} />
              </Field>
              <Field label="YTD sales (USD)">
                <MoneyInput value={ytdSales} onChange={setYtdSales} />
              </Field>
              <Field label="Remaining goal (USD)">
                <div className="calc-input flex items-center text-muted bg-panel-soft">
                  {fmtMoney(remainingGoal)}
                </div>
              </Field>
              <Field label="Average deal size (USD)">
                <MoneyInput value={avgTicket} onChange={setAvgTicket} />
              </Field>
              <Field label="Average sales cycle (days)">
                <input
                  type="number"
                  value={cycleDays}
                  onChange={(e) => setCycleDays(Number(e.target.value))}
                  className="calc-input"
                  min="0"
                />
              </Field>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-widest text-label">Funnel stages</h2>
                <button onClick={addStage} className="link-accent flex items-center gap-1 text-xs">
                  <Plus size={14} /> Stage
                </button>
              </div>
              <div className="space-y-2">
                {stages.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 bg-panel border border-base rounded-md px-3 py-2">
                    <span className="text-faint font-mono text-xs w-4">{i + 1}</span>
                    <input
                      value={s.name}
                      onChange={(e) => updateStage(s.id, "name", e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm text-body-alt min-w-0"
                    />
                    <input
                      type="number"
                      value={s.rate}
                      onChange={(e) => updateStage(s.id, "rate", e.target.value)}
                      className="ring-accent w-16 bg-input-alt rounded px-2 py-1 text-sm text-right font-mono outline-none"
                      min="0"
                      max="100"
                    />
                    <span className="text-muted text-xs">%</span>
                    <button
                      onClick={() => removeStage(s.id)}
                      disabled={stages.length <= 1}
                      className="text-faint hover-danger disabled:opacity-30"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Save scenario */}
            <section className="space-y-2 pt-2 border-t border-base">
              <h2 className="text-xs font-mono uppercase tracking-widest text-label pt-4">Save this scenario</h2>
              <div className="flex gap-2">
                <input
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g. Panama Q3"
                  className="calc-input flex-1"
                />
                <button
                  onClick={saveScenario}
                  className="btn-accent flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Save size={14} /> Save
                </button>
              </div>
              {status && (
                <p className={`text-xs ${status.type === "error" ? "text-danger" : "text-accent"}`}>{status.msg}</p>
              )}
            </section>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-label">Result</h2>

            <div className="hero-panel border rounded-lg p-6">
              <p className="text-xs text-muted mb-1">Leads needed per month</p>
              <p className="text-4xl font-mono font-semibold text-accent">{fmtInt(leadsPerMonth)}</p>
              <p className="text-xs text-label mt-2">
                to generate {fmtInt(dealsNeeded)} closed deals/month at {fmtMoney(avgTicket)} each and cover {fmtMoney(remainingGoal)} remaining
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Overall conversion" value={`${fmtNum(globalConversion * 100, 2)}%`} sub="product of all stages" />
              <StatCard label="Closed deals needed/month" value={fmtInt(dealsNeeded)} sub={fmtMoney(avgTicket) + " average deal size"} />
            </div>

            <div className="bg-panel border border-base rounded-lg p-5 space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest text-label">Effect of the sales cycle ({cycleDays} days)</p>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Leads that must be active in the pipeline at all times</span>
                <span className="font-mono text-lg text-primary">{fmtInt(pipelineActivo)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Leads generated today would close around</span>
                <span className="font-mono text-lg text-primary">{fmtDate(closeDate)}</span>
              </div>
              <p className="text-xs text-faint pt-1 border-t border-base">
                If the cycle exceeds 30 days, the {fmtInt(leadsPerMonth)} leads/month aren't enough on their own: you need {fmtInt(pipelineActivo)} leads
                coexisting in the funnel at once to sustain the closing pace.
              </p>
            </div>

            {/* Stage breakdown */}
            <div className="bg-panel border border-base rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-widest text-label mb-3">Volume required per stage</p>
              <div className="space-y-2">
                {(() => {
                  let volume = dealsNeeded;
                  const rows = [{ name: "Close", volume }];
                  for (let i = stages.length - 1; i >= 0; i--) {
                    const rate = Math.max(0.0001, stages[i].rate / 100);
                    volume = volume / rate;
                    rows.unshift({ name: stages[i].name.split("\u2192")[0]?.trim() || stages[i].name, volume });
                  }
                  const max = Math.max(...rows.map((r) => r.volume));
                  return rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted w-32 truncate">{r.name}</span>
                      <div className="flex-1 h-5 bg-input-alt rounded overflow-hidden">
                        <div
                          className="h-full bar-fill"
                          style={{ width: `${Math.max(4, (r.volume / max) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-body w-14 text-right">{fmtInt(r.volume)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison */}
        {comparedScenarios.length > 0 && (
          <div className="mt-10 border-t border-base pt-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-label mb-4">
              Scenario comparison ({comparedScenarios.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-label text-xs font-mono uppercase">
                    <th className="pb-2 pr-4">Metric</th>
                    {comparedScenarios.map((s) => (
                      <th key={s.id} className="pb-2 pr-4 text-accent">{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <Row label="Annual goal" cells={comparedScenarios.map((s) => fmtMoney(s.goal))} />
                  <Row label="YTD sales" cells={comparedScenarios.map((s) => fmtMoney(s.ytdSales || 0))} />
                  <Row label="Remaining goal" cells={comparedScenarios.map((s) => fmtMoney(Math.max(0, s.goal - (s.ytdSales || 0))))} />
                  <Row label="Average deal size" cells={comparedScenarios.map((s) => fmtMoney(s.avgTicket))} />
                  <Row label="Cycle (days)" cells={comparedScenarios.map((s) => s.cycleDays)} />
                  <Row label="Overall conversion" cells={comparedScenarios.map((s) => `${fmtNum(calc(s).conv * 100, 2)}%`)} />
                  <Row label="Leads/month" cells={comparedScenarios.map((s) => fmtInt(calc(s).leads))} highlight />
                  <Row label="Active pipeline" cells={comparedScenarios.map((s) => fmtInt(calc(s).pipeline))} />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Scenario library modal */}
      {showLibrary && (
        <div className="overlay fixed inset-0 flex items-center justify-center p-6 z-50" onClick={() => setShowLibrary(false)}>
          <div
            className="bg-panel border border-base rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-primary">Saved scenarios</h3>
              <button onClick={() => setShowLibrary(false)} className="text-muted hover-primary">
                <X size={18} />
              </button>
            </div>
            {!loaded ? (
              <p className="text-sm text-label">Loading...</p>
            ) : scenarios.length === 0 ? (
              <p className="text-sm text-label">You haven't saved any scenario yet.</p>
            ) : (
              <div className="space-y-2">
                {scenarios.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 bg-inset border border-base rounded-md px-3 py-2">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(s.id)}
                      onChange={() => toggleCompare(s.id)}
                      style={{ accentColor: "var(--checkbox-accent)" }}
                      title="Compare"
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadScenario(s)}>
                      <p className="text-sm text-body-alt truncate">{s.name}</p>
                      <p className="text-xs text-label">
                        {fmtMoney(Math.max(0, s.goal - (s.ytdSales || 0)))} remaining \u00b7 {fmtMoney(s.avgTicket)}/deal \u00b7 {s.cycleDays}d
                      </p>
                    </div>
                    <button onClick={() => deleteScenario(s.id)} className="text-faint hover-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-faint mt-4">Check the box to compare up to 3 scenarios side by side.</p>
          </div>
        </div>
      )}

      <style>{`
        .app-root[data-theme="dark"] {
          --bg: #020617;
          --bg-panel: #0f172a;
          --bg-panel-soft: rgba(15, 23, 42, 0.6);
          --bg-inset: #020617;
          --bg-input-alt: #1e293b;
          --border: #1e293b;
          --border-strong: #334155;
          --border-accent: rgba(22, 78, 99, 0.5);
          --text-primary: #ffffff;
          --text-body: #cbd5e1;
          --text-body-alt: #e2e8f0;
          --text-muted: #94a3b8;
          --text-label: #64748b;
          --text-faint: #475569;
          --accent: #22d3ee;
          --accent-hover: #67e8f9;
          --accent-strong-bg: #0891b2;
          --accent-strong-hover: #06b6d4;
          --accent-contrast: #020617;
          --danger: #f87171;
          --overlay: rgba(0, 0, 0, 0.7);
          --hero-grad-from: rgba(8, 51, 68, 0.4);
          --bar-fill: #0e7490;
          --checkbox-accent: #06b6d4;
        }
        .app-root[data-theme="light"] {
          --bg: #f8fafc;
          --bg-panel: #ffffff;
          --bg-panel-soft: #f1f5f9;
          --bg-inset: #f1f5f9;
          --bg-input-alt: #e2e8f0;
          --border: #e2e8f0;
          --border-strong: #cbd5e1;
          --border-accent: rgba(165, 243, 252, 0.9);
          --text-primary: #0f172a;
          --text-body: #334155;
          --text-body-alt: #1e293b;
          --text-muted: #64748b;
          --text-label: #64748b;
          --text-faint: #94a3b8;
          --accent: #0e7490;
          --accent-hover: #155e75;
          --accent-strong-bg: #0891b2;
          --accent-strong-hover: #0e7490;
          --accent-contrast: #ffffff;
          --danger: #dc2626;
          --overlay: rgba(15, 23, 42, 0.4);
          --hero-grad-from: #ecfeff;
          --bar-fill: #0891b2;
          --checkbox-accent: #0891b2;
        }
        .app-root {
          background: var(--bg);
          color: var(--text-primary);
        }
        .text-primary { color: var(--text-primary); }
        .text-body { color: var(--text-body); }
        .text-body-alt { color: var(--text-body-alt); }
        .text-muted { color: var(--text-muted); }
        .text-label { color: var(--text-label); }
        .text-faint { color: var(--text-faint); }
        .text-accent { color: var(--accent); }
        .text-danger { color: var(--danger); }
        .bg-panel { background: var(--bg-panel); }
        .bg-panel-soft { background: var(--bg-panel-soft); }
        .bg-inset { background: var(--bg-inset); }
        .bg-input-alt { background: var(--bg-input-alt); }
        .border-base { border-color: var(--border); }
        .border-strong { border-color: var(--border-strong); }
        .bar-fill { background: var(--bar-fill); }
        .overlay { background: var(--overlay); }
        .hero-panel {
          background: linear-gradient(to bottom right, var(--hero-grad-from), var(--bg-panel));
          border-color: var(--border-accent);
        }
        .link-accent { color: var(--accent); }
        .link-accent:hover { color: var(--accent-hover); }
        .hover-accent-outline:hover { border-color: var(--accent); color: var(--accent); }
        .hover-danger:hover { color: var(--danger); }
        .hover-primary:hover { color: var(--text-primary); }
        .btn-accent { background: var(--accent-strong-bg); color: var(--accent-contrast); }
        .btn-accent:hover { background: var(--accent-strong-hover); }
        .ring-accent:focus { box-shadow: 0 0 0 1px var(--accent); }
        .calc-input {
          width: 100%;
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-family: ui-monospace, monospace;
          font-size: 0.875rem;
          color: var(--text-body-alt);
          outline: none;
        }
        .calc-input:focus {
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}

function MoneyInput({ value, onChange }) {
  const [text, setText] = useState(fmtMoney(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(fmtMoney(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      className="calc-input"
      onFocus={() => {
        setFocused(true);
        setText(value === 0 ? "" : String(value));
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const parsed = parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
        onChange(parsed);
        setText(fmtMoney(parsed));
      }}
    />
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-panel border border-base rounded-lg p-4">
      <p className="text-xs text-label mb-1">{label}</p>
      <p className="text-2xl font-mono text-primary">{value}</p>
      <p className="text-xs text-faint mt-1">{sub}</p>
    </div>
  );
}

function Row({ label, cells, highlight }) {
  return (
    <tr className={`border-t border-base ${highlight ? "text-accent" : "text-body"}`}>
      <td className="py-2 pr-4 text-label font-sans">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="py-2 pr-4">{c}</td>
      ))}
    </tr>
  );
}
