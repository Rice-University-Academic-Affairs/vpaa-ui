function lastUserText(messages: Array<{ role?: string; content?: unknown }>): string {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message?.role !== "user") continue;
		if (typeof message.content === "string") return message.content;
	}
	return "";
}

export function createMockChatReply(body: Record<string, unknown>): string {
	const messages = Array.isArray(body.messages) ? body.messages : [];
	const userText = lastUserText(messages as Array<{ role?: string; content?: unknown }>);

	return userText
		? `Thanks for your question about "${userText}". This is a demo response from the VPAA UI showcase. Wire your own backend to connect a live agent.`
		: "Hello! I am the VPAA UI demo assistant. Ask me anything about your data or reports.";
}
