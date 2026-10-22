import { ExternalLink } from "lucide-react";
import { isAndroid } from "../lib/backend.ts";
import { defineMessages, useT } from "../lib/i18n.ts";
import { openExternal } from "../lib/links.ts";
import { dismissUpdate, installUpdate, useUpdater } from "../lib/updater.ts";
import { Button } from "./ui.tsx";

const M = defineMessages({
	zh: {
		heading: "发现新版本",
		upstreamHeading: "官方上游动态",
		title: "Prometheus {v} 可用",
		upstreamTitle: "官方上游发布了 v{v}",
		upstreamNotice: "当前定制版本为 v{cur}。官方仓库已发布新版本，你可以查看更新日志或通过流水线同步构建。",
		upstreamHasUpdate: "官方上游已同步更新至 v{v}",
		viewUpstream: "查看官方更新",
		hint: "更新会重启应用，并同时更新、重启本机服务端；进行中的任务将被中断。",
		remoteHint: "仅更新本客户端并重启应用；当前连接的远程服务器不会被更新，需由其管理员自行升级。",
		androidHint: "将打开下载链接，下载完成后点击安装即可覆盖更新（数据保留）。若提示「签名不一致」，需要先卸载旧版本，本机模式的数据会丢失。",
		later: "稍后",
		install: "立即更新",
		downloadApk: "下载安装包",
		installing: "正在更新…",
		failed: "更新失败：",
	},
	en: {
		heading: "Update available",
		upstreamHeading: "Upstream Release",
		title: "Prometheus {v} is available",
		upstreamTitle: "Upstream released v{v}",
		upstreamNotice: "Your custom build is v{cur}. A newer upstream version is available. You can view release notes or run the workflow to rebuild.",
		upstreamHasUpdate: "Upstream has updated to v{v}",
		viewUpstream: "View Upstream",
		hint: "Updating restarts the app and updates and restarts the local server; running tasks will be interrupted.",
		remoteHint: "Only this client is updated and restarted; the connected remote server is not updated and must be upgraded by its administrator.",
		androidHint: "Opens the download link; when it finishes, tap the file to install over the current app (your data is kept). If Android says the signature does not match, uninstall the old version first, which erases local-mode data.",
		later: "Later",
		install: "Update now",
		downloadApk: "Download package",
		installing: "Updating…",
		failed: "Update failed: ",
	},
});

/** Startup prompt shown when a newer desktop build is published; the bundled local server ships inside it. */
export function UpdateDialog({ remote = false }: { remote?: boolean }) {
	const t = useT(M);
	const { phase, version, notes, error, dismissed, upstreamVersion, upstreamUrl, upstreamNotes } = useUpdater();
	const isCustomAvailable = phase === "available" || phase === "installing" || (phase === "error" && version);
	const isUpstreamOnly = phase === "upstream_available" && Boolean(upstreamVersion);
	const open = (isCustomAvailable || isUpstreamOnly) && !dismissed;
	if (!open) return null;
	const installing = phase === "installing";

	if (isUpstreamOnly && upstreamVersion) {
		return (
			<div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-950/70 backdrop-blur-sm md:items-center md:p-4" role="dialog" aria-modal>
				<div className="max-h-[88dvh] w-full max-w-md animate-rise overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900 p-5 shadow-2xl shadow-black/60 max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0 max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
					<div className="mb-1 font-mono text-[10.5px] tracking-widest text-sky-400 uppercase">{t("upstreamHeading")}</div>
					<h2 className="font-display text-lg font-semibold">{t("upstreamTitle", { v: upstreamVersion })}</h2>
					<p className="mt-2 text-xs leading-relaxed text-ink-400">{t("upstreamNotice", { cur: __APP_VERSION__ })}</p>
					{upstreamNotes && <p className="mt-3 max-h-36 overflow-y-auto rounded-lg bg-ink-950 p-2.5 font-mono text-xs whitespace-pre-wrap text-ink-300">{upstreamNotes}</p>}
					<div className="mt-5 flex justify-end gap-2 max-md:[&>button]:flex-1 max-md:[&>button]:py-2.5">
						<Button variant="outline" onClick={dismissUpdate}>
							{t("later")}
						</Button>
						{upstreamUrl && (
							<Button variant="primary" autoFocus onClick={() => void openExternal(upstreamUrl)}>
								<span className="flex items-center gap-1.5">{t("viewUpstream")} <ExternalLink className="size-3.5" /></span>
							</Button>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-950/70 backdrop-blur-sm md:items-center md:p-4" role="dialog" aria-modal>
			<div className="max-h-[88dvh] w-full max-w-md animate-rise overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900 p-5 shadow-2xl shadow-black/60 max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0 max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
				<div className="mb-1 font-mono text-[10.5px] tracking-widest text-ember-400 uppercase">{t("heading")}</div>
				<h2 className="font-display text-lg font-semibold">{t("title", { v: version ?? "" })}</h2>
				{upstreamVersion && (
					<div className="mt-2 flex items-center justify-between rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-300">
						<span>{t("upstreamHasUpdate", { v: upstreamVersion })}</span>
						{upstreamUrl && (
							<button type="button" onClick={() => void openExternal(upstreamUrl)} className="flex items-center gap-1 underline underline-offset-2 hover:text-sky-200">
								{t("viewUpstream")} <ExternalLink className="size-3" />
							</button>
						)}
					</div>
				)}
				{notes && <p className="mt-2 max-h-40 overflow-y-auto text-sm whitespace-pre-wrap text-ink-300">{notes}</p>}
				<p className="mt-3 text-xs text-ink-500">{t(isAndroid() ? "androidHint" : remote ? "remoteHint" : "hint")}</p>
				{phase === "error" && error && <p className="mt-3 text-xs break-words text-rose-400">{t("failed") + error}</p>}
				<div className="mt-5 flex justify-end gap-2 max-md:[&>button]:flex-1 max-md:[&>button]:py-2.5">
					<Button variant="outline" disabled={installing} onClick={dismissUpdate}>
						{t("later")}
					</Button>
					<Button variant="primary" autoFocus disabled={installing} onClick={() => void installUpdate()}>
						{installing ? t("installing") : t(isAndroid() ? "downloadApk" : "install")}
					</Button>
				</div>
			</div>
		</div>
	);
}
