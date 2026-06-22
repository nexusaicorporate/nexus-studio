"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import { WEB_MODE } from "@/lib/webmode";

interface Props {
  title: string;
  message: string;
  planNeeded?: string;
  inline?: boolean;
}

export default function UpgradePrompt({ title, message, planNeeded = "Pro", inline = false }: Props) {
  // In the desktop build, we don't lock anything because they supply their own keys.
  // But if it slips through somehow, don't show an "Upgrade" button.
  if (!WEB_MODE) {
    return (
      <div className={`p-4 border border-red-500/30 bg-red-500/10 text-red-400 rounded-xl flex items-start gap-3 ${inline ? '' : 'max-w-md'}`}>
        <Lock size={18} className="shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-sm mb-1">{title}</div>
          <div className="text-xs text-red-400/80">{message} (Desktop mode should not see this lock).</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border border-orange-500/30 bg-orange-500/10 text-orange-400 rounded-xl flex items-start gap-3 ${inline ? '' : 'max-w-md w-full mx-auto'}`}>
      <Lock size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-bold text-sm mb-1">{title}</div>
        <div className="text-xs text-orange-400/80 mb-3">{message}</div>
        <Link href="/billing" className="btn-primary py-1 px-3 text-xs inline-block">
          Upgrade to {planNeeded}
        </Link>
      </div>
    </div>
  );
}
