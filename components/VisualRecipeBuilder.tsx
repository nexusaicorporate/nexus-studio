"use client";
import React, { useState } from "react";
import { parseTemplate, tokenOptions, chipClasses, catColor } from "@/lib/promptfill";
import type { Bank } from "@/lib/types";

interface VisualRecipeBuilderProps {
  content: string;
  selections: Record<string, string>;
  banks: Bank[];
  onChange: (selections: Record<string, string>) => void;
}

export function VisualRecipeBuilder({ content, selections, banks, onChange }: VisualRecipeBuilderProps) {
  const segs = parseTemplate(content);

  function setSel(token: string, value: string) {
    onChange({ ...selections, [token]: value });
  }

  function promptCustom(msg: string, def: string): string | null {
    if (typeof window !== "undefined") return window.prompt(msg, def);
    return null;
  }

  return (
    <div className="rounded-xl bg-surface2 border border-border p-3 leading-8 text-sm">
      {segs.length === 0 && <span className="text-muted text-xs">Recipe has no content.</span>}
      {segs.map((seg, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
        
        const token = seg.token!;
        const opts = tokenOptions(token, seg.def, banks);
        const bank = banks.find((b) => b.id === token);
        const color = chipClasses(catColor(bank?.category));
        const val = selections[token] || seg.def || bank?.options[0] || token || "";

        return (
          <span key={i} className={`inline-flex items-center rounded-md px-1.5 py-0.5 mx-0.5 ${color}`}>
            <select
              className="bg-transparent outline-none text-inherit cursor-pointer max-w-[180px] truncate"
              value={selections[token] ?? ""}
              onChange={(e) => {
                if (e.target.value === "__custom") {
                  const v = promptCustom("Custom value:", val);
                  if (v) setSel(token, v);
                } else {
                  setSel(token, e.target.value);
                }
              }}
            >
              <option value="">{val}</option>
              {opts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              <option value="__custom">Custom…</option>
            </select>
          </span>
        );
      })}
    </div>
  );
}
