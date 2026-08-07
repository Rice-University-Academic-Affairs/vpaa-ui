# Testing guide

This document classifies how tests relate to production behavior and where mocks are intentional.

## Fidelity tiers

| Tier | Meaning | Trust level |
|------|---------|-------------|
| T1 | Pure logic, no mocks | High |
| T2 | Contract test with mocked dependency | Medium — verifies our glue only |
| T3 | Component slice via harness or DOM stubs | Medium — backed by E2E where noted |
| T4 | Integration / end-to-end | High when using production code paths |

## Chat streams

Production `/api/chat` uses `createMockChatStream` from `src/routes/api/chat/mock-stream.ts`.

Vitest integration tests use `createTestChatStream`, which delegates to the production stream for every path except the test-only `set-flag` client-tool trigger. Parity is enforced in `src/routes/api/chat/stream-parity.test.ts`.

`src/lib/ai-chat/e2e/chat-prod-parity.test.ts` runs the real TanStack client against an HTTP server wired to the production stream.

## Test-only production branches

These exist because jsdom cannot reliably host portaled overlays:

- `AiChatPanel.svelte` — `portalProps={{ disabled: import.meta.env.VITEST }}`
- `DataTableSortMenu.svelte` — same pattern
- `DataTableFilterPopover.svelte` — same pattern

Popover and sheet behavior is covered by Playwright E2E (`e2e/table.spec.ts`, `e2e/chat.spec.ts`).

## Global Vitest stubs

`src/test/setup.ts` provides:

- `ResizeObserver` no-op
- Fixed viewport dimensions

Layout-sensitive behavior should be validated in Playwright, not only in Vitest.

## File classification

### T1 — Pure logic

- `build-column-defs.test.ts`
- `derive-table-config.test.ts`
- `derive-drilldown-rows.test.ts`
- `merge-tools.test.ts`
- `thread-metadata.test.ts`
- `session-sync.test.ts`
- `defaults.test.ts`
- `types-contract.test.ts`
- `mock-stream.test.ts`
- `stream-parity.test.ts`
- `tools.test.ts`
- `scroll-to-top.test.ts`
- `scroll-app-shell.test.ts`
- `stabilize-table-scroll.test.ts`
- `showcase-fixtures.test.ts`

### T2 — Contract / mocked dependencies

- `create-session.test.ts` — mocks `createAiChat`
- `session-controller.test.ts` — injects `createMockChatClient`
- `create-chat.test.ts` — mocks `@tanstack/ai-svelte`
- `chat.test.ts` — mocks `@tanstack/ai-svelte`
- `create-chat-route-handler.test.ts` — mocks `@tanstack/ai`
- `ag-ui-contract.test.ts` — stubs `fetch`
- `storage.test.ts` — Map-backed `localStorage`
- `showcase/chat.test.ts` — spies `canUseLocalChatStorage`

### T3 — Component slices

- `DataTable*.test.ts`, harness-backed popover/sort/filter tests
- `use-data-table-state.test.ts`, `use-drilldown.test.ts`
- `AiChatMessage.test.ts`, `AiChatMessages.test.ts`, `AiChatView.test.ts`, `AiChatInput.test.ts`, `AiChatThreadList.test.ts`, `AiChatLoadingIndicator.test.ts`, `scroll-messages-to-bottom.test.ts`
- `AiChatPanel.test.ts` — real session via `mountSession`, mocked chat client only

### T4 — Integration / E2E

- `chat-integration.test.ts` — real client + HTTP server + test stream (`set-flag` only)
- `chat-prod-parity.test.ts` — real client + HTTP server + production stream
- `route.test.ts` — production `POST` handler
- `e2e/*.spec.ts` — full browser against the running app

## Guardrails

1. Do not add a second chat stream implementation — extend `mock-stream.ts` or delegate from `test-chat-stream.ts`.
2. New `vi.mock` on TanStack modules requires a T4 backstop test.
3. New `import.meta.env.VITEST` branches require an E2E backstop or a comment linking to one.
4. Harness tests must document what parent composition they omit.

## Running tests

```bash
npm test
npm run check
npm run test:e2e
```
