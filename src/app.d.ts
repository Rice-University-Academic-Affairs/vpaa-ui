// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			authenticated?: boolean;
			email?: string | null;
			isAdmin?: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}

	interface ImportMetaEnv {
		readonly VITE_RAYFIN_API_URL?: string;
		readonly VITE_RAYFIN_PUBLISHABLE_KEY?: string;
		readonly VITE_FABRIC_WORKSPACE_ID?: string;
		readonly VITE_FABRIC_ITEM_ID?: string;
		readonly VITE_FABRIC_PORTAL_URL?: string;
		readonly PUBLIC_ADMIN_TEST_MODE?: string;
		readonly PUBLIC_OWNER_ADMIN_EMAIL?: string;
		readonly VITE_OWNER_ADMIN_EMAIL?: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
