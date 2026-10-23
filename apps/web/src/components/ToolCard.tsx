import clsx from "clsx";
import {
	Check,
	ChevronDown,
	ChevronRight,
	CircleAlert,
	Copy,
	Eye,
	FileCode,
	GitBranch,
	Globe,
	LoaderCircle,
	Search,
	Terminal,
	Wrench,
} from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ToolCallContent, ToolResultMessage } from "@prometheus/protocol";
import { defineMessages, useT } from "../lib/i18n.ts";
import { imagesOf } from "../lib/images.ts";
import { prometheusUI } from "../lib/plugins-ui.ts";
import { openFile, pluginActive, type ToolRun, useStore } from "../lib/store.ts";
import { ImageStrip } from "./ImageStrip.tsx";
import { Collapse } from "./ui.tsx";

const M = defineMessages({
	zh: {
		arguments: "输入参数",
		output: "执行输出",
		copy: "复制",
		copied: "已复制",
		lines: "行",
	},
	en: {
		arguments: "Arguments",
		output: "Output",
		copy: "Copy",
		copied: "Copied",
		lines: "lines",
	},
});

export const ToolClusterContext = createContext<{
	expandAll: boolean | null;
}>({ expandAll: null });

export function ToolIcon({ name, className }: { name?: string; className?: string }) {
	const n = (name ?? "").toLowerCase();
	if (n.includes("bash") || n.includes("exec") || n.includes("shell") || n.includes("cmd") || n.includes("terminal")) {
		return <Terminal className={className} />;
	}
	if (
		n.includes("read") ||
		n.includes("write") ||
		n.includes("replace") ||
		n.includes("insert") ||
		n.includes("edit") ||
		n.includes("file") ||
		n.includes("patch")
	) {
		return <FileCode className={className} />;
	}
	if (n.includes("grep") || n.includes("search") || n.includes("find")) {
		return <Search className={className} />;
	}
	if (n.includes("fetch") || n.includes("web") || n.includes("curl") || n.includes("http") || n.includes("url")) {
		return <Globe className={className} />;
	}
	if (n.includes("git")) {
		return <GitBranch className={className} />;
	}
	return <Wrench className={className} />;
}

export function resultText(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	const v = value as { content?: { type: string; text?: string }[]; preview?: string };
	if (Array.isArray(v.content)) return v.content.map((c) => c.text ?? `[${c.type}]`).join("\n");
	if (typeof v.preview === "string") return `${v.preview}\n…（已截断）`;
	return JSON.stringify(value, null, 2);
}

