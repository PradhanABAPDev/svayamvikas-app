/**
 * SvayamVikās — Cloudflare Worker API Proxy
 * ══════════════════════════════════════════════════════════════════════════
 * Deployment: https://dash.cloudflare.com → Workers → Create Worker
 *
 * This Worker:
 *   1. Receives AI requests from the mobile app
 *   2. Verifies they come from your app (not scrapers)
 *   3. Adds the Anthropic API key (stored as a Worker Secret, never in code)
 *   4. Forwards to Anthropic, streams the response back
 *   5. Rate-limits to prevent abuse (50 req/player/hour)
 *
 * Free tier: 100,000 requests/day — plenty for launch
 *
 * Setup:
 *   1. Go to dash.cloudflare.com → Workers & Pages → Create
 *   2. Paste this code
 *   3. Settings → Variables → Secrets → Add ANTHROPIC_API_KEY
 *   4. Deploy → copy your worker URL (xxx.workers.dev)
 *   5. Replace YOUR-WORKER.workers.dev everywhere in this project
 * ══════════════════════════════════════════════════════════════════════════
 */

// ── Types ──────────────────────────────────────────────────────────────────
interface Env {
  ANTHROPIC_API_KEY: string;   // Set as Worker Secret — NEVER hardcode
  ALLOWED_ORIGINS: string;     // Comma-separated allowed origins
  RATE_LIMIT_KV?: KVNamespace; // Optional: bind a KV namespace for rate limiting
}

// ── Rate Limiting (in-memory, resets per Worker instance) ─────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 50;         // requests per hour per player
const RATE_WINDOW = 3600_000;  // 1 hour in ms

function checkRateLimit(playerId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(playerId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(playerId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── CORS Headers ───────────────────────────────────────────────────────────
function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Player-ID, X-Game-Version',
    'Access-Control-Max-Age': '86400',
  };
}

// ── Main Handler ───────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    // ── CORS Preflight ─────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // ── Health Check ───────────────────────────────────────────────────────
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', game: 'SvayamVikas' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // ── Only accept POST to /ai ────────────────────────────────────────────
    if (url.pathname !== '/ai' || request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }

    // ── Verify request comes from your app ────────────────────────────────
    const userAgent = request.headers.get('User-Agent') || '';
    const gameVersion = request.headers.get('X-Game-Version') || '';
    const playerId = request.headers.get('X-Player-ID') || 'anonymous';

    const isValidClient =
      userAgent.includes('SvayamVikas') ||      // native app UA (set in MainActivity.kt)
      userAgent.includes('capacitor') ||          // Capacitor WebView
      origin.includes('svayamvikas.app') ||       // your web domain
      origin.includes('localhost');               // local dev

    if (!isValidClient) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized client' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── Rate Limiting ──────────────────────────────────────────────────────
    if (!checkRateLimit(playerId)) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many AI requests. The cosmos needs a moment to breathe.',
          retryAfter: 3600,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '3600',
            ...corsHeaders(origin),
          },
        }
      );
    }

    // ── Parse + Validate Request Body ─────────────────────────────────────
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize: only allow specific fields through (no prompt injection via metadata)
    const sanitizedBody = {
      model: 'claude-sonnet-4-20250514',   // always use this model, ignore client's request
      max_tokens: Math.min(body.max_tokens || 500, 1000), // cap at 1000 tokens
      system: typeof body.system === 'string'
        ? body.system.slice(0, 2000)        // cap system prompt length
        : 'You are Ātman-7, AI companion in SvayamVikās.',
      messages: Array.isArray(body.messages)
        ? body.messages.slice(-10).map((m: any) => ({  // max 10 message history
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: typeof m.content === 'string'
              ? m.content.slice(0, 1000)    // cap message length
              : '',
          }))
        : [],
    };

    // ── Forward to Anthropic ───────────────────────────────────────────────
    try {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': env.ANTHROPIC_API_KEY,  // ← from Worker Secret, never exposed
        },
        body: JSON.stringify(sanitizedBody),
      });

      if (!anthropicResponse.ok) {
        const errText = await anthropicResponse.text();
        console.error('[SvayamVikas Worker] Anthropic error:', anthropicResponse.status, errText);
        return new Response(
          JSON.stringify({
            error: 'AI service temporarily unavailable',
            // Return a dharmic fallback so the game still feels alive
            content: [{ type: 'text', text: 'The Akāśa signal fades... yet dharma endures. Seek the light.' }],
          }),
          {
            status: 200, // return 200 so the game handles it gracefully
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          }
        );
      }

      // Stream the response back to the app
      const data = await anthropicResponse.json();

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          ...corsHeaders(origin),
        },
      });

    } catch (err) {
      console.error('[SvayamVikas Worker] Fetch error:', err);
      return new Response(
        JSON.stringify({
          error: 'Worker error',
          content: [{ type: 'text', text: 'The cosmic bridge is temporarily severed. Your dharma remains unaffected.' }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        }
      );
    }
  },
};
