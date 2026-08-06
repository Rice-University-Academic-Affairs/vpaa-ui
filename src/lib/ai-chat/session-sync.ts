import type { UIMessage } from "@tanstack/ai-client";
import {
	defaultThreadPreview,
	defaultThreadTitle
} from "./thread-metadata.js";
import type {
	ChatThreadRecord,
	CreateChatThreadInput,
	UpdateChatThreadPatch
} from "./storage.js";

export type ThreadMetadataSync = {
	create?: CreateChatThreadInput;
	patch?: UpdateChatThreadPatch;
};

export function buildThreadMetadataSync(
	threadId: string,
	messages: UIMessage[],
	existing: ChatThreadRecord | null,
	now = new Date().toISOString()
): ThreadMetadataSync | null {
	if (messages.length === 0) return null;

	const title = defaultThreadTitle(messages);
	const preview = defaultThreadPreview(messages);

	if (!existing) {
		return {
			create: {
				id: threadId,
				title,
				preview,
				updatedAt: now
			}
		};
	}

	return {
		patch: {
			title: existing.title === "New chat" ? title : existing.title,
			preview,
			updatedAt: now
		}
	};
}
