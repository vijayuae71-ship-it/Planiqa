// Netlify Function — Proxies Claude API calls
// API key stays server-side (secure, never reaches browser)

const API_KEY = process.env.ANTHROPIC_API_KEY || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async function(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: { message: 'Method not allowed' } }),
    };
  }

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY not configured in Netlify environment variables' } }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { system, messages, max_tokens } = body;

    if (!messages || !messages.length) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: { message: 'Missing messages in request body' } }),
      };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 8192,
        system: system || '',
        messages: messages,
      }),
    });

    const data = await response.json();

    // Log errors server-side for debugging
    if (!response.ok) {
      console.error('Anthropic API error:', response.status, JSON.stringify(data));
    }

    return {
      statusCode: response.status,
      headers: CORS_HEADERS,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: { message: error.message || 'Internal server error' } }),
    };
  }
};
