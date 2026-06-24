export type FabricCredentials = {
	tenantId: string;
	clientId: string;
	clientSecret: string;
	dataAgentUrl: string;
};

const REQUIRED = ["TENANT_ID", "CLIENT_ID", "CLIENT_SECRET", "DATA_AGENT_URL"] as const;

export function loadConfigFromEnv(): FabricCredentials {
	const missing = REQUIRED.filter((key) => !process.env[key]?.trim());

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(", ")}\n` +
				"Copy .env.example to .env and fill in your service principal and data agent values."
		);
	}

	return {
		tenantId: process.env.TENANT_ID!.trim(),
		clientId: process.env.CLIENT_ID!.trim(),
		clientSecret: process.env.CLIENT_SECRET!.trim(),
		dataAgentUrl: process.env.DATA_AGENT_URL!.trim()
	};
}
