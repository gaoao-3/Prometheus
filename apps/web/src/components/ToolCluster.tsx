import clsx from "clsx";
import { Check, ChevronDown, ChevronRight, CircleAlert, LoaderCircle } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { ToolCallContent, ToolResultMessage } from "@prometheus/protocol";
import { defineMessages, useT } from "../lib/i18n.ts";
import { usePrefs } from "../lib/prefs.ts";
import type { ToolRun } from "../lib/store.ts";
import { Collapse } from "./ui.tsx";

const M = defineMessages({
	zh: {
		toolCalls: "{n} 个工具调用",
		toolRunning: "{n} 个运行中",
		toolFailed: "{n} 个失败",
	},
	en: {
		toolCalls: "{n} tool calls",
		toolRunning: "{n} running",
		toolFailed: "{n} failed",
	},
});

/** Compact elapsed time: 850ms, 12.3s, 1m05s. */
export function shortDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	const s = ms / 1000;
	if (s < 60) return `${s.toFixed(1)}s`;
	return `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, "0")}s`;
}

/**
 * A turn's consecutive tool calls, folded into a single row. It opens by itself while something runs
 * or after a failure, folds back to one line once the round is done, and a click pins it either way.
 */
export function ToolCluster({
	calls,
	tools,
	results,
	children,
}: {
	calls: ToolCallContent[];
	tools: Record<string, ToolRun>;
	results: Map<string, ToolResultMessage>;
	children: ReactNode;
}) {
	const t = useT(M);
	const fold = usePrefs((p) => p.foldTools);
	const [override, setOverride] = useState<boolean | null>(null);
	const statuses = calls.map((c) => tools[c.id]?.status ?? (results.get(c.id) ? (results.get(c.id)?.isError ? "error" : "done") : "running"));
	const running = statuses.filter((s) => s === "running").length;
	const failed = statuses.filter((s) => s === "error").length;

	if (!fold) {
		return <>{children}</>;
	}

	const open = override ?? running + failed > 0;
	const counts = new Map<string, number>();
	for (const c of calls) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
	const names = [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
	const summary = names.slice(0, 6).join(" · ") + (names.length > 6 ? " · …" : "");
	const elapsed = calls.reduce((sum, c) => sum + (tools[c.id]?.durationMs ?? 0), 0);

	return (
		<div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-900/70">
			<button type="button" aria-expanded={open} onClick={() => setOverride(!open)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
				<span
					className={clsx(
						"grid size-6 shrink-0 place-items-center rounded-md",
						running > 0 && "bg-ember-500/15 text-ember-300",
						running === 0 && failed > 0 && "bg-rose-400/12 text-rose-400",
						running === 0 && failed === 0 && "bg-moss-400/12 text-moss-400",
					)}
				>
					{running > 0 ? <LoaderCircle className="size-3.5 animate-spin" /> : failed > 0 ? <CircleAlert className="size-3.5" /> : <Check className="size-3.5" />}
				</span>
				<span className="shrink-0 text-[13px] font-medium text-ink-100">{t("toolCalls", { n: calls.length })}</span>
				<span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-500">{summary}</span>
				{running > 0 && <span className="shrink-0 font-mono text-[11px] text-ember-300">{t("toolRunning", { n: running })}</span>}
				{running === 0 && failed > 0 && <span className="shrink-0 font-mono text-[11px] text-rose-400">{t("toolFailed", { n: failed })}</span>}
				{elapsed >= 100 && <span className="shrink-0 font-mono text-[11px] text-ink-600">{shortDuration(elapsed)}</span>}
				{open ? <ChevronDown className="size-3.5 shrink-0 text-ink-500" /> : <ChevronRight className="size-3.5 shrink-0 text-ink-500" />}
			</button>
			<Collapse open={open}>
				<div className="flex flex-col gap-2 border-t border-ink-800 p-2">
					{children}
				</div>
			</Collapse>
		</div>
	);
}
