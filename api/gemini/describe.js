const { jsonRes } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (req.method !== 'POST') return jsonRes(res, 405, { error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonRes(res, 500, { error: 'GEMINI_API_KEY not configured on Vercel. Set it in Settings > Environment Variables.' });

  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const { productName, category } = data;

      if (!productName && !category) return jsonRes(res, 400, { error: 'Need at least product name or category' });

      const prompt = `Generate a professional medical-surgical product description for an e-commerce store. Write in English. Be concise, professional, and highlight key features and benefits. Use bullet points. Product: ${productName || 'Unknown'}. Category: ${category || 'General'}.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        return jsonRes(res, 502, { error: 'Gemini API error', details: err });
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No description generated.';
      return jsonRes(res, 200, { description: text.trim() });
    } catch (err) { return jsonRes(res, 500, { error: err.message }); }
  });
};
