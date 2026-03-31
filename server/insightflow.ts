/**
 * InsightFlow proxy service.
 * - Signs RS256 JWTs from the data-portal session
 * - Cached health check (30s TTL) to avoid pre-flight on every call
 * - HTTP proxy for REST calls; iterative SSE pump for streaming
 */
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INSIGHTFLOW_URL = process.env.INSIGHTFLOW_URL || "http://localhost:8080";

function loadPrivateKey(): string {
  // 1. Try key file next to this module
  const keyFile = path.join(__dirname, "bridge_private.pem");
  if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, "utf8");
  // 2. Fall back to env var (base64 or raw PEM with literal \n)
  const raw = process.env.INSIGHTFLOW_JWT_PRIVATE_KEY || "";
  if (!raw) return "";
  return raw.startsWith("-----") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
}

const PRIVATE_KEY = loadPrivateKey();
console.log(`[InsightFlow] Private key loaded: ${PRIVATE_KEY ? `yes (${PRIVATE_KEY.length} chars)` : "NO — JWT signing will fail"}`);

const ROLE_MAP: Record<string, string> = {
  requester: "viewer",
  analyst: "analyst",
  team_lead: "platform_admin",
};

// ── Health check with 30s cache ──────────────────────────────────────
// Trade-off: after the 30s TTL expires, the next request blocks for up to
// 3s (AbortSignal timeout) before being proxied. This is acceptable for
// analytics requests which are not latency-critical. If needed, replace
// with a background refresh pattern that never blocks incoming requests.
let _healthCache = { ok: true, checkedAt: 0 };
const HEALTH_TTL_MS = 30_000;

async function isHealthy(): Promise<boolean> {
  const now = Date.now();
  if (now - _healthCache.checkedAt < HEALTH_TTL_MS) return _healthCache.ok;
  try {
    const r = await fetch(`${INSIGHTFLOW_URL}/api/v1/health/live`,
      { signal: AbortSignal.timeout(3000) });
    _healthCache = { ok: r.ok, checkedAt: now };
  } catch {
    _healthCache = { ok: false, checkedAt: now };
  }
  return _healthCache.ok;
}

// ── JWT signing ───────────────────────────────────────────────────────

export function signBridgeToken(user: { id: number; email: string; role: string }): string {
  if (!PRIVATE_KEY) throw new Error("INSIGHTFLOW_JWT_PRIVATE_KEY not configured");
  return jwt.sign(
    { userId: String(user.id), email: user.email,
      role: ROLE_MAP[user.role] ?? "viewer", orgId: "org-default" },
    PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: "15m" },
  );
}

// ── HTTP proxy ────────────────────────────────────────────────────────

export async function proxyToInsightFlow(
  req: Request, res: Response,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<void> {
  const user = req.user as any;
  if (!user) { res.status(401).json({ message: "Unauthorized" }); return; }

  if (!(await isHealthy())) {
    res.status(503).json({ message: "Analytics service temporarily unavailable. Your existing dashboards are still saved." });
    return;
  }

  let token: string;
  try { token = signBridgeToken(user); }
  catch (err) {
    console.error("[InsightFlow] Failed to sign bridge token:", err);
    res.status(500).json({ message: "Failed to sign auth token", detail: String(err) }); return;
  }

  const method = options.method ?? req.method;
  const fetchOptions: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  };
  if (method !== "GET" && method !== "HEAD") {
    fetchOptions.body = JSON.stringify(options.body ?? req.body);
  }

  try {
    const upstream = await fetch(`${INSIGHTFLOW_URL}${path}`, fetchOptions);
    console.log(`[InsightFlow] upstream ${method} ${path} → ${upstream.status}`);
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(await upstream.text());
  } catch (err) {
    console.error("[InsightFlow] Fetch error:", err);
    res.status(503).json({ message: "Analytics service temporarily unavailable.", detail: String(err) });
  }
}

// ── SSE proxy (iterative, not recursive) ─────────────────────────────

export async function proxySSEToInsightFlow(
  req: Request, res: Response,
  queryId: string,
): Promise<void> {
  const user = req.user as any;
  if (!user) { res.status(401).json({ message: "Unauthorized" }); return; }

  // Sign fresh token immediately before opening SSE connection (not reused)
  let token: string;
  try { token = signBridgeToken(user); }
  catch (err) {
    console.error("[InsightFlow] Failed to sign bridge token (SSE):", err);
    res.status(500).json({ message: "Failed to sign auth token", detail: String(err) }); return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const upstream = await fetch(
      `${INSIGHTFLOW_URL}/api/v1/query/${queryId}/stream`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!upstream.ok || !upstream.body) {
      res.write(`data: {"error":"upstream error","status":${upstream.status}}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    // Iterative loop — no recursion, no stack overflow on large streams
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch {
    res.write('data: {"error":"stream disconnected"}\n\n');
    res.end();
  }
}
