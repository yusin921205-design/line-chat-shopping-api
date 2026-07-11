import 'dotenv/config';
import express from 'express';
import webhookRouter from './routes/webhook.js';
import { verifyLineSignature } from './utils/lineSignature.js';

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (_req, res) => res.json({ ok: true }));
// LINE signature must be verified against the untouched request body.
app.use('/webhook', express.raw({ type: 'application/json' }), verifyLineSignature, webhookRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
});

app.listen(port, () => console.log(`LINE shopping API listening on :${port}`));
