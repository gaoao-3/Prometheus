import type { ImageContent } from "@prometheus/protocol";
import { ImageStrip } from "./ImageStrip.tsx";

/** Render user bubble text: preserves whitespace, wraps unbreakable words, and renders URLs as clickable links. */
export function renderUserText(text: string) {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const parts = text.split(urlRegex);
	if (parts.length === 1) return text;
	return parts.map((part, i) => {
		if (urlRegex.test(part)) {
			// Strip trailing punctuation that often attaches to URLs in chat (like Chinese commas/periods/brackets)
			const trailingPunctMatch = part.match(/[，。！？；：、）》」』]+$/);
			const cleanUrl = trailingPunctMatch ? part.slice(0, -trailingPunctMatch[0].length) : part;
			const trailingPunct = trailingPunctMatch ? trailingPunctMatch[0] : "";
			return (
				<span key={i} className="inline">
					<a
						href={cleanUrl}
						target="_blank"
						rel="noreferrer noopener"
						className="inline-block max-w-full truncate align-bottom font-mono text-[13.5px] text-ember-300 underline decoration-ember-500/40 underline-offset-2 transition-colors hover:text-ember-200 hover:decoration-ember-400"
						onClick={(e) => e.stopPropagation()}
					>
						{cleanUrl}
					</a>
					{trailingPunct}
				</span>
			);
		}
		return part;
	});
}

/** The bubble of a sent message: pictures above the words, either part optional. */
export function UserBubble({ text, images }: { text: string; images: ImageContent[] }) {
	return (
		<div className="flex min-w-0 max-w-[85%] flex-col items-end gap-2 md:max-w-[78%]">
			<ImageStrip images={images} align="end" />
			{text && (
				<div className="min-w-0 max-w-full rounded-2xl rounded-br-xs border border-ember-500/20 bg-gradient-to-b from-ink-800 to-ink-850 px-4 py-2.5 text-[15px] leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap text-ink-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:px-4.5 md:py-3">
					{renderUserText(text)}
				</div>
			)}
		</div>
	);
}
