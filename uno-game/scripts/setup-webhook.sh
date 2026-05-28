#!/bin/bash

# 🧪 Testing Scripts for UNO Telegram Bot
# Replace <YOUR_BOT_TOKEN> with your actual bot token

BOT_TOKEN="<YOUR_BOT_TOKEN>"
VERCEL_URL="your-app.vercel.app"
WEBHOOK_SECRET="your-webhook-secret"

echo "🎴 UNO Bot Testing Script"
echo "=========================="
echo ""

# 1. Set Webhook
echo "📡 Setting webhook..."
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
-H "Content-Type: application/json" \
-d "{\"url\": \"https://${VERCEL_URL}/api/bot\"}"
echo ""
echo ""

# 2. Verify Webhook
echo "✅ Verifying webhook..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .
echo ""
echo ""

# 3. Set Bot Commands
echo "⚙️ Setting bot commands..."
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands" \
-H "Content-Type: application/json" \
-d '{
  "commands": [
    {"command": "newroom", "description": "Create a new game room"},
    {"command": "join", "description": "Join existing room"},
    {"command": "rematch", "description": "Start a rematch"},
    {"command": "status", "description": "Check room status"},
    {"command": "help", "description": "Show help message"}
  ]
}'
echo ""
echo ""

# 4. Get Bot Info
echo "🤖 Getting bot info..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe" | jq .
echo ""
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Open your bot in Telegram"
echo "2. Send /newroom to create a game"
echo "3. Share the room ID with friends"
echo "4. Start playing! 🎴"
