"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Expense } from "@/lib/schema";

// ── Constants ─────────────────────────────────────────────────────────────────

const PALETTE = [
  "#4E6877", "#8B6C61", "#5E8365", "#7A6B8B", "#6B7B8D",
  "#8B7355", "#6B8B7A", "#8B8B65", "#7A8B6B", "#8B6580",
];

type Granularity = "day" | "week" | "month";

type PivotRow = { period: string } & Record<string, number | string>;

type AggRow = { period: string; category: string; amount: number };

// ── Utilities ─────────────────────────────────────────────────────────────────

function getDefaultDates() {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return { dateTo: fmt(today), dateFrom: fmt(sixMonthsAgo) };
}

function php(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPeriodLabel(period: string, gran: Granularity): string {
  if (gran === "month") {
    const [y, m] = period.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  }
  if (gran === "week") return period;
  const [y, m, d] = period.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function periodToDateRange(period: string, gran: Granularity): { from: string; to: string } {
  if (gran === "day") return { from: period, to: period };
  if (gran === "month") {
    const [y, m] = period.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, "0")}` };
  }
  // week: "2026-W20" — SQLite strftime('%W') uses Monday as week start (00-53)
  // Week 00 = Jan 1 up to the day before the first Monday
  // Week 01 = first Monday of the year through the following Sunday
  const [yearStr, weekStr] = period.split("-W");
  const year = parseInt(yearStr);
  const weekNum = parseInt(weekStr);
  const jan1 = new Date(year, 0, 1);
  // (8 - day) % 7 gives 0 when Jan 1 is Monday, otherwise days until next Monday
  const daysToFirstMonday = (8 - jan1.getDay()) % 7;
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (weekNum === 0) {
    if (daysToFirstMonday === 0) return { from: `${year}-01-01`, to: `${year}-01-01` };
    const end = new Date(year, 0, daysToFirstMonday); // last day before first Monday
    return { from: `${year}-01-01`, to: fmt(end) };
  }
  const start = new Date(year, 0, 1 + daysToFirstMonday + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: fmt(start), to: fmt(end) };
}

// ── Small components ──────────────────────────────────────────────────────────

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${
        light ? "border-white" : "border-[var(--accent)]"
      }`}
    />
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading font-bold text-base text-[var(--text)] mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const submitClass =
  "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200 disabled:opacity-50";
const cancelClass =
  "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200";

type FormState = {
  date: string;
  category: string;
  subcategory: string;
  item: string;
  amount: string;
  shop: string;
  notes: string;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ExpensesAnalysis() {
  const defaults = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [stackMode, setStackMode] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const [periods, setPeriods] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [chartData, setChartData] = useState<PivotRow[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [detailItems, setDetailItems] = useState<Expense[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState<FormState>({
    date: "", category: "", subcategory: "", item: "", amount: "", shop: "", notes: "",
  });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [subcategorySuggestions, setSubcategorySuggestions] = useState<string[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<string[]>([]);
  const [shopSuggestions, setShopSuggestions] = useState<string[]>([]);

  // Fetch aggregated pivot data
  const fetchChartData = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoadingChart(true);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo, granularity });
      const res = await fetch(`/api/admin/analysis/expenses?${params}`);
      if (!res.ok) return;
      const json: { periods: string[]; categories: string[]; rows: AggRow[] } = await res.json();

      const rowMap: Record<string, PivotRow> = {};
      for (const p of json.periods) {
        rowMap[p] = { period: p };
        for (const c of json.categories) rowMap[p][c] = 0;
      }
      for (const r of json.rows) {
        if (rowMap[r.period]) rowMap[r.period][r.category] = r.amount;
      }

      setPeriods(json.periods);
      setCategories(json.categories);
      setChartData(json.periods.map((p) => rowMap[p]));
    } finally {
      setLoadingChart(false);
    }
  }, [dateFrom, dateTo, granularity]);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  // Fetch detail items when selection changes
  useEffect(() => {
    if (!selectedPeriod) { setDetailItems([]); return; }
    setLoadingDetail(true);
    const range = periodToDateRange(selectedPeriod, granularity);
    const params = new URLSearchParams({ from: range.from, to: range.to, limit: "500" });
    if (selectedCategory) params.set("category", selectedCategory);
    fetch(`/api/admin/expenses?${params}`)
      .then((r) => r.json())
      .then((json) => setDetailItems(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [selectedPeriod, selectedCategory, granularity]);

  // Fetch meta for edit modal suggestions
  useEffect(() => {
    fetch("/api/admin/expenses/meta")
      .then((r) => r.json())
      .then((m) => {
        setCategorySuggestions(m.categories ?? []);
        setSubcategorySuggestions(m.subcategories ?? []);
        setItemSuggestions(m.items ?? []);
        setShopSuggestions(m.shops ?? []);
      })
      .catch(() => {});
  }, []);

  // Transform data for 100% stack mode
  const displayChartData = stackMode
    ? chartData.map((row) => {
        const visible = categories.filter((c) => !hiddenCategories.has(c));
        const total = visible.reduce((s, c) => s + (Number(row[c]) || 0), 0);
        const out: PivotRow = { period: row.period };
        for (const c of categories) {
          out[c] = total > 0 && !hiddenCategories.has(c)
            ? Math.round(((Number(row[c]) || 0) / total) * 1000) / 10
            : 0;
        }
        return out;
      })
    : chartData;

  const visibleCategories = categories.filter((c) => !hiddenCategories.has(c));

  function handleLegendClick(entry: { value: string }) {
    const cat = entry.value;
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function handleCellClick(period: string, category: string | null) {
    if (selectedPeriod === period && selectedCategory === category) {
      setSelectedPeriod(null);
      setSelectedCategory(null);
    } else {
      setSelectedPeriod(period);
      setSelectedCategory(category);
    }
  }

  function openEdit(exp: Expense) {
    setEditingExpense(exp);
    setEditForm({
      date: exp.date,
      category: exp.category,
      subcategory: exp.subcategory ?? "",
      item: exp.item,
      amount: String(exp.amount),
      shop: exp.shop ?? "",
      notes: exp.notes ?? "",
    });
    setEditError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/expenses/${editingExpense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editForm.date,
          category: editForm.category,
          subcategory: editForm.subcategory || null,
          item: editForm.item,
          amount: Number(editForm.amount),
          shop: editForm.shop || null,
          notes: editForm.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setEditError(err.error ?? "Save failed");
        return;
      }
      setEditingExpense(null);
      fetchChartData();
      if (selectedPeriod) {
        const range = periodToDateRange(selectedPeriod, granularity);
        const params = new URLSearchParams({ from: range.from, to: range.to, limit: "500" });
        if (selectedCategory) params.set("category", selectedCategory);
        const r = await fetch(`/api/admin/expenses?${params}`);
        const json = await r.json();
        setDetailItems(json.data ?? []);
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(exp: Expense) {
    if (!window.confirm(`Delete "${exp.item}" (${php(exp.amount)})? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/expenses/${exp.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Delete failed"); return; }
    setDetailItems((prev) => prev.filter((e) => e.id !== exp.id));
    fetchChartData();
  }

  function yAxisFormatter(v: number) {
    if (stackMode) return `${v}%`;
    if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `₱${(v / 1_000).toFixed(0)}k`;
    return `₱${v}`;
  }

  // Pivot table rows in descending order
  const tablePeriods = [...periods].reverse();

  function rowTotal(period: string) {
    const row = chartData.find((r) => r.period === period);
    return row ? categories.reduce((s, c) => s + (Number(row[c]) || 0), 0) : 0;
  }

  function cellAmount(period: string, cat: string) {
    const row = chartData.find((r) => r.period === period);
    return Number(row?.[cat]) || 0;
  }

  const label = (p: string) => formatPeriodLabel(p, granularity);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Filters */}
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-5 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Granularity</label>
          <div className="flex gap-1">
            {(["month", "week", "day"] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGranularity(g);
                  setSelectedPeriod(null);
                  setSelectedCategory(null);
                }}
                className={`px-3 py-2 rounded-[14px] text-sm font-medium transition-colors ${
                  granularity === g
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {loadingChart && <Spinner />}
      </div>

      {/* Row 2: Bar Chart */}
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-[var(--text-muted)]">Expenses by Category</p>
          <button
            onClick={() => setStackMode((v) => !v)}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-colors ${
              stackMode
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            100% Stack
          </button>
        </div>
        {loadingChart ? (
          <div className="h-[300px] flex items-center justify-center">
            <Spinner />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-[var(--text-muted)] text-sm">
            No data for selected range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={displayChartData} margin={{ top: 4, right: 16, bottom: 60, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD6" vertical={false} />
              <XAxis
                dataKey="period"
                tickFormatter={(v) => label(String(v))}
                angle={-35}
                textAnchor="end"
                height={72}
                interval="preserveStartEnd"
                tick={{ fontSize: 11, fill: "#66707A" }}
              />
              <YAxis
                tickFormatter={yAxisFormatter}
                tick={{ fontSize: 11, fill: "#66707A" }}
                width={56}
              />
              <Tooltip
                formatter={(value, name) =>
                  stackMode
                    ? [`${Number(value).toFixed(1)}%`, String(name)]
                    : [php(Number(value)), String(name)]
                }
                labelFormatter={(lbl) => label(String(lbl))}
                wrapperStyle={{ zIndex: 10 }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend
                onClick={(entry) => handleLegendClick(entry as { value: string })}
                formatter={(value: string) => (
                  <span
                    style={{
                      color: hiddenCategories.has(value) ? "#aaa" : "var(--text)",
                      fontSize: 12,
                      cursor: "pointer",
                      textDecoration: hiddenCategories.has(value) ? "line-through" : "none",
                    }}
                  >
                    {value}
                  </span>
                )}
                wrapperStyle={{ paddingTop: 8 }}
              />
              {categories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={PALETTE[i % PALETTE.length]} hide={hiddenCategories.has(cat)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 3: Pivot Table + Detail Panel */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Pivot Table */}
        <div className="flex-1 min-w-0 bg-[var(--surface)] rounded-[20px] border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 480 }}>
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th
                    className="text-left text-xs font-semibold text-[var(--text-muted)] px-4 py-3 border-b border-r border-[var(--border)] bg-[var(--surface)] whitespace-nowrap"
                    style={{ position: "sticky", top: 0, left: 0, zIndex: 3 }}
                  >
                    Period
                  </th>
                  {categories.map((cat) => (
                    <th
                      key={cat}
                      className="text-right text-xs font-semibold text-[var(--text-muted)] px-3 py-3 border-b border-[var(--border)] bg-[var(--surface)] whitespace-nowrap"
                      style={{ position: "sticky", top: 0, zIndex: 2 }}
                    >
                      {cat}
                    </th>
                  ))}
                  <th
                    className="text-right text-xs font-semibold text-[var(--text-muted)] px-4 py-3 border-b border-l border-[var(--border)] bg-[var(--surface)] whitespace-nowrap"
                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {tablePeriods.length === 0 && (
                  <tr>
                    <td
                      colSpan={categories.length + 2}
                      className="text-center text-[var(--text-muted)] text-sm py-10"
                    >
                      {loadingChart ? "Loading…" : "No data"}
                    </td>
                  </tr>
                )}
                {tablePeriods.map((period) => {
                  const isPeriodActive = selectedPeriod === period;
                  const isRowOnly = isPeriodActive && !selectedCategory;
                  return (
                    <tr
                      key={period}
                      className={`border-b border-[var(--border)] last:border-0 transition-colors ${
                        isRowOnly ? "bg-[var(--accent)]/[0.04]" : "hover:bg-[var(--surface-alt)]/40"
                      }`}
                    >
                      <td
                        onClick={() => handleCellClick(period, null)}
                        className={`px-4 py-2.5 whitespace-nowrap text-sm font-medium cursor-pointer border-r border-[var(--border)] bg-[var(--surface)] transition-colors ${
                          isPeriodActive ? "text-[var(--accent)]" : "text-[var(--text)] hover:text-[var(--accent)]"
                        }`}
                        style={{ position: "sticky", left: 0, zIndex: 1 }}
                      >
                        {label(period)}
                      </td>
                      {categories.map((cat) => {
                        const amount = cellAmount(period, cat);
                        const isCell = isPeriodActive && selectedCategory === cat;
                        return (
                          <td
                            key={cat}
                            onClick={() => handleCellClick(period, cat)}
                            className={`px-3 py-2.5 text-right font-mono cursor-pointer transition-colors ${
                              isCell
                                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                                : amount !== 0
                                  ? amount < 0
                                    ? "text-[var(--warm)] hover:bg-[var(--surface-alt)]"
                                    : "text-[var(--text)] hover:bg-[var(--surface-alt)]"
                                  : "text-[var(--text-muted)]/30 hover:bg-[var(--surface-alt)]"
                            }`}
                          >
                            {amount !== 0
                              ? amount < 0
                                ? `(₱${Math.abs(amount).toLocaleString("en-PH", { maximumFractionDigits: 0 })})`
                                : `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
                              : "—"}
                          </td>
                        );
                      })}
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold border-l border-[var(--border)] whitespace-nowrap ${rowTotal(period) < 0 ? "text-[var(--warm)]" : "text-[var(--text)]"}`}>
                        {(() => { const t = rowTotal(period); return t < 0 ? `(₱${Math.abs(t).toLocaleString("en-PH", { maximumFractionDigits: 0 })})` : `₱${t.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`; })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="w-full lg:w-80 shrink-0 bg-[var(--surface)] rounded-[20px] border border-[var(--border)] overflow-hidden">
          {!selectedPeriod ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Click a period row or category cell in the table to see individual expenses
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-[var(--text)]">
                    {selectedCategory ?? "All categories"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{label(selectedPeriod)}</p>
                  {!loadingDetail && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {detailItems.length} expense{detailItems.length !== 1 ? "s" : ""} ·{" "}
                      {php(detailItems.reduce((s, e) => s + e.amount, 0))}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedPeriod(null); setSelectedCategory(null); }}
                  className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs transition-colors shrink-0 mt-0.5"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-10">
                    <Spinner />
                  </div>
                ) : detailItems.length === 0 ? (
                  <p className="text-center text-[var(--text-muted)] text-sm py-10">No expenses</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {detailItems.map((exp) => (
                      <li
                        key={exp.id}
                        className="px-5 py-3 hover:bg-[var(--surface-alt)]/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text)] truncate">{exp.item}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {exp.category}
                              {exp.subcategory ? ` · ${exp.subcategory}` : ""}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {exp.date}
                              {exp.shop ? ` · ${exp.shop}` : ""}
                            </p>
                            {exp.notes && (
                              <p className="text-xs text-[var(--text-muted)] italic mt-0.5 truncate">
                                {exp.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="font-mono text-sm font-semibold text-[var(--text)]">
                              {php(exp.amount)}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEdit(exp)}
                                className="text-[10px] px-2 py-0.5 rounded-[6px] bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(exp)}
                                className="text-[10px] px-2 py-0.5 rounded-[6px] bg-[var(--surface-alt)] text-red-400 hover:text-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <Modal title="Edit Expense" onClose={() => setEditingExpense(null)}>
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Amount (₱)">
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Category">
                <input
                  type="text"
                  list="ea-cats"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  required
                  className={inputClass}
                />
                <datalist id="ea-cats">
                  {categorySuggestions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Subcategory">
                <input
                  type="text"
                  list="ea-subcats"
                  value={editForm.subcategory}
                  onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                  className={inputClass}
                />
                <datalist id="ea-subcats">
                  {subcategorySuggestions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Item">
                <input
                  type="text"
                  list="ea-items"
                  value={editForm.item}
                  onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                  required
                  className={inputClass}
                />
                <datalist id="ea-items">
                  {itemSuggestions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Shop">
                <input
                  type="text"
                  list="ea-shops"
                  value={editForm.shop}
                  onChange={(e) => setEditForm({ ...editForm, shop: e.target.value })}
                  className={inputClass}
                />
                <datalist id="ea-shops">
                  {shopSuggestions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </Field>
            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={editLoading}
                className={`${submitClass} inline-flex items-center gap-2`}
              >
                {editLoading && <Spinner light />}
                {editLoading ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className={cancelClass}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
