import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔐 Verificación de Meta (NO tocar)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "12345";

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

    // 👉 Solo si hay mensaje real
    if (value?.messages) {
      const message = value.messages[0];
      const from = message.from;
      const text = message.text?.body;

      console.log("Mensaje:", text);

      // 🚀 RESPUESTA AUTOMÁTICA
      await axios.post(
        "https://graph.facebook.com/v18.0/1115979908259591/messages",
        {
          messaging_product: "whatsapp",
          to: from,
          text: {
            body: "🔥 Bot activo: " + text
          }
        },
        {
          headers: {
            Authorization: "Bearer EAATNMGn35f8BRRmCiQQTsCwEScZAPwhFfQGD3rjWk2gEGZCiyGnaEqeFVrFPRNSM9O7yjR6qqlugf2Cnr9wpdRU2rS5LyX2n2ziRtwDDClI1BZCP3Ppgq499yE1ZCB7mqBN9k1zhAGP7ejVx1yD75xrnJ510V3DZB9jacO1HQhvDb8I2L75dVtSBz65DSshE4C4P7XUc5Ikl5VWV2uuYjW7CBkpeMXByb5axbzZBEFahcrbIQMdEbzZAryk3bwxhpQHFW8AU0F5Y3L4zSNiPiqK",
            "Content-Type": "application/json"
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 🌐 Puerto (importante para Railway)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor corriendo"));
