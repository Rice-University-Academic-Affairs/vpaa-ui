import { EventType, toolDefinition, type StreamChunk } from "@tanstack/ai";
import { describe, expect, it, vi } from "vitest";
import {
	createChatRouteHandler,
	type ChatRouteHandlerContext
} from "./create-chat-route-handler.js";

const chatMock = vi.hoisted(() => vi.fn());
const chatParamsFromRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/ai", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/ai")>();
	return {
		...actual,
		chat: (...args: unknown[]) => chatMock(...args),
		chatParamsFromRequest: (...args: unknown[]) => chatParamsFromRequestMock(...args)
	};
});

const serverTool = toolDefinition({
	name: "server_echo",
	description: "Echo on the server",
	inputSchema: { type: "object", properties: {} },
	outputSchema: {
		type: "object",
		properties: { echoed: { type: "boolean" } },
		required: ["echoed"]
	}
}).server(() => ({ echoed: true }));

function validParams(overrides: Record<string, unknown> = {}) {
	return {
		messages: [{ id: "m1", role: "user", content: "Hello" }],
		threadId: "thread-1",
		runId: "run-1",
		tools: [
			{
				name: "client_flag",
				description: "Client tool",
				parameters: { type: "object", properties: {} }
			}
		],
		forwardedProps: {},
		state: {},
		context: [],
		aguiContext: [],
		...overrides
	};
}

async function* testStream(): AsyncGenerator<StreamChunk> {
	yield { type: EventType.RUN_STARTED, runId: "run-1", threadId: "thread-1" } as StreamChunk;
	yield {
		type: EventType.RUN_FINISHED,
		runId: "run-1",
		threadId: "thread-1",
		outcome: { type: "success" }
	} as StreamChunk;
}

function createRequest(body: unknown = validParams()) {
	return new Request("http://localhost/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body)
	});
}

describe("createChatRouteHandler", () => {
	it("requires either adapter or createStream", () => {
		expect(() => createChatRouteHandler({ serverTools: [serverTool] } as never)).toThrow(
			/adapter or createStream/
		);
	});

	it("returns an SSE response from createStream", async () => {
		chatParamsFromRequestMock.mockResolvedValueOnce(validParams());

		const handler = createChatRouteHandler({
			serverTools: [serverTool],
			createStream: () => testStream()
		});

		const response = await handler({ request: createRequest() });

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/event-stream");
	});

	it("returns validation responses thrown by chatParamsFromRequest", async () => {
		chatParamsFromRequestMock.mockRejectedValueOnce(
			new Response("Invalid AG-UI request body.", { status: 400 })
		);

		const handler = createChatRouteHandler({
			serverTools: [serverTool],
			createStream: () => testStream()
		});

		const response = await handler({ request: createRequest() });

		expect(response.status).toBe(400);
		expect(await response.text()).toContain("Invalid AG-UI request body");
	});

	it("merges server and client tools into allTools before calling createStream", async () => {
		chatParamsFromRequestMock.mockResolvedValueOnce(validParams());
		const contexts: ChatRouteHandlerContext[] = [];

		const handler = createChatRouteHandler({
			serverTools: [serverTool],
			createStream: (context) => {
				contexts.push(context);
				return testStream();
			}
		});

		await handler({ request: createRequest() });

		expect(contexts[0]?.allTools.map((tool) => tool.name)).toEqual([
			"server_echo",
			"client_flag"
		]);
	});

	it("calls onRequest with clientTools and allTools", async () => {
		chatParamsFromRequestMock.mockResolvedValueOnce(validParams());
		const onRequest = vi.fn();

		const handler = createChatRouteHandler({
			serverTools: [serverTool],
			onRequest,
			createStream: () => testStream()
		});

		await handler({ request: createRequest() });

		expect(onRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: "thread-1",
				runId: "run-1",
				clientTools: [
					expect.objectContaining({
						name: "client_flag"
					})
				],
				allTools: expect.arrayContaining([
					expect.objectContaining({ name: "server_echo" }),
					expect.objectContaining({ name: "client_flag" })
				])
			})
		);
	});

	it("delegates to chat() when an adapter is provided", async () => {
		chatParamsFromRequestMock.mockResolvedValueOnce(validParams());
		chatMock.mockReturnValueOnce(testStream());

		const adapter = { name: "test-adapter" };
		const handler = createChatRouteHandler({
			serverTools: [serverTool],
			adapter: adapter as never
		});

		await handler({ request: createRequest() });

		expect(chatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				adapter,
				threadId: "thread-1",
				runId: "run-1",
				tools: expect.arrayContaining([
					expect.objectContaining({ name: "server_echo" }),
					expect.objectContaining({ name: "client_flag" })
				])
			})
		);
	});
});
