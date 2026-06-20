"use client";
import { ReactNode } from "react";
export default function Page({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6 fade-in">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}</div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}
