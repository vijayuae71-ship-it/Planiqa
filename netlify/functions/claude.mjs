// Netlify Functions v2 — Streaming proxy to Claude API
// Streaming keeps connection alive, preventing 504 timeouts

export default async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY not set in Netlify environment variables' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    // Cap max_tokens at model's limit (Claude Sonnet 4 = 16384 output tokens)
    const maxTokens = Math.min(body.max_tokens || 16384, 16384);

    // Force streaming on — this is what prevents timeouts
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: body.system || '',
        messages: body.messages || [],
        stream: true
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        { error: `Anthropic API error ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    // Pass through Claude's SSE stream directly to the browser
    // This keeps the connection alive for the full response duration
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    return Response.json(
      { error: 'Function error: ' + (err.message || String(err)) },
      { status: 500 }
    );
  }
};

export const config = {
  path: '/.netlify/functions/claude'
};
