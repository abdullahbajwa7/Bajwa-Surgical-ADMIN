const { jsonRes } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (req.method !== 'GET') return jsonRes(res, 405, { error: 'Method not allowed' });

  const images = [];
  try {
    const fs = require('fs');
    const path = require('path');
    const imgDir = path.join(process.cwd(), 'images');
    if (fs.existsSync(imgDir)) {
      const files = fs.readdirSync(imgDir).filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f));
      for (const file of files) {
        const stat = fs.statSync(path.join(imgDir, file));
        images.push({ name: file, size: stat.size, modified: stat.mtime.toISOString() });
      }
    }
  } catch {}

  return jsonRes(res, 200, { images, count: images.length });
};
