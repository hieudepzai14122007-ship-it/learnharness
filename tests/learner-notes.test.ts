/**
 * Learner notes: the persistent "struggling / improving / solid" note.
 * The tool rewrites one file under the data root; real prober/teacher/practice
 * registries carry the tool and compose the current note into the system
 * prompt; bare and explicit registries carry neither.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { createFauxCore } from "@earendil-works/pi-ai";

const TMP_DATA = mkdtempSync(path.join(os.tmpdir(), "lh-learner-notes-"));
process.env.LH_DATA_DIR = TMP_DATA;

const { LEARNER_NOTES_TOOL, learnerNotesPrompt, learnerNotesTool, readLearnerNotes, writeLearnerNotes } =
	await import("../src/agent/tools/learner-notes.ts");
const { createProberAgent, createTeacherAgent, createPracticeAgent } = await import("../src/agent/teacher-agent.ts");
const { chatStore } = await import("../src/store/chats.ts");
const { jobStore } = await import("../src/store/jobs.ts");

function fauxEngine() {
	const faux = createFauxCore({});
	return { model: faux.getModel(), streamFn: faux.streamSimple };
}

describe("learner notes", () => {
	it("the tool replaces the note file and the reader returns it", async () => {
		writeLearnerNotes("old");
		const result = await learnerNotesTool.execute("call-1", { notes: "## Struggling with\n- chain rule (2026-11-07)\n" });
		assert.equal(JSON.stringify(result).includes("Learner notes saved."), true);
		assert.equal(readFileSync(path.join(TMP_DATA, "learner-notes.md"), "utf8"), "## Struggling with\n- chain rule (2026-11-07)\n");
		assert.equal(readLearnerNotes(), "## Struggling with\n- chain rule (2026-11-07)");
	});

	it("an empty write clears the note and the prompt says so", () => {
		writeLearnerNotes("   ");
		assert.equal(readLearnerNotes(), "");
		assert.match(learnerNotesPrompt(), /No notes are recorded yet\./);
	});

	it("real registries carry the tool and compose the current note; bare and explicit ones do not", () => {
		writeLearnerNotes("## Improving\n- limits (2026-11-07)");
		const chatId = chatStore.createChat("Learner notes test").id;
		const engine = fauxEngine();
		const agents = [
			createProberAgent({ chatId, chatStore, jobStore, deliver: () => {}, spawn: () => {} }, { engine }),
			createTeacherAgent({ chatId, chatStore, jobStore, spawn: () => {} }, { engine }),
			createPracticeAgent({ chatId, chatStore }, { engine }),
		];
		for (const agent of agents) {
			assert.ok(agent.state.tools.some((tool) => tool.name === LEARNER_NOTES_TOOL));
			assert.ok(agent.state.systemPrompt.includes("- limits (2026-11-07)"));
		}
		for (const agent of [createTeacherAgent(undefined, { engine }), createTeacherAgent(undefined, { engine, tools: {} })]) {
			assert.ok(!agent.state.tools.some((tool) => tool.name === LEARNER_NOTES_TOOL));
			assert.ok(!agent.state.systemPrompt.includes("# Learner notes"));
		}
	});
});
