import { describe, expect, it } from "vitest";
import { prometheusUI } from "../src/lib/plugins-ui.ts";

describe("prometheusUI plugin registry", () => {
	it("registers and retrieves custom tool renderers", () => {
		const DummyRenderer = () => null;
		prometheusUI.registerToolRenderer("custom_git_chart", DummyRenderer);
		expect(prometheusUI.getToolRenderer("custom_git_chart")).toBe(DummyRenderer);
		expect(prometheusUI.getToolRenderer("unknown_tool")).toBeUndefined();
	});

	it("registers and retrieves composer actions", () => {
		const DummyAction = () => null;
		prometheusUI.registerComposerAction("voice_preset", DummyAction);
		const actions = prometheusUI.getComposerActions();
		expect(actions.some((a) => a.id === "voice_preset" && a.component === DummyAction)).toBe(true);
	});
});
