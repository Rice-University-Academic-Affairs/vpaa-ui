import { RayfinClient } from "@microsoft/rayfin-client";
import type { AppSchema } from "../../../rayfin/data/schema.js";
import { FabricAuthConfigError } from "./auth.js";

let _client: RayfinClient<AppSchema> | undefined;
let _clientKey: string | undefined;

export type RayfinClientEnv = {
	VITE_RAYFIN_API_URL?: string;
	VITE_RAYFIN_PUBLISHABLE_KEY?: string;
};

export function resetRayfinClientForTests(): void {
	_client = undefined;
	_clientKey = undefined;
}

export function getRayfinClient(env: RayfinClientEnv = import.meta.env): RayfinClient<AppSchema> {
	const apiUrl = env.VITE_RAYFIN_API_URL;
	const publishableKey = env.VITE_RAYFIN_PUBLISHABLE_KEY;
	if (!apiUrl || !publishableKey) {
		throw new FabricAuthConfigError(
			"Missing required env vars for creating rayfin client - run 'npx rayfin up'"
		);
	}
	const key = `${apiUrl}::${publishableKey}`;
	if (_client && _clientKey !== key) {
		throw new FabricAuthConfigError("Rayfin client already created with different credentials");
	}
	if (!_client) {
		_client = new RayfinClient<AppSchema>({
			baseUrl: apiUrl,
			publishableKey,
			authStorage: true,
			useProxy: false
		});
		_clientKey = key;
	}
	return _client;
}
