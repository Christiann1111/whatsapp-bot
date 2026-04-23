from flask import Flask, request
import requests

app = Flask(__name__)

VERIFY_TOKEN = "12345"
ACCESS_TOKEN = "TU_TOKEN"
PHONE_NUMBER_ID = "TU_PHONE_ID"

# 🔐 Verificación
@app.route("/webhook", methods=["GET"])
def verify():
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode and token == VERIFY_TOKEN:
        return challenge, 200
    return "Error", 403

# 🤖 Recibir mensajes
@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    print("📩 Evento:", data)

    try:
        message = data["entry"][0]["changes"][0]["value"]["messages"][0]
        from_number = message["from"]
        text = message["text"]["body"]

        print("Mensaje:", text)

        url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"

        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }

        payload = {
            "messaging_product": "whatsapp",
            "to": from_number,
            "text": {"body": f"🔥 Bot activo: {text}"}
        }

        requests.post(url, json=payload, headers=headers)

    except Exception as e:
        print("❌ Error:", e)

    return "ok", 200

if __name__ == "__main__":
    app.run(port=5000)
