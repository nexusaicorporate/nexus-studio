import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const colorMap: { [key: string]: string } = {
    blue: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    sky: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100/80 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
    cyan: "bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-100/80 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    green: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    lime: "bg-lime-100 text-lime-700 border-lime-200 hover:bg-lime-100/80 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800",
    amber: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    orange: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100/80 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    rose: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100/80 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
    pink: "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100/80 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
    red: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    violet: "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100/80 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
    purple: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100/80 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100/80 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    slate: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    gray: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    zinc: "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100/80 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    default: "bg-muted/50 text-foreground border-border hover:bg-muted"
};

export function getCategoryColor(colorName?: string): string {
    if (!colorName) return colorMap.default;
    return colorMap[colorName] || colorMap.default;
}
