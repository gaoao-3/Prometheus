import clsx from "clsx";
import { Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, CircleAlert, LoaderCircle } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { ToolCallContent, ToolResultMessage } from "@prometheus/protocol";
import { defineMessages, useT } from "../lib/i18n.ts";
import { usePrefs } from "../lib/prefs.ts";
import type { ToolRun } from "../lib/store.ts";
import { ToolClusterContext, ToolIcon } from "./ToolCard.tsx";
import { Collapse } from "./ui.tsx";

const M = defineMessages({
	zh: {
		toolCalls: "{n} 个工具调用",
		toolRunning: "{n} 个运行中",
		toolFailed: "{n} 个失败",
		expandAll: "全部展开",
		collapseAll: "全部收起",
	},
	en: {
		toolCalls: "{n} tool calls",
		toolRunning: "{n} running",
		toolFailed: "{n} failed",
		expandAll: "Expand all",
		collapseAll: "Collapse all",
	},
});

export function shortDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	const s = ms / 1000;
	if (s < 60) return `${s.toFixed(1)}s`;
	return `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, "0")}s`;
}

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
	const [expandAll, setExpandAll] = useState<boolean | null>(null);

	const statuses = calls.map((c) => tools[c.id]?.status ?? (results.get(c.id) ? (results.get(c.id)?.isError ? "error" : "done") : "running"));
	const running = statuses.filter((s) => s === "running").length;
	const failed = statuses.filter((s) => s === "error").length;

	if (!fold) {
		return <>{children}</>;
	}

	const open = override ?? running + failed > 0;
	const counts = new Map<string, number>();
	for (const c of calls) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
	const names = [...counts.entries()];
	const elapsed = calls.reduce((sum, c) => sum + (tools[c.id]?.durationMs ?? 0), 0);

	return (
		<ToolClusterContext.Provider value={{ expandAll }}>
			<div
				className={clsx(
					"overflow-hidden rounded-xl border bg-ink-900/70 transition-all",
					running > 0
						? "border-ember-500/40 ring-1 ring-ember-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.12)]"
						: failed > 0
							? "border-rose-400/40 bg-rose-400/5"
							: "border-ink-800",
				)}
			>
				<button
					type="button"
					aria-expanded={open}
					onClick={() => {
						setOverride(!open);
						if (open) setExpandAll(null);
					}}
					className={clsx(
						"flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-ink-850/50",
						open && "bg-ink-850/30",
					)}
				>
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
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-hidden">
						{names.slice(0, 4).map(([name, n]) => (
							<span
								key={name}
								className="inline-flex items-center gap-1 rounded-md border border-ink-800 bg-ink-950/60 px-1.5 py-0.5 font-mono text-[11px] text-ink-300"
							>
								<ToolIcon name={name} className="size-3 text-ink-400" />
								<span className="max-w-[80px] truncate sm:max-w-[120px]">{name}</span>
								{n > 1 && <span className="font-semibold text-ember-400">×{n}</span>}
							</span>
						))}
						{names.length > 4 && <span className="font-mono text-xs text-ink-600">+{names.length - 4}</span>}
					</div>
					{running > 0 && <span className="shrink-0 font-mono text-[11px] text-ember-300">{t("toolRunning", { n: running })}</span>}
					{running === 0 && failed > 0 && <span className="shrink-0 font-mono text-[11px] text-rose-400">{t("toolFailed", { n: failed })}</span>}
					{elapsed >= 100 && <span className="shrink-0 font-mono text-[11px] text-ink-600">{shortDuration(elapsed)}</span>}
					{open && calls.length > 1 && (
						<span
							role="button"
							tabIndex={0}
							onClick={(e) => {
								e.stopPropagation();
								setExpandAll((v) => (v === true ? false : true));
							}}
							onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), setExpandAll((v) => (v === true ? false : true)))}
							className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200"
							title={expandAll ? t("collapseAll") : t("expandAll")}
						>
							{expandAll ? <ChevronsDownUp className="size-3" /> : <ChevronsUpDown className="size-3" />}
							<span className="hidden sm:inline">{expandAll ? t("collapseAll") : t("expandAll")}</span>
						</span>
					)}
					{open ? <ChevronDown className="size-3.5 shrink-0 text-ink-500" /> : <ChevronRight className="size-3.5 shrink-0 text-ink-500" />}
				</button>
				<Collapse open={open}>
					<div className="flex flex-col gap-2 border-t border-ink-800 p-2">
						{children}
					</div>
				</Collapse>
			</div>
		</ToolClusterContext.Provider>
	);
}
