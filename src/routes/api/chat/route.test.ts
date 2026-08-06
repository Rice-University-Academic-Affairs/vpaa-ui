import { describe, expect, it } from "vitest";
import { POST } from "./+server.js";

function createChatRequest(body: Record<string, unknown>) {
	return new Request("http://localhost/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body)
	});
}

async function readAssistantText(response: Response) {
	const payload = await response.text();
	const deltas: string[] = [];

	for (const line of payload.split("\n")) {
		if (!line.startsWith("data: ")) continue;
		const data = line.slice("data: ".length);
		if (!data || data === "[DONE]") continue;

		const chunk = JSON.parse(data) as { type?: string; delta?: string };
		if (chunk.type === "TEXT_MESSAGE_CONTENT" && chunk.delta) {
			deltas.push(chunk.delta);
		}
	}

	return deltas.join("");
}

function validBody(overrides: Record<string, unknown> = {}) {
	return {
		messages: [{ id: "m1", role: "user", content: "Faculty trends" }],
		threadId: "thread-1",
		runId: "run-1",
		tools: [],
		state: {},
		context: [],
		forwardedProps: {},
		...overrides
	};
}

describe("chat route", () => {
	it("exports a POST handler", () => {
		expect(POST).toBeTypeOf("function");
	});

	it("streams a demo response for a normal chat request", async () => {
		const response = await POST({ request: createChatRequest(validBody()) });

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/event-stream");

		const body = await readAssistantText(response);
		expect(body).toContain("Faculty trends");
	});

	it("passes resume payloads through to the mock stream", async () => {
		const response = await POST({
			request: createChatRequest(
				validBody({
					resume: [
						{
							interruptId: "client_tool_123",
							status: "resolved",
							payload: { scrolled: true }
						}
					]
				})
			)
		});

		const body = await readAssistantText(response);
		expect(body).toBe("Client tool completed.");
	});
});
