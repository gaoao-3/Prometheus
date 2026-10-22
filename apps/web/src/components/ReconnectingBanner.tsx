import clsx from "clsx";
import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { defineMessages, useT } from "../lib/i18n.ts";
import { useStore } from "../lib/store.ts";
import { Collapse } from "./ui.tsx";

const M = defineMessages({
	zh: {
		reconnecting: "连接中断，正在自动重连…",
		restored: "连接已恢复",
	},
	en: {
		reconnecting: "Connection lost, reconnecting…",
		restored: "Connection restored",
	},
});

export function ReconnectingBanner() {
	const t = useT(M);
	const conn = useStore((s) => s.conn);
	const [status, setStatus] = useState<"idle" | "reconnecting" | "restored">("idle");
	const wasDisconnected = useRef(false);

	useEffect(() => {
		if (conn !== "open") {
			wasDisconnected.current = true;
			setStatus("reconnecting");
			return;
		}

		// Transitioned back to open after being disconnected
		if (wasDisconnected.current) {
			wasDisconnected.current = false;
			setStatus("restored");
			const timer = setTimeout(() => {
				setStatus("idle");
			}, 1800);
			return () => clearTimeout(timer);
		}

		setStatus("idle");
	}, [conn]);

	const open = status !== "idle";

	return (
		<Collapse open={open} className="shrink-0">
			<div
				className={clsx(
					"flex items-center justify-center gap-2.5 border-b py-2 text-xs font-medium transition-colors duration-300",
					status === "reconnecting" && "border-ember-500/20 bg-gradient-to-r from-ember-500/8 via-ember-500/16 to-ember-500/8 text-ember-300",
					status === "restored" && "border-moss-500/20 bg-gradient-to-r from-moss-500/8 via-moss-500/16 to-moss-500/8 text-moss-300",
				)}
			>
				{status === "reconnecting" && (
					<>
						<span className="relative flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-ember-400 opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-ember-500" />
						</span>
						<LoaderCircle className="size-3.5 animate-spin text-ember-400" />
						<span className="tracking-wide">{t("reconnecting")}</span>
					</>
				)}
				{status === "restored" && (
					<>
						<span className="grid size-4 place-items-center rounded-full bg-moss-400/20 text-moss-300">
							<Check className="size-3" />
						</span>
						<span className="tracking-wide text-moss-200">{t("restored")}</span>
					</>
				)}
			</div>
		</Collapse>
	);
}
