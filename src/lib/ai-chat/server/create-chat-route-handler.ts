import {
	chat,
	chatParamsFromRequest,
	mergeAgentTools,
	toServerSentEventsResponse,
	type AnyTextAdapter,
	type AnyTool,
	type StreamChunk
} from "@tanstack/ai";

export type ChatRouteHandlerContext = Awaited<ReturnType<typeof chatParamsFromRequest>> & {
	clientTools: Awaited<ReturnType<typeof chatParamsFromRequest>>["tools"];
	mergedTools: ReadonlyArray<
		AnyTool | { name: string; description: string; inputSchema?: unknown; parameters?: unknown }
	>;
};

type ChatRouteHandlerBaseOptions = {
	tools?: readonly AnyTool[];
	onRequest?: (context: ChatRouteHandlerContext) => void;
};

export type CreateChatRouteHandlerOptions = ChatRouteHandlerBaseOptions &
	(
		| {
				llmAdapter: AnyTextAdapter;
				createStream?: never;
		  }
		| {
				llmAdapter?: never;
				createStream: (context: ChatRouteHandlerContext) => AsyncIterable<StreamChunk>;
		  }
	);

export type ChatRouteHandler = (event: { request: Request }) => Promise<Response>;

function buildHandlerContext(
	params: Awaited<ReturnType<typeof chatParamsFromRequest>>,
	mergedTools: ChatRouteHandlerContext["mergedTools"]
): ChatRouteHandlerContext {
	return {
		...params,
		clientTools: params.tools,
		mergedTools
	};
}

export function createChatRouteHandler(options: CreateChatRouteHandlerOptions): ChatRouteHandler {
	if (!options.llmAdapter && !options.createStream) {
		throw new Error("createChatRouteHandler requires either llmAdapter or createStream.");
	}

	return async ({ request }) => {
		try {
			const params = await chatParamsFromRequest(request);
			const mergedTools = mergeAgentTools(options.tools ?? [], params.tools);
			const context = buildHandlerContext(
				params,
				mergedTools as ChatRouteHandlerContext["mergedTools"]
			);

			options.onRequest?.(context);

			const stream =
				options.createStream?.(context) ??
				chat({
					adapter: options.llmAdapter!,
					messages: params.messages,
					tools: mergedTools,
					threadId: params.threadId,
					runId: params.runId,
					parentRunId: params.parentRunId,
					state: params.state,
					resume: params.resume
				});

			return toServerSentEventsResponse(stream);
		} catch (error) {
			if (error instanceof Response) {
				return error;
			}

			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : "An error occurred"
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" }
				}
			);
		}
	};
}
