import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔐 VARIABLES (Railway)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
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

// 🤖 IA
async function getAIResponse(message) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sos un asesor inmobiliario. Respondé corto, claro y natural.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "No entendí tu mensaje.";
  } catch (err) {
    console.log("❌ Error IA:", err);
    return "Error con IA";
  }
}

// 📤 Enviar mensaje WhatsApp
async function sendWhatsAppMessage(to, text) {
  try {
    console.log("📤 ENVIANDO A:", to);

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "text",
          text: { body: text },
        }),
      }
    );

    const data = await response.json();

    console.log("📤 STATUS:", response.status);
    console.log("📤 RESPONSE:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("❌ Error enviando mensaje:", err);
  }
}

// 🔗 Enviar a Make
async function sendToMake(data) {
  try {
    if (!MAKE_WEBHOOK_URL) return;

    await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    console.log("📊 Enviado a Make");
  } catch (err) {
    console.log("❌ Error Make:", err);
  }
}

// 🧠 Memoria
const userState = {};

// 📩 Webhook
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const fromRaw = message.from;
    const text = message.text?.body || "";
    const name =
      change?.value?.contacts?.[0]?.profile?.name || "Cliente";

    console.log("📩 Usuario RAW:", fromRaw);
    console.log("💬 Mensaje:", text);

    // 🔥 NORMALIZAR NÚMERO
    let to = fromRaw.replace(/\D/g, "");

    if (to.startsWith("549")) {
      to = "54" + to.slice(3);
    }

    console.log("📱 Usuario NORMALIZADO:", to);

    // evitar loop
    if (userState[to] === text) {
      return res.sendStatus(200);
    }
    userState[to] = text;

    const intent = detectIntent(text);

    // 🤖 IA
    const reply = await getAIResponse(text);
    console.log("🤖 RESPUESTA IA:", reply);

    // 📤 enviar WhatsApp
    await sendWhatsAppMessage(to, reply);

    // 📊 enviar a Make
    await sendToMake({
      from: to,
      name,
      message: text,
      intent,
      date: new Date().toISOString(),
    });

    res.sendStatus(200);
  } catch (error) {
    console.log("❌ Error general:", error);
    res.sendStatus(200);
  }
});

// ✅ Verificación
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// 🚀 Servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Bot FINAL corriendo");
});
