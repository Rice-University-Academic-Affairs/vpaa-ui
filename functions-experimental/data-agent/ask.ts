import "dotenv/config";
import { loadConfigFromEnv } from "./config.ts";
import { FabricDataAgentClient } from "./fabric-data-agent-client.ts";

const question = process.argv.slice(2).join(" ").trim();

if (!question) {
	console.error('Usage: npm run ask -- "Your question here"');
	process.exit(1);
}

try {
	const config = loadConfigFromEnv();
	const client = new FabricDataAgentClient(config);
	const answer = await client.ask(question);
	console.log(answer);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exit(1);
}
