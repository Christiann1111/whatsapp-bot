import express from "express";
import axios from "axios";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// 🔐 CONFIG
const VERIFY_TOKEN = "12345";
const ACCESS_TOKEN = "EAATNMGn35f8BRfxoWe5lXotTt1xg8mGKCvBntyD8ZBmYb6LAjKc1WfUW4sqA3zWelG1GLZBTjk6SMIZB8xznyuGvCVxS9jZC6OkwmrS5FlNQrAiQxGC1u8KGZAAcEsLnJ2dV0XamaZBFHrAqSHRhizvxyjn6NLQlpacZAyEYF70QdtDQ8OKEZC3YXyEJxrJaIwXJKqaZCxk3TZAdpmKUiO5GWe1Uc6uAXnPjXJxuLNM9mvM9jrALEorrKhcmRvcZB8EVg2KZCJmpbwo70s0yxq7iwGlV";
const PHONE_NUMBER_ID = "1115979908259591";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🤖 Inicializar OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ✅ Verificación
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

// 🤖 Webhook
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

      console.log("Mensaje usuario:", userText);

      // 🧠 LLAMADA A IA
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "Sos un asistente útil, amable y profesional para WhatsApp.",
          },
          {
            role: "user",
            content: userText,
          },
        ],
      });

      const reply =
        aiResponse.choices[0].message.content || "No pude responder 😅";

      // 📤 Enviar respuesta
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Bot con IA corriendo"));
