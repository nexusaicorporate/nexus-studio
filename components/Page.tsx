"use client";
import { ReactNode } from "react";

export default function Page({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="w-full px-6 py-6 fade-in min-h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-6 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary flex items-center gap-2">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-muted mt-1 leading-normal">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">{actions}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}
