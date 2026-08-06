import type { UIMessage } from "@tanstack/ai-client";
import { fetchServerSentEvents } from "@tanstack/ai-client";
import { describe, expect, it, vi } from "vitest";

describe("AG-UI request contract", () => {
	it("includes client tools in the RunAgentInput body", async () => {
		const fetchMock = vi.fn(async () =>
			new Response("data: {}\n\n", {
				status: 200,
				headers: { "Content-Type": "text/event-stream" }
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const messages: UIMessage[] = [
			{ id: "m1", role: "user", parts: [{ type: "text", content: "Hi" }] }
		];
		const connection = fetchServerSentEvents("/api/chat");
		const iterator = connection.connect!(
			messages,
			undefined,
			new AbortController().signal,
			{
				threadId: "thread-1",
				runId: "run-1",
				clientTools: [
					{
						name: "scroll_to_top",
						description: "Scroll the page to the top",
						parameters: { type: "object", properties: {} }
					}
				]
			}
		);

		for await (const _chunk of iterator) {
			break;
		}
		vi.unstubAllGlobals();

		expect(fetchMock).toHaveBeenCalled();
		const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		const body = JSON.parse(String(call[1].body));

		expect(body).toMatchObject({
			threadId: "thread-1",
			runId: "run-1",
			tools: [
				{
					name: "scroll_to_top",
					description: "Scroll the page to the top",
					parameters: { type: "object", properties: {} }
				}
			],
			messages: expect.any(Array),
			state: {},
			context: [],
			forwardedProps: {}
		});
	});
});
