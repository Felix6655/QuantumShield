import express from 'express';

const app = express();
app.use(express.json());

app.get('/healthz', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT ?? 3010);
const HOST = process.env.HOST ?? '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`QuantumShield API listening on http://${HOST}:${PORT}`);
});
