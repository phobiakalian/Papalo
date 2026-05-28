import { db } from '../../lib/firebase.js';
import { ref, set, get, update } from 'firebase-admin/database';
import { validateWebhookSignature, generateRoomHash, sendMessage } from '../../lib/telegram.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get raw body for signature validation
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  
  // Validate webhook signature (skip in development)
  if (process.env.VERCEL_ENV === 'production') {
    if (!validateWebhookSignature(rawBody, headers)) {
      console.log('Invalid webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  let update;
  try {
    update = JSON.parse(rawBody);
  } catch (error) {
    console.error('Parse error:', error);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.log('Received update:', JSON.stringify(update, null, 2));

  try {
    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const user = message.from;

  // Parse command
  const parts = text.split(' ');
  const command = parts[0].toLowerCase();

  switch (command) {
    case '/newroom':
      await handleNewRoom(chatId, user);
      break;
    
    case '/join':
      await handleJoin(chatId, user, parts[1]);
      break;
    
    case '/rematch':
      await handleRematch(chatId, user, parts[1]);
      break;
    
    case '/status':
      await handleStatus(chatId, user, parts[1]);
      break;
    
    case '/help':
      await handleHelp(chatId, user);
      break;
    
    case '/start':
      await handleStart(chatId, user);
      break;
    
    default:
      // Check if message contains a room hash
      const hashMatch = text.match(/\b([A-Z2-9]{6})\b/);
      if (hashMatch) {
        await handleJoin(chatId, user, hashMatch[1]);
      } else {
        await handleHelp(chatId, user);
      }
  }
}

async function handleNewRoom(chatId, user) {
  // Generate unique room hash
  let roomHash;
  let exists = true;
  
  while (exists) {
    roomHash = generateRoomHash();
    const roomRef = ref(db, `rooms/${roomHash}`);
    const snapshot = await get(roomRef);
    exists = snapshot.exists();
  }

  // Create room in Firebase
  const roomData = {
    id: roomHash,
    host: String(user.id),
    status: 'lobby',
    createdAt: Date.now(),
    chatInfo: {
      id: chatId,
      title: user.first_name || 'Private Chat'
    },
    round: 1,
    currentTurn: null,
    activeColor: 'NONE',
    direction: 1,
    deck: [],
    discardPile: [],
    winner: null,
    pendingTurn: false,
    pendingCard: null,
    players: {
      [String(user.id)]: {
        name: user.first_name + (user.last_name ? ' ' + user.last_name : ''),
        telegramId: user.id,
        photoUrl: user.photo?.photo_url || '',
        hand: [],
        isConnected: true,
        hasCalledUno: false,
        joinOrder: 1,
        isHost: true,
        lastSeen: Date.now()
      }
    },
    log: [`Room created by ${user.first_name}`]
  };

  await set(ref(db, `rooms/${roomHash}`), roomData);

  // Get Vercel URL from request or use placeholder
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'https://your-app.vercel.app';

  const gameUrl = `${baseUrl}/${roomHash}`;

  // Send message with button
  await sendMessage(chatId, 
    `🎴 *UNO Game Created!* 🎴\n\n` +
    `Room ID: *${roomHash}*\n\n` +
    `Share this room ID with your friends or use the button below to join!\n\n` +
    `_Waiting for players... (2-4 players)_`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🎮 Join Game',
            url: gameUrl
          }
        ]]
      }
    }
  );
}

async function handleJoin(chatId, user, roomHash) {
  if (!roomHash) {
    await sendMessage(chatId, '❌ Please provide a room ID.\n\nUsage: /join ABC123');
    return;
  }

  roomHash = roomHash.toUpperCase();

  // Check if room exists
  const roomRef = ref(db, `rooms/${roomHash}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    await sendMessage(chatId, `❌ Room *${roomHash}* not found!\n\nUse /newroom to create a new room.`, {
      parse_mode: 'Markdown'
    });
    return;
  }

  const roomData = snapshot.val();

  if (roomData.status !== 'lobby') {
    await sendMessage(chatId, `❌ Game in room *${roomHash}* has already started!`, {
      parse_mode: 'Markdown'
    });
    return;
  }

  // Check if player already in room
  const playerId = String(user.id);
  if (roomData.players && roomData.players[playerId]) {
    await sendMessage(chatId, `✅ You're already in room *${roomHash}*!`, {
      parse_mode: 'Markdown'
    });
  } else {
    // Add player to room
    const playerCount = Object.keys(roomData.players || {}).length;
    
    if (playerCount >= 4) {
      await sendMessage(chatId, `❌ Room *${roomHash}* is full! (max 4 players)`, {
        parse_mode: 'Markdown'
      });
      return;
    }

    await update(roomRef, {
      [`players/${playerId}`]: {
        name: user.first_name + (user.last_name ? ' ' + user.last_name : ''),
        telegramId: user.id,
        photoUrl: user.photo?.photo_url || '',
        hand: [],
        isConnected: true,
        hasCalledUno: false,
        joinOrder: playerCount + 1,
        isHost: false,
        lastSeen: Date.now()
      },
      log: [...(roomData.log || []), `${user.first_name} joined the room`]
    });
  }

  // Get Vercel URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'https://your-app.vercel.app';

  const gameUrl = `${baseUrl}/${roomHash}`;

  await sendMessage(chatId,
    `✅ Joined room *${roomHash}*!\n\n` +
    `Click the button below to open the game!`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🎮 Open Game',
            url: gameUrl
          }
        ]]
      }
    }
  );
}

