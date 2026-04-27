import express from "express";
import axios from "axios";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// 🔐 VARIABLES (Railway)
const VERIFY_TOKEN = "12345";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

// 🧠 Detectar intención
function detectIntent(text) {
  text = text.toLowerCase();

  if (text.includes("alquilar")) return "alquiler";
  if (text.includes("comprar")) return "compra";
  if (text.includes("ver")) return "lead_caliente";

  return "general";
}

// 🤖 IA (OpenAI)
async function getAIResponse(message) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sos un asesor inmobiliario. Respondé corto, claro y natural."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "No entendí tu mensaje.";
  } catch (err) {
    console.log("Error IA:", err);
    return "Hubo un error con la IA.";
  }
}

// 📤 Enviar mensaje WhatsApp
async function sendWhatsAppMessage(to, text) {
  console.log("📤 ENTRANDO A WHATSAPP:", to, text);

async function sendWhatsAppMessage(to, text) {
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text }
      })
    });

    const data = await response.json();

    console.log("📤 WHATSAPP STATUS:", response.status);
    console.log("📤 WHATSAPP RESPONSE:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.log("❌ Error enviando mensaje:", err);
  }
}
// 🔗 Enviar a Make
async function sendToMake(data) {
  try {
    await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.log("Error enviando a Make:", err);
  }
}

// 🧠 Memoria simple (evitar bucles)
const userState = {};

// 📩 Webhook WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body || "";
      const name = change?.value?.contacts?.[0]?.profile?.name || "Cliente";

      console.log("📩 Usuario:", from);
      console.log("💬 Mensaje:", text);

      // 🚫 evitar responder varias veces seguidas
      if (userState[from] === text) {
        return res.sendStatus(200);
      }
      userState[from] = text;

      const intent = detectIntent(text);

      // 🤖 respuesta IA
      const reply = await getAIResponse(text);
      console.log("🤖 RESPUESTA IA:", reply);

      // 📤 enviar respuesta
      await sendWhatsAppMessage(from, reply);

      // 📊 enviar a Make
      await sendToMake({
        from,
        name,
        message: text,
        intent,
        date: new Date().toISOString()
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.log("❌ Error:", error);
    res.sendStatus(500);
  }
});

// ✅ Verificación webhook
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

// 🚀 Servidor
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Bot VERSION 2 con IA corriendo");
});
