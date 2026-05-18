"use client";

import { useEffect, useRef, useState } from "react";
import type { Expense } from "@/lib/schema";

type FormState = {
  date: string;
  category: string;
  subcategory: string;
  item: string;
  amount: string;
  shop: string;
  notes: string;
};

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
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
      <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</label>
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

const PAGE_SIZE = 25;
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const defaultForm: FormState = {
  date: today,
  category: "",
  subcategory: "",
  item: "",
  amount: "",
  shop: "",
  notes: "",
};

function ExpenseForm({
  form,
  setForm,
  onSubmit,
  loading,
  error,
  submitLabel,
  onCancel,
  idPrefix,
  categorySuggestions,
  subcategorySuggestions,
  shopSuggestions,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  submitLabel: string;
  onCancel: () => void;
  idPrefix: string;
  categorySuggestions: string[];
  subcategorySuggestions: string[];
  shopSuggestions: string[];
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Amount (₱)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Category">
          <input
            type="text"
            list={`${idPrefix}-categories`}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. Food"
            required
            className={inputClass}
            autoComplete="off"
          />
          <datalist id={`${idPrefix}-categories`}>
            {categorySuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
        <Field label="Subcategory (optional)">
          <input
            type="text"
            list={`${idPrefix}-subcategories`}
            value={form.subcategory}
            onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
            placeholder="e.g. Groceries"
            className={inputClass}
            autoComplete="off"
          />
          <datalist id={`${idPrefix}-subcategories`}>
            {subcategorySuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
        <Field label="Item">
          <input
            type="text"
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
            placeholder="e.g. Chicken rice"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Shop (optional)">
          <input
            type="text"
            list={`${idPrefix}-shops`}
            value={form.shop}
            onChange={(e) => setForm({ ...form, shop: e.target.value })}
            placeholder="e.g. 7-Eleven"
            className={inputClass}
            autoComplete="off"
          />
          <datalist id={`${idPrefix}-shops`}>
            {shopSuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className={`${inputClass} resize-y`}
        />
      </Field>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className={`${submitClass} inline-flex items-center gap-2`}>
          {loading && <Spinner light />}
          {loading ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={cancelClass}>Cancel</button>
      </div>
    </form>
  );
}

export default function ExpensesSection() {
  const [data, setData] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [subcategorySuggestions, setSubcategorySuggestions] = useState<string[]>([]);
  const [shopSuggestions, setShopSuggestions] = useState<string[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(defaultForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchPage(p: number, q: string) {
    setFetching(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/expenses?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? []);
        setTotal(json.total ?? 0);
        setPage(json.page ?? p);
        setTotalPages(json.totalPages || 1);
      }
    } finally {
      setFetching(false);
    }
  }

  async function fetchMeta() {
    const res = await fetch("/api/admin/expenses/meta");
    if (res.ok) {
      const json = await res.json();
      setCategorySuggestions(json.categories ?? []);
      setSubcategorySuggestions(json.subcategories ?? []);
      setShopSuggestions(json.shops ?? []);
    }
  }

  useEffect(() => {
    fetchPage(1, "");
    fetchMeta();
  }, []);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage(1, value.trim());
    }, 300);
  }

  function goToPage(p: number) {
    fetchPage(p, search.trim());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm(defaultForm);
        setShowAddModal(false);
        fetchPage(page, search.trim());
        fetchMeta();
      } else {
        const json = await res.json();
        setAddError(json.error || "Failed to add expense.");
      }
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(row: Expense) {
    setEditingId(row.id);
    setEditForm({
      date: row.date,
      category: row.category,
      subcategory: row.subcategory ?? "",
      item: row.item,
      amount: String(row.amount),
      shop: row.shop ?? "",
      notes: row.notes ?? "",
    });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError("");
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        fetchPage(page, search.trim());
        fetchMeta();
      } else {
        const json = await res.json();
        setEditError(json.error || "Failed to update expense.");
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    fetchPage(page, search.trim());
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Expenses ({total})
            {fetching && <Spinner />}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search…"
              className={`${inputClass} max-w-[180px]`}
            />
            <button
              onClick={() => { setForm(defaultForm); setAddError(""); setShowAddModal(true); }}
              className={submitClass}
            >
              + Add entry
            </button>
          </div>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No expense entries found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Item</th>
                    <th className="pb-2 pr-4 font-medium">Shop</th>
                    <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Notes</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border)] last:border-0 align-top">
                      <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">{row.date}</td>
                      <td className="py-2 pr-4 text-[var(--text)] whitespace-nowrap">
                        {row.category}
                        {row.subcategory && (
                          <span className="text-[var(--text-muted)]"> / {row.subcategory}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-[var(--text)]">{row.item}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap">{row.shop ?? "—"}</td>
                      <td className="py-2 pr-4 text-[var(--text)] whitespace-nowrap font-mono text-xs text-right">
                        ₱{row.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 pr-4 text-[var(--text-muted)] max-w-xs">{row.notes ?? "—"}</td>
                      <td className="py-2">
                        <div className="flex gap-2 items-center">
                          <button onClick={() => startEdit(row)} className="text-xs text-[var(--accent)] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(row.id)} className="text-xs text-[var(--warm)] hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-4 mt-4">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed">
                  ← Prev
                </button>
                <span className="text-sm text-[var(--text-muted)]">Page {page} of {totalPages}</span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {showAddModal && (
        <Modal title="Add expense" onClose={() => setShowAddModal(false)}>
          <ExpenseForm
            form={form}
            setForm={setForm}
            onSubmit={handleAdd}
            loading={addLoading}
            error={addError}
            submitLabel="Add entry"
            onCancel={() => setShowAddModal(false)}
            idPrefix="add"
            categorySuggestions={categorySuggestions}
            subcategorySuggestions={subcategorySuggestions}
            shopSuggestions={shopSuggestions}
          />
        </Modal>
      )}

      {editingId !== null && (
        <Modal title="Edit expense" onClose={() => setEditingId(null)}>
          <ExpenseForm
            form={editForm}
            setForm={setEditForm}
            onSubmit={handleEdit}
            loading={editLoading}
            error={editError}
            submitLabel="Save changes"
            onCancel={() => setEditingId(null)}
            idPrefix="edit"
            categorySuggestions={categorySuggestions}
            subcategorySuggestions={subcategorySuggestions}
            shopSuggestions={shopSuggestions}
          />
        </Modal>
      )}
    </div>
  );
}
