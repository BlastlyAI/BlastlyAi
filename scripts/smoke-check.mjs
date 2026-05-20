import "dotenv/config";
import mysql from "mysql2/promise";

const checks = [];

async function checkDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    checks.push({ name: "database", ok: false, detail: "DATABASE_URL missing" });
    return;
  }
  try {
    const conn = await mysql.createConnection(url);
    const [rows] = await conn.query("SELECT 1 AS ok");
    await conn.end();
    checks.push({ name: "database", ok: true, detail: `connected (${rows[0]?.ok})` });
  } catch (err) {
    checks.push({ name: "database", ok: false, detail: err.message });
  }
}

async function checkHttp() {
  const base = `http://localhost:${process.env.PORT || 3000}`;
  const paths = ["/", "/login", "/command"];
  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`);
      checks.push({
        name: `http${path}`,
        ok: res.ok,
        detail: `status ${res.status}`,
      });
    } catch (err) {
      checks.push({ name: `http${path}`, ok: false, detail: err.message });
    }
  }
}

async function checkTrpc() {
  const base = `http://localhost:${process.env.PORT || 3000}`;
  const input = encodeURIComponent(
    JSON.stringify({ 0: { json: { timestamp: Date.now() } } })
  );
  try {
    const res = await fetch(
      `${base}/api/trpc/system.health?batch=1&input=${input}`
    );
    const text = await res.text();
    const ok = res.ok && text.includes('"ok":true');
    checks.push({
      name: "trpc-system.health",
      ok,
      detail: ok ? "ok" : `${res.status} ${text.slice(0, 120)}`,
    });
  } catch (err) {
    checks.push({ name: "trpc-system.health", ok: false, detail: err.message });
  }
}

function checkEnv() {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "VITE_APP_ID",
    "OAUTH_SERVER_URL",
    "STRIPE_SECRET_KEY",
  ];
  const optional = ["ZERNIO_API_KEY", "PEXELS_API_KEY", "AYRSHARE_API_KEY"];
  for (const key of required) {
    checks.push({
      name: `env:${key}`,
      ok: Boolean(process.env[key]),
      detail: process.env[key] ? "set" : "missing",
    });
  }
  for (const key of optional) {
    if (!process.env[key]) {
      checks.push({
        name: `env:${key}`,
        ok: true,
        detail: "optional — not set",
      });
    }
  }
}

await checkEnv();
await checkDb();
await checkHttp();
await checkTrpc();

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
