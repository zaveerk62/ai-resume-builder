// Vercel Edge Function — proxies chat completions to Groq (or any OpenAI-compatible provider).
// GROQ_API_KEY lives here as a server-side env var; it never reaches the client bundle.
export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';

export default async function handler(req: Request): Promise<Response> {
  // CORS pre-flight
  const origin = req.headers.get('origin') || '';
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN || origin,
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const baseUrl = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: bodyText,
  });

  const upstreamText = await upstream.text();
  return new Response(upstreamText, {
    status: upstream.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
