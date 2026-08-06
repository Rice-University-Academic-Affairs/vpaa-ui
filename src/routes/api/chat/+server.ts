import { createMockChatReply } from "./mock-reply.js";
import type { RequestHandler } from "./$types.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	try {
		return Response.json({ message: createMockChatReply(body) });
	} catch (error) {
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
