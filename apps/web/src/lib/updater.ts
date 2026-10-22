import type { Update } from "@tauri-apps/plugin-updater";
import { create } from "zustand";
import { isAndroid, isDesktopShell, isTauri, localSupported } from "./backend.ts";
import { isNewer } from "./version.ts";

export type UpdatePhase = "idle" | "checking" | "uptodate" | "available" | "upstream_available" | "installing" | "error";

interface UpdaterState {
	phase: UpdatePhase;
	version: string | null;
	notes: string | null;
	error: string | null;
	/** The prompt dialog is hidden once dismissed; the settings button can reopen it. */
	dismissed: boolean;
	/** Detected upstream release (Mouseww/Prometheus) */
	upstreamVersion: string | null;
	upstreamUrl: string | null;
	upstreamNotes: string | null;
}

export const useUpdater = create<UpdaterState>(() => ({
	phase: "idle",
	version: null,
	notes: null,
	error: null,
	dismissed: false,
	upstreamVersion: null,
	upstreamUrl: null,
	upstreamNotes: null,
}));

let pending: Update | null = null;
/** Android: where the new APK is downloaded from (the system installer takes over from there). */
let apkUrl: string | null = null;

const CUSTOM_RELEASES_API = "https://api.github.com/repos/gaoao-3/Prometheus/releases/latest";
const UPSTREAM_RELEASES_API = "https://api.github.com/repos/Mouseww/Prometheus/releases/latest";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Desktop uses the signed Tauri updater; Android (no such plugin) installs the APK from the release page. */
export async function updaterSupported(): Promise<boolean> {
	return (isDesktopShell() && (await localSupported())) || (isTauri() && isAndroid());
}

async function fetchRelease(url: string) {
	try {
		const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
		if (!res.ok) return null;
		return (await res.json()) as { tag_name?: string; body?: string; html_url?: string; assets?: { name: string; browser_download_url: string }[] };
	} catch {
		return null;
	}
}

async function checkAndroid(silent: boolean): Promise<void> {
	useUpdater.setState({ phase: "checking", error: null });
	try {
		const [customRelease, upstreamRelease] = await Promise.all([
			fetchRelease(CUSTOM_RELEASES_API),
			fetchRelease(UPSTREAM_RELEASES_API),
		]);

		let upstreamVersion: string | null = null;
		let upstreamUrl: string | null = null;
		let upstreamNotes: string | null = null;

		if (upstreamRelease?.tag_name) {
			const uTag = upstreamRelease.tag_name;
			if (isNewer(uTag, __APP_VERSION__)) {
				upstreamVersion = uTag.replace(/^v/, "");
				upstreamUrl = upstreamRelease.html_url ?? "https://github.com/Mouseww/Prometheus/releases";
				upstreamNotes = upstreamRelease.body ?? null;
			}
		}

		const customTag = customRelease?.tag_name ?? "";
		const customApk = customRelease?.assets?.find((a) => /android.*\.apk$/i.test(a.name));
		const customIsNewer = customTag && customApk && isNewer(customTag, __APP_VERSION__);

		if (customIsNewer && customApk) {
			apkUrl = customApk.browser_download_url;
			useUpdater.setState({
				phase: "available",
				version: customTag.replace(/^v/, ""),
				notes: customRelease?.body ?? null,
				dismissed: false,
				upstreamVersion,
				upstreamUrl,
				upstreamNotes,
			});
			return;
		}

		apkUrl = null;
		if (upstreamVersion) {
			useUpdater.setState({
				phase: "upstream_available",
				version: null,
				notes: null,
				dismissed: false,
				upstreamVersion,
				upstreamUrl,
				upstreamNotes,
			});
			return;
		}

		useUpdater.setState({ phase: silent ? "idle" : "uptodate", upstreamVersion: null, upstreamUrl: null, upstreamNotes: null });
	} catch (e) {
		useUpdater.setState(silent ? { phase: "idle" } : { phase: "error", error: errText(e) });
	}
}

/** `silent` checks (startup) never surface "up to date" or errors. */
export async function checkForUpdate(silent = false): Promise<void> {
	const { phase } = useUpdater.getState();
	if (phase === "checking" || phase === "installing" || !(await updaterSupported())) return;
	if (isAndroid()) return checkAndroid(silent);

	useUpdater.setState({ phase: "checking", error: null });
	try {
		// Concurrently check upstream release info for desktop too
		const upstreamPromise = fetchRelease(UPSTREAM_RELEASES_API);
		const { check } = await import("@tauri-apps/plugin-updater");
		const [update, upstreamRelease] = await Promise.all([check(), upstreamPromise]);

		let upstreamVersion: string | null = null;
		let upstreamUrl: string | null = null;
		let upstreamNotes: string | null = null;

		if (upstreamRelease?.tag_name && isNewer(upstreamRelease.tag_name, __APP_VERSION__)) {
			upstreamVersion = upstreamRelease.tag_name.replace(/^v/, "");
			upstreamUrl = upstreamRelease.html_url ?? "https://github.com/Mouseww/Prometheus/releases";
			upstreamNotes = upstreamRelease.body ?? null;
		}

		if (!update) {
			pending = null;
			if (upstreamVersion) {
				useUpdater.setState({
					phase: "upstream_available",
					version: null,
					notes: null,
					dismissed: false,
					upstreamVersion,
					upstreamUrl,
					upstreamNotes,
				});
				return;
			}
			useUpdater.setState({ phase: silent ? "idle" : "uptodate", upstreamVersion: null, upstreamUrl: null, upstreamNotes: null });
			return;
		}

		pending = update;
		useUpdater.setState({
			phase: "available",
			version: update.version,
			notes: update.body ?? null,
			dismissed: false,
			upstreamVersion,
			upstreamUrl,
			upstreamNotes,
		});
	} catch (e) {
		useUpdater.setState(silent ? { phase: "idle" } : { phase: "error", error: errText(e) });
	}
}

export function dismissUpdate(): void {
	useUpdater.setState({ dismissed: true });
}

export function showUpdate(): void {
	useUpdater.setState({ dismissed: false });
}

/** Hands the APK link to the system, which downloads it and offers the install; the dialog stays so the user can retry. */
async function installAndroid(): Promise<void> {
	if (!apkUrl) return;
	try {
		const { openUrl } = await import("@tauri-apps/plugin-opener");
		await openUrl(apkUrl);
	} catch (e) {
		useUpdater.setState({ phase: "error", error: errText(e), dismissed: false });
	}
}

/** Downloads first, then stops the local server (its files are locked on Windows) and installs. */
export async function installUpdate(): Promise<void> {
	if (isAndroid()) return installAndroid();
	const update = pending;
	if (!update) return;
	useUpdater.setState({ phase: "installing", error: null });
	try {
		const { invoke } = await import("@tauri-apps/api/core");
		await update.download();
		await invoke("stop_local_backend");
		await update.install();
		await invoke("relaunch_app");
	} catch (e) {
		useUpdater.setState({ phase: "error", error: errText(e), dismissed: false });
	}
}
