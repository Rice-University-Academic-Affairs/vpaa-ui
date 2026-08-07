import type { OpaqueSession } from "@microsoft/rayfin-auth";
import type { Auth } from "@microsoft/rayfin-auth";
import type { FabricAuthOptions } from "@microsoft/rayfin-auth-provider-fabric";
import { initEmbeddedAuth as sdkInitEmbeddedAuth } from "@microsoft/rayfin-auth-provider-fabric";
import type { RayfinClient } from "@microsoft/rayfin-client";
import { normalizeEmail } from "$lib/admin/owner-config.js";
import type { AdminIdentity } from "$lib/admin/types.js";
import { getRayfinClient, type RayfinClientEnv } from "./client.js";

export type FabricEmbeddedInit = (
	auth: Auth,
	options: FabricAuthOptions
) => Promise<OpaqueSession | null>;

export type AppAuthSession = {
	authenticated: boolean;
	email: string | null;
	identity: AdminIdentity | null;
};

export interface IAuthService {
	initEmbeddedAuth(): Promise<OpaqueSession | null>;
}

export type BootstrapAuthOptions = {
	client?: RayfinClient;
	env?: RayfinClientEnv & {
		VITE_FABRIC_WORKSPACE_ID?: string;
		VITE_FABRIC_ITEM_ID?: string;
		VITE_FABRIC_PORTAL_URL?: string;
	};
	returnOrigin?: string;
	initEmbeddedAuth?: FabricEmbeddedInit;
};

export function readFabricAuthOptions(
	env: BootstrapAuthOptions["env"] = import.meta.env,
	returnOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"
): FabricAuthOptions {
	const workspaceId = env?.VITE_FABRIC_WORKSPACE_ID;
	const projectId = env?.VITE_FABRIC_ITEM_ID;
	const fabricPortalUrl = env?.VITE_FABRIC_PORTAL_URL;
	if (!workspaceId || !projectId || !fabricPortalUrl) {
		throw new Error("Missing required env vars for Fabric auth - run 'npx rayfin up'");
	}
	return {
		workspaceId,
		projectId,
		fabricPortalUrl,
		returnOrigin
	};
}

export function bootstrapAuth(options: BootstrapAuthOptions = {}): IAuthService {
	const client = options.client ?? getRayfinClient(options.env);
	const fabricOptions = readFabricAuthOptions(options.env, options.returnOrigin);
	const init = options.initEmbeddedAuth ?? sdkInitEmbeddedAuth;
	return {
		initEmbeddedAuth: () => init(client.auth, fabricOptions)
	};
}

export function identityFromSession(session: OpaqueSession | null | undefined): AdminIdentity | null {
	if (!session?.isAuthenticated || !session.user?.email) return null;
	const email = normalizeEmail(session.user.email);
	if (!email.includes("@")) return null;
	return { email };
}

export function sessionToAppAuth(session: OpaqueSession | null | undefined): AppAuthSession {
	const identity = identityFromSession(session);
	return {
		authenticated: Boolean(identity),
		email: identity?.email ?? null,
		identity
	};
}

export async function loadAppAuth(options: BootstrapAuthOptions = {}): Promise<AppAuthSession> {
	try {
		const session = await bootstrapAuth(options).initEmbeddedAuth();
		return sessionToAppAuth(session);
	} catch {
		return { authenticated: false, email: null, identity: null };
	}
}
