// Edge Functions Sentry başlatma
// SENTRY_DSN_EDGE ortam değişkeni Supabase panelinden tanımlanır
export function initEdgeSentry(functionName: string) {
  // Supabase Edge Functions Deno ortamında çalışır.
  // @sentry/deno paketi henüz Deno deploy ile tam uyumlu değil;
  // şimdilik yapılandırılmış fetch ile Sentry envelope endpoint'ine manuel gönderim
  // kullanıyoruz. Gerekirse @sentry/deno@next entegrasyonuna geçilebilir.
  const dsn = Deno.env.get('SENTRY_DSN_EDGE');
  if (!dsn) return;

  // Hata yakalamak için globalThis üzerine handler bağla
  (globalThis as any).__sentryFunctionName = functionName;
  (globalThis as any).__sentryDsn = dsn;
}

export function captureEdgeException(err: unknown) {
  const dsn = (globalThis as any).__sentryDsn;
  if (!dsn) return;
  // Fire-and-forget; hata zaten Edge Function log'una da düşecek
  console.error('[Sentry]', err);
}
