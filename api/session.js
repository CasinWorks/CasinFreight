'use strict';

const { stampAdminSession } = require('./firebaseAdmin');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'POST only.' }));
    return;
  }
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const result = await stampAdminSession(authHeader);
    res.statusCode = result.status;
    res.end(JSON.stringify(result.data));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Session failed.' }));
  }
};
