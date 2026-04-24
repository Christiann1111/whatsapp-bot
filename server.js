import express from "express";
import axios from "axios";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// 🔐 CONFIG
const VERIFY_TOKEN = "12345";
const ACCESS_TOKEN = "EAATNMGn35f8BRaInM6as7UqJt2AK2pIKOZCwwehZBNZBZCebElSU4D0ZAl1j2JMI4pM4DpX0U6Vm1vWYszhs3pLkZC6GfPjmfBVsSieWKMwLPkTkyXJSUWITwq0iOTT6gpmXFMORF9ATp5QRHuTIFWZBzIy1y2b9uHnSfZCtZBBVfCOuzwd0k4AkrmTga8K8M1PZCZAp72NcNWK73Qy6ZAHQ7YxB4CgVZBMuZBvPsBfER7XQDvN7ByyXmCz2iZAIP1AikFxbhGF6K8HBTCYEnNf78vyCdo4 ";
const PHONE_NUMBER_ID = "1115979908259591";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🤖 OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// 🧠 Memoria en RAM
const conversations = {};

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

// 🤖 Webhook principal
app.post("/webhook", async (req, res) => {
  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;

    if (value?.messages) {
      const message = value.messages[0];

      let from = message.from.replace(/\D/g, "");

      // 🇦🇷 Fix Argentina
      if (from.startsWith("549")) {
        from = "54" + from.slice(3);
      }

      const userText = message.text?.body;

      console.log("📩 Usuario:", from);
      console.log("💬 Mensaje:", userText);

      // 🧠 Inicializar conversación si no existe
      if (!conversations[from]) {
        conversations[from] = [
          {
            role: "system",
            content: `
Sos un asistente de una inmobiliaria.

Tu objetivo es:
- saber si quiere comprar o alquilar
- saber zona
- saber presupuesto
- llevar a agendar visita

Reglas:
- no repetir preguntas
- 1 pregunta por mensaje
- respuestas cortas
- tono humano

Flujo:
1. Saludo
2. Tipo (compra o alquiler)
3. Zona
4. Presupuesto
5. Visita
`
          }
        ];
      }

      // ➕ agregar mensaje del usuario
      conversations[from].push({
        role: "user",
        content: userText
      });

      // 🤖 IA con memoria
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: conversations[from],
      });

      const reply = aiResponse.choices[0].message.content.trim();

      // ➕ guardar respuesta del bot
      conversations[from].push({
        role: "assistant",
        content: reply
      });

      // 📤 Enviar a WhatsApp
      await axios.post(
        `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          text: {
            body: reply,
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
app.listen(PORT, () => console.log("🚀 Bot con IA corriendo"));
