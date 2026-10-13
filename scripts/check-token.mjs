import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const token = env.MCD_MCP_TOKEN;
if (!token) {
  console.error("缺少 MCD_MCP_TOKEN");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

async function post(body, sessionId) {
  const response = await fetch("https://mcp.mcd.cn", {
    method: "POST",
    headers: sessionId ? { ...headers, "mcp-session-id": sessionId } : headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    sessionId: response.headers.get("mcp-session-id"),
    text,
  };
}

const init = await post({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "mcd-rogue", version: "0.1.0" },
  },
});

if (init.status !== 200) {
  console.error("握手失败", init.status);
  console.error(init.text.slice(0, 400));
  process.exit(1);
}

await post(
  { jsonrpc: "2.0", method: "notifications/initialized" },
  init.sessionId,
);

const clock = await post(
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "now-time-info", arguments: {} },
  },
  init.sessionId,
);

console.log("status", clock.status);
console.log(clock.text.slice(0, 800));
