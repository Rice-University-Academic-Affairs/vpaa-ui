import { flushAsyncWork } from "./mock-chat-client.js";

export async function waitFor(
	predicate: () => boolean,
	options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
	const timeout = options.timeout ?? 10_000;
	const interval = options.interval ?? 25;
	const start = Date.now();

	while (!predicate()) {
		if (Date.now() - start > timeout) {
			throw new Error(options.message ?? "Timed out waiting for condition");
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
}

export async function waitForChatIdle(chat: { isLoading: boolean }) {
	await waitFor(() => !chat.isLoading, { message: "Chat did not finish loading" });
	await flushAsyncWork(12);
}