export function argSummary(name: string, args: Record<string, unknown> | undefined): string {
	if (!args) return "";
	const key = ["command", "path", "file_path", "pattern", "query", "url"].find((k) => typeof args[k] === "string");
	const raw = key ? String(args[key]) : JSON.stringify(args);
	return raw.length > 90 ? `${raw.slice(0, 90)}…` : raw;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={async (e) => {
				e.stopPropagation();
				await navigator.clipboard.writeText(text);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
			className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200"
			title={copied ? "已复制" : "复制"}
		>
			{copied ? <Check className="size-3 text-moss-400" /> : <Copy className="size-3" />}
			{label && <span>{copied ? "已复制" : label}</span>}
		</button>
	);
}

export function ToolCard({ call, run, result }: { call: ToolCallContent; run?: ToolRun; result?: ToolResultMessage }) {
	const t = useT(M);
	const cluster = useContext(ToolClusterContext);
	const CustomRenderer = prometheusUI.getToolRenderer(call.name);
	if (CustomRenderer) {
		return <CustomRenderer call={call} run={run} result={result} />;
	}

	const status = run?.status ?? (result ? (result.isError ? "error" : "done") : "running");
	const [open, setOpen] = useState(status === "error");

	useEffect(() => {
		if (cluster.expandAll !== null) {
			setOpen(cluster.expandAll);
		}
	}, [cluster.expandAll]);

	useEffect(() => {
		if (status === "error") {
			setOpen(true);
		}
	}, [status]);

	const output = result ? resultText(result) : resultText(run?.result ?? run?.partial);
	const pictures = result ? imagesOf(result) : imagesOf(run?.result ?? run?.partial);
	const viewer = useStore((s) => pluginActive(s.plugins, "workbench"));
	const cwd = useStore((s) => s.session?.cwd ?? "");
	const filePath = ["read", "write", "edit", "replace"].includes(call.name) && typeof call.arguments?.path === "string" ? call.arguments.path : undefined;

	return (
		<div className={clsx("overflow-hidden rounded-xl border bg-ink-900/70 transition-all", status === "error" ? "border-rose-400/40 bg-rose-400/5" : "border-ink-800")}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className={clsx(
					"flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-ink-850/50",
					open && "bg-ink-850/30"
				)}
			>
				<span
					className={clsx(
						"grid size-6 shrink-0 place-items-center rounded-md",
						status === "running" && "bg-ember-500/15 text-ember-300",
						status === "done" && "bg-moss-400/12 text-moss-400",
						status === "error" && "bg-rose-400/15 text-rose-400",
					)}
				>
					{status === "running" ? <LoaderCircle className="size-3.5 animate-spin" /> : status === "error" ? <CircleAlert className="size-3.5" /> : <Check className="size-3.5" />}
				</span>
				<ToolIcon name={call.name} className="size-3.5 shrink-0 text-ink-400" />
				<span className="shrink-0 font-mono text-[13px] font-medium text-ink-100">{call.name || run?.toolName}</span>
				<span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-500">{argSummary(call.name, call.arguments)}</span>
				{viewer && filePath && (
					<span
						role="button"
						tabIndex={0}
						onClick={(e) => {
							e.stopPropagation();
							openFile(filePath, cwd);
						}}
						onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), openFile(filePath, cwd))}
						className="grid size-5 shrink-0 place-items-center rounded text-ink-400 transition-colors hover:bg-ink-800 hover:text-ember-300"
						title="View file"
					>
						<Eye className="size-3.5" />
					</span>
				)}
				{run?.durationMs !== undefined && <span className="shrink-0 font-mono text-[11px] text-ink-600">{(run.durationMs / 1000).toFixed(1)}s</span>}
				{open ? <ChevronDown className="size-3.5 shrink-0 text-ink-500" /> : <ChevronRight className="size-3.5 shrink-0 text-ink-500" />}
			</button>
			<Collapse open={open}>
				<div className="space-y-3 border-t border-ink-800 px-3 py-3">
					<div>
						<div className="mb-1 flex items-center justify-between text-[11px] text-ink-500">
							<span className="font-medium">{t("arguments")}</span>
							<CopyBtn text={JSON.stringify(call.arguments, null, 2)} label={t("copy")} />
						</div>
						<pre className="max-h-[35dvh] overflow-auto rounded-lg border border-ink-800 bg-ink-950 p-2.5 font-mono text-xs leading-relaxed text-ink-200 md:max-h-48">{JSON.stringify(call.arguments, null, 2)}</pre>
					</div>
					{output && (
						<div>
							<div className="mb-1 flex items-center justify-between text-[11px] text-ink-500">
								<div className="flex items-center gap-2">
									<span className="font-medium">{t("output")}</span>
									<span className="font-mono text-[10px] text-ink-600">
										{output.split("\n").length} {t("lines")} · {formatBytes(output.length)}
									</span>
								</div>
								<CopyBtn text={output} label={t("copy")} />
							</div>
							<pre
								className={clsx(
									"max-h-[45dvh] overflow-auto rounded-lg p-2.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap md:max-h-80",
									status === "error" ? "border border-rose-400/35 bg-rose-400/8 text-rose-400 font-medium" : "border border-ink-800 bg-ink-950 text-ink-200"
								)}
							>
								{output}
							</pre>
						</div>
					)}
					<ImageStrip images={pictures} />
				</div>
			</Collapse>
		</div>
	);
}
