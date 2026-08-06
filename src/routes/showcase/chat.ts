import type { AiChatThread } from "$lib/ai-chat/core/types.js";
import { createScrollToTopClientTool } from "$lib/ai-chat/tools/examples/scroll-to-top.js";
import { clientTools } from "$lib/ai-chat/tools/index.js";
import { DEFAULT_CHAT_ENDPOINT } from "$lib/ai-chat/constants.js";
import { createAiChatSession, createLocalChatStorage } from "$lib/index.js";

export const DEMO_CHAT_THREADS: AiChatThread[] = [
	{
		id: "thread-1",
		title: "Faculty headcount trends",
		preview: "What changed in the last quarter?",
		updatedAt: "2026-03-20"
	},
	{
		id: "thread-2",
		title: "Department budget summary",
		preview: "Show me the top three departments by spend.",
		updatedAt: "2026-03-18"
	},
	{
		id: "thread-3",
		title: "New faculty onboarding",
		preview: "How many new hires joined this year?",
		updatedAt: "2026-03-15"
	}
];

export function createShowcaseChatSession() {
	return createAiChatSession({
		storage: createLocalChatStorage({ initialThreads: DEMO_CHAT_THREADS }),
		chat: DEFAULT_CHAT_ENDPOINT,
		threadId: DEMO_CHAT_THREADS[0]?.id,
		tools: clientTools(createScrollToTopClientTool())
	});
}
