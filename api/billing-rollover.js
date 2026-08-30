'use strict';

const crypto = require('crypto');
const { getAdminDb, rolloverAllCompanies } = require('./firebaseAdmin');

function authorized(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const header = String(req.headers.authorization || '');
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Use GET or POST.' }));
    return;
  }
  if (!authorized(req)) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  try {
    const db = getAdminDb();
    if (!db) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT is not set.' }));
      return;
    }
    const result = await rolloverAllCompanies(db);
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Rollover failed.' }));
  }
};
