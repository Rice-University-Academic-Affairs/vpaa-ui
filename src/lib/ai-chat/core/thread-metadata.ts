import type { UIMessage } from "@tanstack/ai-client";

export function messageText(message: UIMessage): string {
	return message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.content)
		.join(" ")
		.trim();
}

export function firstUserMessageText(messages: UIMessage[]): string | undefined {
	for (const message of messages) {
		if (message.role !== "user") continue;
		const text = messageText(message);
		if (text) return text;
	}
}

export function lastAssistantMessageText(messages: UIMessage[]): string | undefined {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role !== "assistant") continue;
		const text = messageText(message);
		if (text) return text;
	}
}

export function truncateText(text: string, maxLength = 80): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function defaultThreadTitle(messages: UIMessage[]): string {
	const firstUser = firstUserMessageText(messages);
	if (!firstUser) return "New chat";
	return truncateText(firstUser, 48);
}

export function defaultThreadPreview(messages: UIMessage[]): string | undefined {
	const preview = lastAssistantMessageText(messages) ?? firstUserMessageText(messages);
	return preview ? truncateText(preview) : undefined;
}
