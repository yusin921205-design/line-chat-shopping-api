import crypto from 'node:crypto';

export function verifyLineSignature(req, res, next) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const received = req.get('x-line-signature') || '';
  if (!secret) return res.status(500).json({ error: 'LINE_CHANNEL_SECRET is not configured' });
  const expected = crypto.createHmac('SHA256', secret).update(req.body).digest('base64');
  const valid = received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) return res.status(401).json({ error: 'Invalid LINE signature' });
  try {
    req.lineEvents = JSON.parse(req.body.toString('utf8')).events || [];
    next();
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
  }
}
