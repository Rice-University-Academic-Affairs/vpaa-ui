import { randomUUID } from "node:crypto";
import { acquireFabricToken } from "./acquire-fabric-token.ts";

type FabricDataAgentClientConfig = {
	tenantId: string;
	clientId: string;
	clientSecret: string;
	dataAgentUrl: string;
};

type AskOptions = {
	timeoutMs?: number;
	threadName?: string;
};

type FabricThread = {
	id: string;
	name?: string;
};

type Assistant = {
	id: string;
};

type ThreadRun = {
	id: string;
	status: string;
};

type ThreadMessage = {
	role: string;
	content: Array<{ type: string; text?: { value: string } }>;
};

type ListResponse<T> = {
	data: T[];
};

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function privateAssistantBaseUrl(dataAgentUrl: string) {
	if (dataAgentUrl.includes("aiskills")) {
		return dataAgentUrl
			.replace("aiskills", "dataagents")
			.replace(/\/openai\/?$/, "")
			.replace("/aiassistant", "/__private/aiassistant");
	}

	return dataAgentUrl.replace(/\/openai\/?$/, "").replace("/aiassistant", "/__private/aiassistant");
}

function extractAssistantText(messages: ThreadMessage[]): string {
	const responses: string[] = [];

	for (const message of messages) {
		if (message.role !== "assistant") continue;

		for (const block of message.content) {
			if (block.type === "text" && block.text?.value) {
				responses.push(block.text.value);
			}
		}
	}

	if (responses.length === 0) {
		throw new Error("No assistant response returned from the data agent.");
	}

	return responses.at(-1)!;
}

export class FabricDataAgentClient {
	private readonly config: FabricDataAgentClientConfig;

	constructor(config: FabricDataAgentClientConfig) {
		if (!config.tenantId.trim()) throw new Error("tenantId is required");
		if (!config.clientId.trim()) throw new Error("clientId is required");
		if (!config.clientSecret.trim()) throw new Error("clientSecret is required");
		if (!config.dataAgentUrl.trim()) throw new Error("dataAgentUrl is required");

		this.config = config;
	}

	private apiUrl(path: string) {
		const base = this.config.dataAgentUrl.replace(/\/$/, "");
		return `${base}${path}?api-version=2024-05-01-preview`;
	}

	private async request<T>(
		token: string,
		path: string,
		init: RequestInit = {}
	): Promise<T> {
		const response = await fetch(this.apiUrl(path), {
			...init,
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
				"Content-Type": "application/json",
				ActivityId: randomUUID(),
				...init.headers
			}
		});

		if (!response.ok) {
			const detail = await response.text();
			throw new Error(`Fabric data agent request failed (${response.status}): ${detail}`);
		}

		if (response.status === 204) {
			return undefined as T;
		}

		return (await response.json()) as T;
	}

	private async getOrCreateThread(token: string, threadName?: string): Promise<FabricThread> {
		const name = threadName ?? `external-client-thread-${randomUUID()}`;
		const baseUrl = privateAssistantBaseUrl(this.config.dataAgentUrl);
		const url = `${baseUrl}/threads/fabric?tag="${name}"`;

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
				"Content-Type": "application/json",
				ActivityId: randomUUID()
			}
		});

		if (!response.ok) {
			const detail = await response.text();
			throw new Error(`Failed to resolve thread (${response.status}): ${detail}`);
		}

		const thread = (await response.json()) as FabricThread;
		thread.name = name;
		return thread;
	}

	async ask(question: string, options: AskOptions = {}): Promise<string> {
		const trimmed = question.trim();
		if (!trimmed) throw new Error("Question cannot be empty");

		const timeoutMs = options.timeoutMs ?? 120_000;
		const token = await acquireFabricToken(
			this.config.tenantId,
			this.config.clientId,
			this.config.clientSecret
		);

		const assistant = await this.request<Assistant>(token, "/assistants", {
			method: "POST",
			body: JSON.stringify({ model: "not used" })
		});
		const thread = await this.getOrCreateThread(token, options.threadName);

		try {
			await this.request(token, `/threads/${thread.id}/messages`, {
				method: "POST",
				body: JSON.stringify({ role: "user", content: trimmed })
			});

			let run = await this.request<ThreadRun>(token, `/threads/${thread.id}/runs`, {
				method: "POST",
				body: JSON.stringify({ assistant_id: assistant.id })
			});

			const deadline = Date.now() + timeoutMs;

			while (run.status === "queued" || run.status === "in_progress") {
				if (Date.now() > deadline) {
					throw new Error(`Data agent request timed out after ${timeoutMs}ms`);
				}

				await sleep(2000);
				run = await this.request<ThreadRun>(token, `/threads/${thread.id}/runs/${run.id}`);
			}

			if (run.status !== "completed") {
				throw new Error(`Data agent run failed with status: ${run.status}`);
			}

			const messages = await this.request<ListResponse<ThreadMessage>>(
				token,
				`/threads/${thread.id}/messages?order=asc`
			);
			return extractAssistantText(messages.data);
		} finally {
			await this.request(token, `/threads/${thread.id}`, { method: "DELETE" }).catch(
				() => undefined
			);
		}
	}
}
