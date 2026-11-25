/**
 * Production Serverless Endpoint: POST /api/ai/chat
 * Compatible with Vercel, Render, Next.js, and standard Node.js Express servers.
 *
 * Reads GEMINI_API_KEY strictly from the server's environment variables.
 * The client browser NEVER has access to the key.
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ensure no caching of AI responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY environment variable is not configured on the server.'
    });
  }

  const { prompt, systemInstruction } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const contents = [];
  if (systemInstruction) {
    contents.push({
      role: 'user',
      parts: [{ text: `System Instruction: ${systemInstruction}` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I will act as the StudyFlow AI Teacher.' }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: String(prompt) }]
  });

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errData.error?.message || `Upstream Gemini API error ${response.status}`
      });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text: replyText });
  } catch (err) {
    return res.status(502).json({
      error: `Failed to communicate with Gemini API: ${err.message}`
    });
  }
}
