import http from "node:http";
import { Readable } from "node:stream";
import { chatParamsFromRequestBody, mergeAgentTools, toServerSentEventsResponse } from "@tanstack/ai";
import { getDemoStatsDef } from "../../../routes/api/chat/server-tools.js";
import { createTestChatStream } from "./test-chat-stream.js";

const testServerTools = [
	getDemoStatsDef.server(() => ({
		facultyCount: 1247,
		departmentCount: 42
	}))
];

export type CapturedChatRequest = {
	threadId: string;
	runId: string;
	tools: Array<{ name: string; description: string; parameters: unknown }>;
	messages: unknown[];
	resume?: unknown;
};

export type TestChatServer = {
	url: string;
	requests: CapturedChatRequest[];
	close: () => Promise<void>;
};

function readRequestBody(request: http.IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
		request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		request.on("error", reject);
	});
}

async function writeWebResponse(nodeResponse: http.ServerResponse, webResponse: Response) {
	nodeResponse.statusCode = webResponse.status;
	webResponse.headers.forEach((value, key) => {
		nodeResponse.setHeader(key, value);
	});

	if (!webResponse.body) {
		nodeResponse.end();
		return;
	}

	await Readable.fromWeb(webResponse.body as unknown as import("node:stream/web").ReadableStream)
		.pipe(nodeResponse);
}

export async function startTestChatServer(): Promise<TestChatServer> {
	const requests: CapturedChatRequest[] = [];

	const server = http.createServer((request, response) => {
		void (async () => {
			if (request.method !== "POST") {
				response.statusCode = 405;
				response.end("Method Not Allowed");
				return;
			}

			try {
				const rawBody = await readRequestBody(request);
				const body = JSON.parse(rawBody) as unknown;
				const params = await chatParamsFromRequestBody(body);
				const tools = mergeAgentTools(testServerTools, params.tools);

				requests.push({
					threadId: params.threadId,
					runId: params.runId,
					tools: params.tools,
					messages: params.messages,
					resume: params.resume
				});

				const stream = createTestChatStream({
					messages: params.messages,
					threadId: params.threadId,
					runId: params.runId,
					tools,
					resume: params.resume
				});

				await writeWebResponse(response, toServerSentEventsResponse(stream));
			} catch (error) {
				response.statusCode = 400;
				response.setHeader("Content-Type", "application/json");
				response.end(
					JSON.stringify({
						error: error instanceof Error ? error.message : "Invalid AG-UI request"
					})
				);
			}
		})();
	});

	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => resolve());
	});

	const address = server.address();
	if (!address || typeof address === "string") {
		throw new Error("Failed to start test chat server");
	}

	return {
		url: `http://127.0.0.1:${address.port}/chat`,
		requests,
		close: () =>
			new Promise<void>((resolve, reject) => {
				server.close((error) => {
					if (error) reject(error);
					else resolve();
				});
			})
	};
}
