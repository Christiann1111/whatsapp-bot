import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 CONFIG (pegá tus datos reales)
const VERIFY_TOKEN = "12345";
const ACCESS_TOKEN = "EAATNMGn35f8BRR6yb95H9sHdluvp86uwfUyQfPFZCNCZCr5DhZCpZCgGOtKdmSzWVsZC6F0mQOlHCrmr4Jw3aKVbE8aQSZCsC9Or6lQmC9vdAsjp4f69qMZCXhE6ZCOgDDjw5kKv0yifDjYKDXYi8qWWQrzmCgX97P7oZChtXKGtL81yX4fJGVoCKKghPFSgPZAWOhoJ4Igcqjiq5fUdtvNoZCN30gVOlZCAP6ZAs2lZA1vEVA0fweMk8tmcNj0ySrF5pOMoZCvUtkqwOWEKohJgdZAaoWaL";
const PHONE_NUMBER_ID = "1115979908259591";

// ✅ Verificación webhook (NO tocar)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// 🤖 Recibir y responder mensajes
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 Evento recibido:");
    console.log(JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      const message = value.messages[0];

      const fromRaw = message.from;
      const from = fromRaw.replace(/\D/g, ""); // 🔥 limpia formato número

      const text = message.text?.body;

      console.log("📱 FROM RAW:", fromRaw);
      console.log("📱 FROM LIMPIO:", from);
      console.log("💬 MENSAJE:", text);

      // 🚀 RESPUESTA
      await axios.post(
        `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          text: {
            body: `🔥 Bot activo: ${text}`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 🌐 Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Servidor corriendo"));
