/**
 * GET/PUT /api/settings/learner-notes — the persistent learner note that
 * prober, teacher and practice agents read and rewrite
 * (agent/tools/learner-notes.ts). The learner can review and correct it here.
 *
 *   GET → {text}
 *   PUT body {text} → replaces the note (empty clears it). 200 {text}.
 */

import { LEARNER_NOTES_MAX_CHARS, readLearnerNotes, writeLearnerNotes } from "@/src/server";

export const dynamic = "force-dynamic";

export async function GET() {
	return Response.json({ text: readLearnerNotes() });
}

export async function PUT(request: Request) {
	const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
	if (!body || typeof body.text !== "string") {
		return Response.json({ error: "body must be {text: string}" }, { status: 400 });
	}
	if (body.text.length > LEARNER_NOTES_MAX_CHARS) {
		return Response.json({ error: `notes are limited to ${LEARNER_NOTES_MAX_CHARS} characters` }, { status: 400 });
	}
	writeLearnerNotes(body.text);
	return Response.json({ text: readLearnerNotes() });
}
