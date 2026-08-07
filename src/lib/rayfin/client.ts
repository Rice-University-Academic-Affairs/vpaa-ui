import { RayfinClient } from "@microsoft/rayfin-client";

let _client: RayfinClient | undefined;

export type RayfinClientEnv = {
	VITE_RAYFIN_API_URL?: string;
	VITE_RAYFIN_PUBLISHABLE_KEY?: string;
};

export function resetRayfinClientForTests(): void {
	_client = undefined;
}

export function getRayfinClient(env: RayfinClientEnv = import.meta.env): RayfinClient {
	if (!_client) {
		const apiUrl = env.VITE_RAYFIN_API_URL;
		const publishableKey = env.VITE_RAYFIN_PUBLISHABLE_KEY;
		if (!apiUrl || !publishableKey) {
			throw new Error("Missing required env vars for creating rayfin client - run 'npx rayfin up'");
		}
		_client = new RayfinClient({
			baseUrl: apiUrl,
			publishableKey,
			authStorage: true,
			useProxy: false
		});
	}
	return _client;
}
