You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Cursor Cloud specific instructions

This repo is `vpaa-ui`, a Svelte 5 / SvelteKit component library (built with `@sveltejs/package`). `src/lib` is the published library; `src/routes` is the showcase/dev app. There is no backend, database, or secrets — it runs fully offline with mock data in `src/routes/showcase.ts`.

Gotcha — install with scripts disabled: the `prepare`/`prepack` scripts run `publint`, and `publint` runs `npm pack`, which re-triggers `prepack` → infinite recursion that hangs `npm install`. Always install with `npm install --ignore-scripts` (the update script does this). Dependencies are pure JS/Svelte, so skipping lifecycle scripts is safe.

Running things (all from repo root):
- Dev/showcase server: `npm run dev` (Vite on port 5173). This is the primary way to view/test components.
- Type check: `npm run check` (runs `svelte-kit sync` then `svelte-check`; passes with 0 errors).
- Build showcase app: `npx vite build` (avoid `npm run build`, which chains the recursive `prepack`).
- Build/publish the library: `npx svelte-package` (outputs `dist/`). Avoid `npm run prepack`/`npm run prepare` directly for the same recursion reason.
