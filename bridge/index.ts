import Fastify from "fastify";

const QS_API = process.env.QS_API as string; // e.g. https://…shuttleapp.rs
const fastify = Fastify({ logger: true });

fastify.post("/bridge", async (req, reply) => {
  const { public_key, message, signature, amount, token } = (req.body as any) || {};
  if (!public_key || !message || !signature) {
    return reply.code(400).send({ ok: false, error: "missing fields" });
  }

  // verify QS signature first
  const ver = await fetch(`${QS_API}/verify/${encodeURIComponent(message)}/${encodeURIComponent(signature)}`);
  const vr = await ver.json();

  if (!vr?.verified) {
    return reply.code(401).send({ ok: false, error: "invalid QS signature" });
  }

  // TODO: perform Solana/EVM action here (server wallet or program)
  // For now, just log accepted intent:
  req.log.info({ public_key, amount, token }, "Bridge verified. Proceeding with transfer…");

  return reply.send({ ok: true, verified: true });
});

fastify.listen({ port: Number(process.env.PORT) || 3001, host: "0.0.0.0" })
  .catch((e) => {
    fastify.log.error(e);
    process.exit(1);
  });
