"use client";

import { useEffect, useState } from "react";
import { SettingsGroup } from "./controls.tsx";

/** Settings → Agent → Learner notes: the persistent note the agents keep on
 *  what the learner struggles with, is improving at, and holds solidly.
 *  Same quiet editor shape as the prompt overrides. */
export function LearnerNotesGroup() {
	const [saved, setSaved] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/settings/learner-notes")
			.then((res) => (res.ok ? res.json() : { text: "" }))
			.then((body: { text?: string }) => { setSaved(body.text ?? ""); setDraft(body.text ?? ""); })
			.catch(() => setSaved(""));
	}, []);

	async function save(text: string) {
		setStatus(null);
		const res = await fetch("/api/settings/learner-notes", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ text }),
		});
		if (!res.ok) {
			setStatus(`Save failed: ${(await res.json().catch(() => ({}))).error ?? res.status}`);
			return;
		}
		const body = (await res.json()) as { text: string };
		setSaved(body.text);
		setDraft(body.text);
		setStatus(text.trim() ? "Saved" : "Cleared");
	}

	const dirty = saved !== null && draft !== saved;
	return (
		<SettingsGroup label="Learner notes" testid="group-learner-notes">
			<p className="text-xs text-muted-foreground/70">
				What sessions have noticed you struggle with, are improving at, and now hold solidly. Every new session reads
				this note and updates it as you learn. Edit it to correct anything.
			</p>
			{saved === null ? (
				<p className="text-xs text-muted-foreground/70">Loading notes…</p>
			) : (
				<>
					<textarea
						value={draft}
						onChange={(e) => { setDraft(e.target.value); setStatus(null); }}
						aria-label="Learner notes"
						placeholder="No notes yet. They appear here after your first sessions."
						data-testid="learner-notes-text"
						className="h-40 w-full resize-y rounded-sm border border-border bg-background p-2 font-ui text-xs text-foreground outline-none"
					/>
					<div className="flex items-center gap-3">
						<button
							type="button"
							disabled={!dirty}
							onClick={() => void save(draft)}
							className={
								dirty
									? "text-xs text-foreground underline-offset-2 hover:underline"
									: "cursor-not-allowed text-xs text-muted-foreground/40 underline-offset-2"
							}
						>
							Save
						</button>
						{saved && (
							<button
								type="button"
								onClick={() => void save("")}
								className="text-xs text-muted-foreground/70 underline-offset-2 hover:text-red-500 hover:underline"
							>
								Clear
							</button>
						)}
						{status && <p className="text-xs text-muted-foreground/70" data-testid="learner-notes-status">{status}</p>}
					</div>
				</>
			)}
		</SettingsGroup>
	);
}
