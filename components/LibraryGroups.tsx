"use client";
import { Fragment, useMemo, useState, ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Sort = "az" | "za" | "new";

export default function LibraryGroups<T extends { id: string; createdAt: number }>({
  items, groupOf, titleOf, gridClass, renderCard,
}: {
  items: T[];
  groupOf: (x: T) => string;
  titleOf: (x: T) => string;
  gridClass?: string;
  renderCard: (x: T) => ReactNode;
}) {
  const [sort, setSort] = useState<Sort>("az");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const g: Record<string, T[]> = {};
    for (const x of items) (g[groupOf(x) || "Other"] ||= []).push(x);
    for (const k of Object.keys(g)) {
      g[k].sort((a, b) =>
        sort === "new" ? b.createdAt - a.createdAt
        : sort === "za" ? titleOf(b).localeCompare(titleOf(a))
        : titleOf(a).localeCompare(titleOf(b)));
    }
    return g;
  }, [items, groupOf, titleOf, sort]);

  const keys = Object.keys(groups).sort();
  const grid = gridClass || "grid sm:grid-cols-2 lg:grid-cols-3 gap-4";
  function toggle(k: string) { setCollapsed((c) => ({ ...c, [k]: !c[k] })); }
  function setAll(v: boolean) { const o: Record<string, boolean> = {}; keys.forEach((k) => (o[k] = v)); setCollapsed(o); }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex gap-1">
          <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setAll(true)}>Collapse all</button>
          <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setAll(false)}>Expand all</button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted mr-1">Sort</span>
          {(["az", "za", "new"] as Sort[]).map((s) => (
            <button key={s} className={`tab ${sort === s ? "tab-active" : "tab-idle"}`} onClick={() => setSort(s)}>
              {s === "az" ? "A–Z" : s === "za" ? "Z–A" : "Newest"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {keys.map((k) => {
          const isCollapsed = !!collapsed[k];
          return (
            <div key={k}>
              <button className="w-full flex items-center gap-2 text-left mb-2 group" onClick={() => toggle(k)}>
                {isCollapsed ? <ChevronRight size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                <span className="text-sm font-semibold text-primary">{k}</span>
                <span className="text-[11px] text-muted">({groups[k].length})</span>
              </button>
              {!isCollapsed && <div className={grid}>{groups[k].map((x) => <Fragment key={x.id}>{renderCard(x)}</Fragment>)}</div>}
            </div>
          );
        })}
        {keys.length === 0 && <div className="text-sm text-muted text-center py-10 border border-dashed border-border rounded-xl">Nothing here yet.</div>}
      </div>
    </div>
  );
}