async function handleRematch(chatId, user, roomHash) {
  if (!roomHash) {
    await sendMessage(chatId, '❌ Please provide a room ID.\n\nUsage: /rematch ABC123');
    return;
  }

  roomHash = roomHash.toUpperCase();

  const roomRef = ref(db, `rooms/${roomHash}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    await sendMessage(chatId, `❌ Room *${roomHash}* not found!`, {
      parse_mode: 'Markdown'
    });
    return;
  }

  const roomData = snapshot.val();

  // Reset room for new game
  await update(roomRef, {
    status: 'lobby',
    currentTurn: null,
    activeColor: 'NONE',
    deck: [],
    discardPile: [],
    winner: null,
    round: (roomData.round || 1) + 1,
    players: Object.fromEntries(
      Object.entries(roomData.players || {}).map(([id, player]) => [
        id,
        {
          ...player,
          hand: [],
          hasCalledUno: false,
          isConnected: true,
          lastSeen: Date.now()
        }
      ])
    ),
    log: [...(roomData.log || []), `Rematch started - Round ${(roomData.round || 1) + 1}`]
  });

  await sendMessage(chatId,
    `🔄 Rematch started for room *${roomHash}*!\n\n` +
    `Round: ${(roomData.round || 1) + 1}\n` +
    `All players can rejoin using the button below.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🎮 Rejoin Game',
            url: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-app.vercel.app'}/${roomHash}`
          }
        ]]
      }
    }
  );
}

async function handleStatus(chatId, user, roomHash) {
  if (!roomHash) {
    await sendMessage(chatId, '❌ Please provide a room ID.\n\nUsage: /status ABC123');
    return;
  }

  roomHash = roomHash.toUpperCase();

  const roomRef = ref(db, `rooms/${roomHash}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    await sendMessage(chatId, `❌ Room *${roomHash}* not found!`, {
      parse_mode: 'Markdown'
    });
    return;
  }

  const roomData = snapshot.val();
  const players = Object.values(roomData.players || {});

  let statusText = `📊 Room *${roomHash}* Status:\n\n`;
  statusText += `Status: *${roomData.status}*\n`;
  statusText += `Round: ${roomData.round || 1}\n`;
  statusText += `Players: ${players.length}/4\n\n`;
  statusText += `*Players:*\n`;
  
  players.forEach((player, index) => {
    const hostBadge = player.isHost ? ' 👑' : '';
    const onlineStatus = player.isConnected ? '🟢' : '🔴';
    statusText += `${index + 1}. ${onlineStatus} ${player.name}${hostBadge}\n`;
  });

  if (roomData.status === 'playing') {
    const currentPlayer = players.find(p => p.telegramId.toString() === roomData.currentTurn);
    statusText += `\nCurrent turn: *${currentPlayer?.name || 'Unknown'}*\n`;
  }

  await sendMessage(chatId, statusText, {
    parse_mode: 'Markdown'
  });
}

async function handleHelp(chatId, user) {
  const helpText = `🎴 *UNO Bot Commands*\n\n` +
    `/newroom - Create a new game room\n` +
    `/join <CODE> - Join existing room (e.g., /join ABC123)\n` +
    `/rematch <CODE> - Start rematch in existing room\n` +
    `/status <CODE> - Check room status\n` +
    `/help - Show this help message\n\n` +
    `*How to play:*\n` +
    `1. Create or join a room\n` +
    `2. Share room ID with friends\n` +
    `3. Wait for host to start game\n` +
    `4. Match cards by color or number\n` +
    `5. First to empty hand wins!\n\n` +
    `⚠️ Don't forget to call UNO when you have 1 card!`;

  await sendMessage(chatId, helpText, {
    parse_mode: 'Markdown'
  });
}

async function handleStart(chatId, user) {
  await sendMessage(chatId,
    `👋 Welcome to UNO Bot!\n\n` +
    `I can help you create and manage UNO game rooms.\n\n` +
    `Use /newroom to create a new game or /help to see all commands.`
  );
}

async function handleCallbackQuery(callbackQuery) {
  // Handle callback queries if needed
  const { id, message, data } = callbackQuery;
  
  // Answer callback query
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: id,
    }),
  });
}
