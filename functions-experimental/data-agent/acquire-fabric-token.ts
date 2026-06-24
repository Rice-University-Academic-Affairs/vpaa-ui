const FABRIC_SCOPE = "https://api.fabric.microsoft.com/.default";
const POWER_BI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

type TokenResponse = {
	access_token: string;
	expires_in: number;
	token_type: string;
};

type CachedToken = {
	token: string;
	expiresAt: number;
};

const cache = new Map<string, CachedToken>();

function cacheKey(tenantId: string, clientId: string, scope: string) {
	return `${tenantId}:${clientId}:${scope}`;
}

async function requestToken(
	tenantId: string,
	clientId: string,
	clientSecret: string,
	scope: string
): Promise<CachedToken> {
	const body = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: "client_credentials",
		scope
	});

	const response = await fetch(
		`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body
		}
	);

	const payload = (await response.json()) as TokenResponse & {
		error?: string;
		error_description?: string;
	};

	if (!response.ok) {
		const detail = payload.error_description ?? payload.error ?? response.statusText;
		throw new Error(`Token request failed (${response.status}): ${detail}`);
	}

	return {
		token: payload.access_token,
		expiresAt: Date.now() + payload.expires_in * 1000
	};
}

export async function acquireFabricToken(
	tenantId: string,
	clientId: string,
	clientSecret: string
): Promise<string> {
	const key = cacheKey(tenantId, clientId, FABRIC_SCOPE);
	const cached = cache.get(key);

	if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
		return cached.token;
	}

	try {
		const token = await requestToken(tenantId, clientId, clientSecret, FABRIC_SCOPE);
		cache.set(key, token);
		return token.token;
	} catch (fabricError) {
		const powerBiKey = cacheKey(tenantId, clientId, POWER_BI_SCOPE);
		const powerBiCached = cache.get(powerBiKey);

		if (powerBiCached && powerBiCached.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
			return powerBiCached.token;
		}

		try {
			const token = await requestToken(tenantId, clientId, clientSecret, POWER_BI_SCOPE);
			cache.set(powerBiKey, token);
			return token.token;
		} catch {
			throw fabricError;
		}
	}
}
