import crypto from 'crypto';

/**
 * Validate Telegram webhook signature
 * @param {string} body - Raw request body
 * @param {object} headers - Request headers
 * @returns {boolean}
 */
export function validateWebhookSignature(body, headers) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedToken = headers['x-telegram-bot-api-secret-token'];
  
  if (!secretToken || !receivedToken) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(secretToken),
    Buffer.from(receivedToken)
  );
}

/**
 * Generate secure room hash (6 characters: A-Z, 2-9)
 * @returns {string}
 */
export function generateRoomHash() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars like I, 1, O, 0
  const bytes = crypto.randomBytes(6);
  let hash = '';
  for (let i = 0; i < 6; i++) {
    hash += chars[bytes[i] % chars.length];
  }
  return hash;
}

/**
 * Send message to Telegram chat
 * @param {number} chatId 
 * @param {string} text 
 * @param {object} options 
 */
export async function sendMessage(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...options,
    }),
  });
  
  return response.json();
}

/**
 * Answer callback query
 * @param {number} callbackQueryId 
 * @param {string} text 
 */
export async function answerCallbackQuery(callbackQueryId, text = '') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}
