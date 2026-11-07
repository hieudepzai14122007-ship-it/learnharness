import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { PATHS } from "../../../config.ts";
import { LEARNER_NOTES_TOOL } from "../../core/native-messages.ts";
import { serverExecute } from "../tool-execute.ts";

export { LEARNER_NOTES_TOOL };

/**
 * Learner notes: one app-wide, human-readable Markdown note on what the
 * learner struggles with, is improving at, and now holds solidly. Unlike the
 * graph (world-facing propositions, no mastery claims), this is explicitly
 * ABOUT the learner — the place the session's diagnosis survives the session.
 *
 * The model rewrites the note whole; every newly built prober/teacher/practice
 * agent whose registry carries the tool reads it in its system prompt (the
 * conditional-inclusion rule: no tool, no instructions). The learner can read
 * and edit it in Settings → Agent → Learner notes.
 * ponytail: one global file, last write wins — split per topic if it outgrows LEARNER_NOTES_MAX_CHARS.
 */
export const LEARNER_NOTES_MAX_CHARS = 6000;

const notesFile = () => path.join(PATHS.data, "learner-notes.md");

export function readLearnerNotes(): string {
	try { return readFileSync(notesFile(), "utf8").trim(); } catch { return ""; }
}

export function writeLearnerNotes(text: string): void {
	mkdirSync(PATHS.data, { recursive: true });
	const trimmed = text.trim();
	writeFileSync(notesFile(), trimmed ? `${trimmed}\n` : "");
}

/** The system-prompt block: usage doctrine plus the current notes. */
export function learnerNotesPrompt(notes = readLearnerNotes()): string {
	return [
		"# Learner notes",
		"These notes persist across sessions. Use them to target known weak spots, revisit them when relevant, " +
		"and avoid re-teaching what is recorded as solid. They describe this learner, not the subject: verify any claim " +
		"against the learner's current answers before relying on it.",
		`When this session reveals a real gap or misconception, or confirms that a recorded one is resolved, call ` +
		`\`${LEARNER_NOTES_TOOL}\` with the complete updated notes. The call replaces the whole note, so keep entries ` +
		`about other topics. Use three sections — \`## Struggling with\`, \`## Improving\`, \`## Solid now\` — with one ` +
		`short bullet per item naming the topic, the specific confusion or skill, and the date (YYYY-MM-DD). Move items ` +
		`between sections as they change, and drop old \`Solid now\` items to stay under ${LEARNER_NOTES_MAX_CHARS} characters. ` +
		`Update at meaningful moments, not every turn, and do not mention the bookkeeping unless the learner asks.`,
		notes ? `## Current notes\n\n${notes}` : "No notes are recorded yet.",
	].join("\n\n");
}

const learnerNotesInput = Type.Object({
	notes: Type.String({
		minLength: 1,
		maxLength: LEARNER_NOTES_MAX_CHARS,
		pattern: "\\S",
		description: "The complete updated learner notes in Markdown. Replaces the previous notes.",
	}),
});

export const learnerNotesTool: AgentTool<typeof learnerNotesInput> = {
	name: LEARNER_NOTES_TOOL,
	label: LEARNER_NOTES_TOOL,
	description: "Replace the persistent learner notes (struggling with / improving / solid now) that future sessions read.",
	parameters: learnerNotesInput,
	executionMode: "sequential",
	execute: serverExecute(LEARNER_NOTES_TOOL, learnerNotesInput, ({ notes }) => {
		writeLearnerNotes(notes);
		return "Learner notes saved.";
	}),
};
