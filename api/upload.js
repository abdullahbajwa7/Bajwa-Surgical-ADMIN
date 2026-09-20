const { isAdmin, jsonRes } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (req.method !== 'POST') return jsonRes(res, 405, { error: 'Method not allowed' });
  if (!isAdmin(req)) return jsonRes(res, 401, { error: 'Admin login required' });

  let body = '';
  req.on('data', c => { body += c; if (body.length > 10e6) { req.destroy(); } });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const dataUrl = data.data;
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        return jsonRes(res, 400, { error: 'Invalid image data' });
      }
      const ext = dataUrl.split(';')[0].split('/')[1] || 'png';
      const safeName = (data.filename || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_') + '.' + ext;
      return jsonRes(res, 200, {
        ok: true,
        filename: safeName,
        path: dataUrl,
        message: 'Image stored as data URL. Use this directly in the product image field.'
      });
    } catch (err) {
      return jsonRes(res, 400, { error: err.message });
    }
  });
};
