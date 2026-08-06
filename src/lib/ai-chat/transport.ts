import {
	fetchServerSentEvents,
	type ChatPersistenceOption,
	type ConnectionAdapter
} from "@tanstack/ai-svelte";

export type AiChatTransport =
	| string
	| {
			endpoint: string;
			forwardedProps?: Record<string, unknown>;
	  }
	| {
			connection: ConnectionAdapter;
			forwardedProps?: Record<string, unknown>;
	  }
	| {
			mode: "server";
			endpoint: string;
			forwardedProps?: Record<string, unknown>;
	  };

export type ResolvedAiChatTransport = {
	connection: ConnectionAdapter;
	persistence?: ChatPersistenceOption;
	forwardedProps?: Record<string, unknown>;
};

export function resolveAiChatTransport(transport: AiChatTransport): ResolvedAiChatTransport {
	if (typeof transport === "string") {
		return { connection: fetchServerSentEvents(transport) };
	}

	if ("connection" in transport) {
		return {
			connection: transport.connection,
			forwardedProps: transport.forwardedProps
		};
	}

	if ("mode" in transport && transport.mode === "server") {
		return {
			connection: fetchServerSentEvents(transport.endpoint),
			persistence: true,
			forwardedProps: transport.forwardedProps
		};
	}

	return {
		connection: fetchServerSentEvents(transport.endpoint),
		forwardedProps: transport.forwardedProps
	};
}
