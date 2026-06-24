# Fabric Data Agent — local experiment

Scripts to prove out service-principal auth and querying a published Fabric data agent from TypeScript. Not packaged or published — run locally only.

## Prerequisites

1. Service principal with **client ID**, **tenant ID**, and **client secret**
2. Fabric tenant: **Service principals can use Fabric APIs** enabled
3. SPN added to the workspace (**Member** or **Contributor**)
4. SPN has read access to each data source attached to the agent
5. Data agent **published** — copy the endpoint URL from **Settings**

References: [SPN auth](https://learn.microsoft.com/en-us/fabric/data-science/data-agent-service-principal) · [Client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)

## Run

```bash
cd functions-experimental/data-agent
cp .env.example .env
# fill in TENANT_ID, CLIENT_ID, CLIENT_SECRET, DATA_AGENT_URL
npm install
npm run ask -- "What data is available?"
```

If token acquisition fails on scope, the client retries with the Power BI scope. A **403** usually means the SPN lacks workspace or data-source access.
