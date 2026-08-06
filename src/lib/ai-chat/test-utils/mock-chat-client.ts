import type { UIMessage } from "@tanstack/ai-client";
import { vi } from "vitest";

export type MockChatClientOptions = {
	threadId?: string;
	onFinish?: () => void;
	initialMessages?: UIMessage[];
};

export type MockChatClient = {
	messages: UIMessage[];
	stop: ReturnType<typeof vi.fn>;
	dispose: ReturnType<typeof vi.fn>;
	triggerFinish: () => void;
	lastOptions: MockChatClientOptions;
};

export function createMockChatClient(options: MockChatClientOptions = {}): MockChatClient {
	const client: MockChatClient = {
		messages: options.initialMessages ?? [],
		stop: vi.fn(),
		dispose: vi.fn(),
		triggerFinish: () => {
			options.onFinish?.();
		},
		lastOptions: options
	};

	return client;
}

export async function flushAsyncWork(rounds = 4) {
	for (let index = 0; index < rounds; index += 1) {
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
}
