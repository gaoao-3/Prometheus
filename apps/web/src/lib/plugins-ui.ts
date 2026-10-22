import type { ComponentType } from "react";
import type { PluginInfo, ToolCallContent, ToolResultMessage } from "@prometheus/protocol";
import type { ToolRun } from "./store.ts";

export interface ToolCardProps {
	call: ToolCallContent;
	run?: ToolRun;
	result?: ToolResultMessage;
}

export interface ComposerActionProps {
	disabled?: boolean;
}

export interface PrometheusUI {
	/** Register a custom renderer component for a tool (e.g. "git_diff", "audio_player") */
	registerToolRenderer(toolName: string, component: ComponentType<ToolCardProps>): void;
	/** Register custom action buttons in the Composer toolbar */
	registerComposerAction(id: string, component: ComponentType<ComposerActionProps>): void;
	/** Get registered tool renderer */
	getToolRenderer(toolName: string): ComponentType<ToolCardProps> | undefined;
	/** Get all registered composer actions */
	getComposerActions(): { id: string; component: ComponentType<ComposerActionProps> }[];
}

const toolRenderers = new Map<string, ComponentType<ToolCardProps>>();
const composerActions = new Map<string, ComponentType<ComposerActionProps>>();
const loadedScripts = new Set<string>();

export const prometheusUI: PrometheusUI = {
	registerToolRenderer(toolName, component) {
		toolRenderers.set(toolName, component);
	},
	registerComposerAction(id, component) {
		composerActions.set(id, component);
	},
	getToolRenderer(toolName) {
		return toolRenderers.get(toolName);
	},
	getComposerActions() {
		return Array.from(composerActions.entries()).map(([id, component]) => ({ id, component }));
	},
};

// Expose globally so external scripts loaded via ESM can access it
if (typeof window !== "undefined") {
	(window as unknown as { prometheusUI: PrometheusUI }).prometheusUI = prometheusUI;
}

/**
 * Synchronize plugin UI assets (custom stylesheets and ESM scripts) based on loaded plugins.
 */
export async function syncPluginAssets(plugins: PluginInfo[], httpBase: string): Promise<void> {
	if (typeof document === "undefined") return;

	for (const p of plugins) {
		if (p.status !== "loaded") continue;

		// 1. Mount custom CSS if provided
		if (p.style) {
			const linkId = `prometheus-plugin-style-${p.name}`;
			if (!document.getElementById(linkId)) {
				const link = document.createElement("link");
				link.id = linkId;
				link.rel = "stylesheet";
				link.href = `${httpBase}${p.style}`;
				document.head.appendChild(link);
			}
		}

		// 2. Mount custom ESM UI script if provided
		if (p.ui) {
			const scriptKey = `${p.name}:${p.ui}`;
			if (!loadedScripts.has(scriptKey)) {
				loadedScripts.add(scriptKey);
				const scriptUrl = `${httpBase}${p.ui}`;
				try {
					const mod = (await import(/* @vite-ignore */ scriptUrl)) as { default?: (ui: PrometheusUI) => void };
					if (typeof mod.default === "function") {
						mod.default(prometheusUI);
					}
				} catch (err) {
					console.warn(`[PluginUI] Failed to load UI script for ${p.name}:`, err);
				}
			}
		}
	}
}
