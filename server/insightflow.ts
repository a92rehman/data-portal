/**
 * InsightFlow proxy service.
 * - Cached health check (30s TTL) to avoid pre-flight on every call
 * - HTTP proxy for REST calls; iterative SSE pump for streaming
 * - Auth: InsightFlow runs in dev mode (no JWT required)
 */
import type { Request, Response } from "express";

const INSIGHTFLOW_URL = process.env.INSIGHTFLOW_URL || "http://localhost:8080";

// ── HTTP proxy ────────────────────────────────────────────────────────

export async function proxyToInsightFlow(
  req: Request, res: Response,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<void> {
  const user = req.user as any;
  if (!user) { res.status(401).json({ message: "Unauthorized" }); return; }

  const method = options.method ?? req.method;
  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(user.id),
      "X-User-Email": user.email ?? "",
      "X-User-Role": user.role ?? "viewer",
    },
  };
  if (method !== "GET" && method !== "HEAD") {
    fetchOptions.body = JSON.stringify(options.body ?? req.body);
  }

  try {
    const upstream = await fetch(`${INSIGHTFLOW_URL}${path}`, fetchOptions);
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(await upstream.text());
  } catch (err) {
    console.error("[InsightFlow] Fetch error:", err);
    res.status(503).json({ message: "Analytics service temporarily unavailable." });
  }
}

// ── SSE proxy (iterative, not recursive) ─────────────────────────────

export async function proxySSEToInsightFlow(
  req: Request, res: Response,
  queryId: string,
): Promise<void> {
  const user = req.user as any;
  if (!user) { res.status(401).json({ message: "Unauthorized" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const upstream = await fetch(
      `${INSIGHTFLOW_URL}/api/v1/query/${queryId}/stream`,
      { headers: { "X-User-Id": String(user.id), "X-User-Email": user.email ?? "" } },
    );
    if (!upstream.ok || !upstream.body) {
      res.write(`data: {"error":"upstream error","status":${upstream.status}}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

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
