# 🎴 UNO Multiplayer Telegram Mini App

A complete UNO card game with multiplayer support, integrated with Telegram Bot and deployed on Vercel.

## ✨ Features

- **Telegram Bot Integration**: Create and join rooms via bot commands
- **Real-time Multiplayer**: 2-4 players can play together
- **Complete UNO Rules**: All standard cards including Skip, Reverse, Draw 2, Wild, and Wild Draw 4
- **UNO Call System**: Penalty system for forgetting to call UNO
- **Premium UI/UX**: Beautiful animations, glow effects, and responsive design
- **Room Management**: Generate unique room codes, share invite links
- **Cross-platform**: Works on any device with Telegram

## 📁 Project Structure

```
uno-game/
├── public/
│   └── index.html          # Frontend (single-file HTML + CSS + JS)
├── api/
│   └── bot.js              # Telegram webhook handler
├── lib/
│   ├── firebase.js         # Firebase configuration
│   └── telegram.js         # Telegram utilities
├── vercel.json             # Vercel configuration
├── package.json            # Dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 24.x or later
- Vercel account
- Firebase account
- Telegram Bot token

### Step 1: Setup Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Realtime Database (start in test mode)
4. Go to Project Settings → Service Accounts
5. Generate new private key (downloads JSON file)
6. Extract these values from the JSON:
   - `project_id`
   - `client_email`
   - `private_key`

### Step 2: Setup Telegram Bot

1. Open Telegram and chat with [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Save the bot token
5. Optional: Set bot commands with `/setcommands`:
   ```
   newroom - Create a new game room
   join - Join existing room
   rematch - Start a rematch
   status - Check room status
   help - Show help message
   ```

### Step 3: Install Dependencies

```bash
cd uno-game
npm install
```

### Step 4: Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"

TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-here
```

### Step 5: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
npx vercel login

# Deploy
npx vercel --prod
```

Note the deployment URL (e.g., `https://your-app.vercel.app`)

### Step 6: Set Environment Variables in Vercel Dashboard

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `.env`
3. Redeploy the project

### Step 7: Set Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
-H "Content-Type: application/json" \
-d '{"url": "https://your-app.vercel.app/api/bot"}'
```

### Step 8: Test the Bot

1. Open your bot in Telegram
2. Send `/newroom`
3. Click the "Join Game" button
4. Share the room ID with friends
5. Start playing! 🎴

## 🎮 Bot Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/newroom` | Create a new game room | `/newroom` |
| `/join` | Join existing room | `/join ABC123` |
| `/rematch` | Start rematch | `/rematch ABC123` |
| `/status` | Check room status | `/status ABC123` |
| `/help` | Show help message | `/help` |

## 🃏 Game Rules

### Card Types

- **Number Cards (0-9)**: Match by color or number
- **Skip (⊘)**: Skip next player's turn
- **Reverse (⇄)**: Reverse direction of play
- **Draw Two (+2)**: Next player draws 2 cards and is skipped
- **Wild (🌈)**: Choose the color
- **Wild Draw Four (+4)**: Choose color + next player draws 4 cards

### Gameplay

1. Match the top card by color OR value
2. Wild cards can be played anytime
3. When you have 1 card left, press UNO! before ending turn
4. Forgetting to call UNO = +2 cards penalty
5. First player to empty their hand wins!

## 🔐 Security

- Webhook signature validation using `X-Telegram-Bot-Api-Secret-Token`
- Secure room hash generation using `crypto.randomBytes()`
- Environment variables for sensitive data
- HTTPS enforced via Vercel

## 🛠️ Troubleshooting

### Common Issues

#### 1. Bot doesn't respond
- Check if webhook is set correctly: 
  ```bash
  curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
  ```
- Verify environment variables are set in Vercel Dashboard
- Check Vercel function logs

#### 2. BUTTON_TYPE_INVALID error
- We use regular `url` buttons, not `web_app` buttons
- Make sure you're using the latest code

#### 3. Firebase connection error
- Verify service account credentials
- Check Firebase Realtime Database is enabled
- Ensure database rules allow read/write (for testing)

#### 4. Room not found
- Room codes are case-insensitive
- Room might have been deleted or expired

### Firebase Rules for Testing

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Firebase Rules for Production

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": "auth != null || root.child('rooms').child($roomId).child('players').hasChild(auth.uid)",
        "players": {
          "$playerId": {
            ".write": "$playerId === auth.uid"
          }
        }
      }
    }
  }
}
```

## 📝 API Reference

### Telegram Webhook Endpoint

**POST** `/api/bot`

Receives updates from Telegram Bot API.

Headers required in production:
- `X-Telegram-Bot-Api-Secret-Token`: Your webhook secret

### Frontend Routes

**GET** `/:roomId`

Main game interface. Automatically joins the room specified in the URL.

Example: `https://your-app.vercel.app/ABC123`

## 🎨 Customization

### Change Colors

Edit CSS variables in `public/index.html`:

```css
:root {
    --red: #ff5555;
    --yellow: #ffaa00;
    --green: #55aa55;
    --blue: #5555ff;
}
```

### Modify Room Hash Length

Edit `generateRoomHash()` in `lib/telegram.js`:

```javascript
const bytes = crypto.randomBytes(6); // Change to 8 for longer codes
```

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review Vercel function logs
3. Check Firebase console for database errors

---

Made with ❤️ for UNO lovers everywhere!
