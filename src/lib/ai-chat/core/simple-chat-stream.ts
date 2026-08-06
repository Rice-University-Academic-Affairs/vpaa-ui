import { EventType, type StreamChunk } from "@tanstack/ai";

export async function* chunksFromText(
	text: string,
	threadId: string
): AsyncGenerator<StreamChunk> {
	const runId = crypto.randomUUID();
	const messageId = crypto.randomUUID();

	yield { type: EventType.RUN_STARTED, runId, threadId } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: text } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_END, messageId } as StreamChunk;
	yield { type: EventType.RUN_FINISHED, runId, threadId } as StreamChunk;
}

export async function* chunksFromTextStream(
	source: AsyncIterable<string>,
	threadId: string,
	signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
	const runId = crypto.randomUUID();
	const messageId = crypto.randomUUID();

	yield { type: EventType.RUN_STARTED, runId, threadId } as StreamChunk;
	yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" } as StreamChunk;

	for await (const delta of source) {
		if (signal?.aborted) return;
		yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta } as StreamChunk;
	}

	yield { type: EventType.TEXT_MESSAGE_END, messageId } as StreamChunk;
	yield { type: EventType.RUN_FINISHED, runId, threadId } as StreamChunk;
}

export async function* chunksFromResponseBody(
	body: ReadableStream<Uint8Array>,
	threadId: string,
	signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
	const reader = body.getReader();
	const decoder = new TextDecoder();

	async function* readText(): AsyncGenerator<string> {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			yield decoder.decode(value, { stream: true });
		}
	}

	yield* chunksFromTextStream(readText(), threadId, signal);
}
