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
	allTools: ReadonlyArray<
		AnyTool | { name: string; description: string; inputSchema?: unknown; parameters?: unknown }
	>;
};

type ChatRouteHandlerBaseOptions = {
	serverTools?: readonly AnyTool[];
	onRequest?: (context: ChatRouteHandlerContext) => void;
};

export type CreateChatRouteHandlerOptions = ChatRouteHandlerBaseOptions &
	(
		| {
				adapter: AnyTextAdapter;
				createStream?: never;
		  }
		| {
				adapter?: never;
				createStream: (context: ChatRouteHandlerContext) => AsyncIterable<StreamChunk>;
		  }
	);

export type ChatRouteHandler = (event: { request: Request }) => Promise<Response>;

function buildHandlerContext(
	params: Awaited<ReturnType<typeof chatParamsFromRequest>>,
	allTools: ChatRouteHandlerContext["allTools"]
): ChatRouteHandlerContext {
	return {
		...params,
		clientTools: params.tools,
		allTools
	};
}

export function createChatRouteHandler(options: CreateChatRouteHandlerOptions): ChatRouteHandler {
	if (!options.adapter && !options.createStream) {
		throw new Error("createChatRouteHandler requires either adapter or createStream.");
	}

	return async ({ request }) => {
		try {
			const params = await chatParamsFromRequest(request);
			const allTools = mergeAgentTools(options.serverTools ?? [], params.tools);
			const context = buildHandlerContext(params, allTools as ChatRouteHandlerContext["allTools"]);

			options.onRequest?.(context);

			const stream =
				options.createStream?.(context) ??
				chat({
					adapter: options.adapter!,
					messages: params.messages,
					tools: allTools,
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
