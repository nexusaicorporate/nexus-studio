"use client";
import { useEffect, useState, ReactNode } from "react";
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); if (open) window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 glass" onClick={onClose}>
      <div className={`card fade-in w-full ${wide ? "max-w-4xl" : "max-w-xl"} max-h-[88vh] overflow-y-auto p-5`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">{title}</h3><button className="btn-ghost px-2 py-1" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) { return (<div className="mb-3"><span className="label">{label}</span>{children}</div>); }
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label?: string }) {
  return (<button onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm"><span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${checked ? "bg-primary" : "bg-surface2 border border-border"}`}><span className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} /></span>{label && <span className="text-muted">{label}</span>}</button>);
}
export function useMounted() { const [m, setM] = useState(false); useEffect(() => setM(true), []); return m; }
export function copy(text: string) { navigator.clipboard?.writeText(text); }
