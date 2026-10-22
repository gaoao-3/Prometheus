import clsx from "clsx";
import { Collapse } from "./ui.tsx";
import { Check, ChevronDown, ChevronUp, ListChecks, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { latestTodos } from "@prometheus/protocol";
import { defineMessages, useT } from "../lib/i18n.ts";
import { usePrefs } from "../lib/prefs.ts";
import { pluginActive, useStore } from "../lib/store.ts";

const M = defineMessages({
	zh: { title: "任务清单", progress: "{done}/{total} 已完成", allDone: "全部完成", expand: "展开", collapse: "收起" },
	en: { title: "Tasks", progress: "{done}/{total} done", allDone: "All done", expand: "Expand", collapse: "Collapse" },
});

/** How long a finished list stays open before it folds itself away. */
const AUTO_FOLD_MS = 4000;

/** The agent's live checklist, shown above the input. Hidden when the todos plugin is off or no list exists. */
export function TaskPanel() {
	const t = useT(M);
	const messages = useStore((s) => s.session?.messages);
	const enabled = useStore((s) => pluginActive(s.plugins, "todos"));
	const sessionId = useStore((s) => s.session?.id);
	const streaming = useStore((s) => s.session?.isStreaming ?? false);
	const todos = useMemo(() => (enabled && messages ? latestTodos(messages) : []), [enabled, messages]);
	const foldTodos = usePrefs((p) => p.foldTodos);
	const key = sessionId ?? "";
	// A click pins the choice for this conversation; otherwise the panel folds itself once the list is done.
	const [manual, setManual] = useState<Record<string, boolean>>({});
	const [settled, setSettled] = useState<Record<string, boolean>>({});
	const done = todos.filter((x) => x.status === "completed").length;
	const finished = todos.length > 0 && done === todos.length;
	useEffect(() => {
		if (!finished || !foldTodos) {
			// Unfinished, or folding switched off: forget the auto fold so the next completion can fold again.
			setSettled((s) => (s[key] ? { ...s, [key]: false } : s));
			return;
		}
		// Let the finished list stay readable for a moment before it folds away.
		const timer = setTimeout(() => setSettled((s) => ({ ...s, [key]: true })), AUTO_FOLD_MS);
		return () => clearTimeout(timer);
	}, [finished, foldTodos, key]);
	if (!todos.length) return null;

	const current = todos.find((x) => x.status === "in_progress");
	const closed = manual[key] ?? settled[key] ?? false;

	return (
		<div className="chat-col mx-auto mb-2 w-full px-3 md:px-5">
			<div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-900/70 backdrop-blur">
				<button
					type="button"
					onClick={() => setManual((m) => ({ ...m, [key]: !closed }))}
					className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs hover:bg-ink-850"
					aria-expanded={!closed}
					title={closed ? t("expand") : t("collapse")}
				>
					<ListChecks className={clsx("size-4 shrink-0", finished ? "text-moss-400" : "text-ember-400")} />
					<span className="font-medium text-ink-200">{t("title")}</span>
					<span className="font-mono text-ink-500">{finished ? t("allDone") : t("progress", { done, total: todos.length })}</span>
					{closed && current && <span className="min-w-0 flex-1 truncate text-ink-400">· {current.activeForm || current.content}</span>}
					<span className="flex-1" />
					<span className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-ink-800 max-sm:w-12">
						<span className={clsx("block h-full rounded-full transition-all duration-500", finished ? "bg-moss-400" : "bg-ember-500")} style={{ width: `${(done / todos.length) * 100}%` }} />
					</span>
					{closed ? <ChevronUp className="size-3.5 shrink-0 text-ink-500" /> : <ChevronDown className="size-3.5 shrink-0 text-ink-500" />}
				</button>
				<Collapse open={!closed}>
					<ul className="max-h-[30dvh] space-y-0.5 overflow-y-auto border-t border-ink-800 px-3.5 py-2 md:max-h-48">
						{todos.map((item, i) => (
							<li key={i} className="flex items-start gap-2 py-0.5 text-[13px]">
								<span className="mt-0.5 grid size-4 shrink-0 place-items-center">
									{item.status === "completed" ? (
										<Check className="size-3.5 text-moss-400" strokeWidth={3} />
									) : item.status === "in_progress" ? (
										<LoaderCircle className={clsx("size-3.5 text-ember-400", streaming ? "animate-spin" : "opacity-50")} />
									) : (
										<span className="size-2.5 rounded-full border border-ink-600" />
									)}
								</span>
								<span className={clsx("min-w-0 break-words", item.status === "completed" ? "text-ink-500 line-through" : item.status === "in_progress" ? "text-ink-100" : "text-ink-300")}>
									{item.status === "in_progress" ? item.activeForm || item.content : item.content}
								</span>
							</li>
						))}
					</ul>
				</Collapse>
			</div>
		</div>
	);
}
