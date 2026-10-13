import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env"), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const headers = {
  Authorization: `Bearer ${env.MCD_MCP_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

let id = 1;

async function call(name, args) {
  const response = await fetch("https://mcp.mcd.cn", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: id++,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const payload = await response.json();
  const text = payload.result?.content?.map((item) => item.text).join("\n") ?? "";
  const start = text.indexOf("{\"success\"");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error(`${name} 没有 JSON：${text.slice(0, 240)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

await fetch("https://mcp.mcd.cn", {
  method: "POST",
  headers,
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: id++,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "mcd-rogue", version: "0.1.0" },
    },
  }),
});

const stores = await call("query-nearby-stores", {
  searchType: 2,
  beType: 1,
  city: "上海市",
  keyword: "南京西路",
});
const store = stores.data?.[0];
if (!store) throw new Error("没有门店");

const menu = await call("query-meals", {
  storeCode: store.storeCode,
  beCode: store.beCode,
  orderType: 1,
  beType: 1,
});

const meals = menu.data?.meals ?? {};
const cards = Object.entries(meals).map(([code, meal]) => ({
  code,
  name: meal.name,
  price: Number(meal.currentPrice),
  image: meal.image ?? "",
}));

mkdirSync("public/menu", { recursive: true });
for (const card of cards) {
  if (!card.image.startsWith("http")) continue;
  const response = await fetch(card.image);
  if (!response.ok) continue;
  writeFileSync(`public/menu/${card.code}.png`, Buffer.from(await response.arrayBuffer()));
  card.image = `menu/${card.code}.png`;
}

mkdirSync("src/data", { recursive: true });
writeFileSync(
  "src/data/menu.json",
  JSON.stringify(
    {
      storeName: store.storeName,
      fetchedAt: new Date().toISOString(),
      cards,
    },
    null,
    2,
  ),
);
console.log(store.storeName, cards.length);
console.log(cards.slice(0, 3));
