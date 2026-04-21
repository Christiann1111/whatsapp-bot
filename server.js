import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔐 CONFIG (pegá tus datos acá)
const VERIFY_TOKEN = "12345";
const ACCESS_TOKEN = "EAATNMGn35f8BRbHngzevp58DZAOwmlB5KhBXRxQsFMFU1xX4V38hPSmuzi6pZBZBf4DPNi64CyDTUcayUFL9j6AukgkOAhJhttC6aozzBQRDZB3QII76KCZAM94gFyOH2CSUqlETjSo8k1s5b6ZBLBu7RmgZBX9E0OvdefknXMAxlWx7vNmzeo6LlpT6qIuz9QphiYZB1hq9oNkYvwP8kzucoRzd9vI7RggCd8pe7BAoZBGTv7U4jCekaURQDZBR3xQ7hZBHfibMnXT86DTzz4KCLRN";
const PHONE_NUMBER_ID = "1115979908259591";

// ✅ Verificación de webhook
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

// 📩 Recibir mensajes
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 Evento recibido:");
    console.log(JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      const fromRaw = message.from;
      const from = fromRaw.replace(/\D/g, ""); // 🔥 limpia el número
      const text = message.text?.body;

      console.log("📱 FROM RAW:", fromRaw);
      console.log("📱 FROM LIMPIO:", from);
      console.log("💬 MENSAJE:", text);

      // 📤 Responder
      await fetch(
        `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            text: {
              body: `🔥 Bot activo: ${text}`,
            },
          }),
        }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Servidor corriendo"));
