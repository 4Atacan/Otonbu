// Edge Functions Sentry — minimal envelope POST
// SENTRY_DSN_EDGE Supabase paneli ortam değişkeni; istemciye verilmez.
// Kullanım:
//   import { captureEdgeException } from "../_shared/sentry.ts";
//   try { ... } catch (e) { await captureEdgeException(e, "fiyat-hesapla"); throw e; }

interface ParsedDsn {
  host: string;
  projectId: string;
  publicKey: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  // Beklenen biçim: https://<publicKey>@<host>/<projectId>
  const m = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
  if (!m) return null;
  return { publicKey: m[1], host: m[2], projectId: m[3] };
}

export async function captureEdgeException(err: unknown, fn: string): Promise<void> {
  const dsn = Deno.env.get("SENTRY_DSN_EDGE");
  // DSN yoksa sessizce console'a düş — Edge log'undan görünür
  if (!dsn) { console.error(`[edge:${fn}]`, err); return; }
  const parsed = parseDsn(dsn);
  if (!parsed) { console.error(`[edge:${fn}] invalid SENTRY_DSN_EDGE`); console.error(err); return; }

  const e = err instanceof Error ? err : new Error(String(err));
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const ts = Date.now() / 1000;

  const envelopeHeader = { event_id: eventId, sent_at: new Date().toISOString(), dsn };
  const itemHeader = { type: "event" };
  const event = {
    event_id: eventId,
    timestamp: ts,
    platform: "javascript",
    level: "error",
    environment: Deno.env.get("SUPABASE_ENV") ?? "production",
    server_name: `edge:${fn}`,
    tags: { runtime: "deno", function: fn },
    exception: {
      values: [{
        type: e.name || "Error",
        value: e.message,
        stacktrace: e.stack ? { frames: parseStack(e.stack) } : undefined,
      }],
    },
  };

  const body = [
    JSON.stringify(envelopeHeader),
    JSON.stringify(itemHeader),
    JSON.stringify(event),
  ].join("\n");

  const url = `https://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_key=${parsed.publicKey}&sentry_version=7`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
    });
  } catch (postErr) {
    // Sentry'ye yazamadık — orijinal hata kaybolmasın
    console.error(`[edge:${fn}] sentry post failed`, postErr);
    console.error(`[edge:${fn}] original`, err);
  }
}

function parseStack(stack: string): Array<{ filename: string; function: string; lineno?: number; colno?: number }> {
  // Hafif parser: "at fnName (file:line:col)" satırlarını ayıkla
  return stack.split("\n").slice(1).map((line) => {
    const m = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ?? line.match(/at\s+(.+?):(\d+):(\d+)/);
    if (!m) return { filename: "unknown", function: line.trim() };
    if (m.length === 5) return { function: m[1], filename: m[2], lineno: +m[3], colno: +m[4] };
    return { function: "anonymous", filename: m[1], lineno: +m[2], colno: +m[3] };
  });
}
