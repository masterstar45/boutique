import TelegramBot from "node-telegram-bot-api";
import { logger } from "./logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

let bot: TelegramBot | null = null;
let botUsername: string | null = null;
let miniAppBaseUrl: string | null = null;

export function getBot(): TelegramBot | null {
  return bot;
}

export function getBotUsername(): string | null {
  return botUsername;
}

export function getMiniAppBaseUrl(): string | null {
  return miniAppBaseUrl;
}

export function setMiniAppBaseUrl(url: string): void {
  miniAppBaseUrl = url;
}

export function initBot(webhookUrl?: string): TelegramBot | null {
  if (!BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — bot disabled");
    return null;
  }

  if (webhookUrl) {
    bot = new TelegramBot(BOT_TOKEN, { webHook: { port: 0 } });
    bot.setWebHook(`${webhookUrl}/api/telegram-webhook`);
    logger.info({ webhookUrl }, "Telegram bot initialized with webhook");
  } else {
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
    logger.info("Telegram bot initialized (no webhook)");
  }

  // Fetch and cache bot username
  bot.getMe().then(me => {
    botUsername = me.username ?? null;
    logger.info({ botUsername }, "Bot username cached");
  }).catch(err => {
    logger.warn({ err }, "Could not fetch bot username");
  });

  return bot;
}

export async function sendStartMessage(
  chatId: number,
  username: string | undefined,
  userId: number,
  balance: string,
  miniAppUrl: string
): Promise<void> {
  if (!bot) return;

  const now = new Date().toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const uname = username ? `@${username}` : `User ${userId}`;
  const balanceFormatted = parseFloat(balance || "0").toFixed(2);

  const text =
`╔══════════════════════════════╗
║          🏦B/\\NK$DATA🏦         
╚══════════════════════════════╝

🎯 Bienvenue ${uname} !

━━━━━━━━━━━━━━━━━
📊 INFORMATIONS UTILISATEUR
━━━━━━━━━━━━━━━━━

👤 Username : ${uname}
🆔 User ID : ${userId}
💰 Solde : ${balanceFormatted} €
📅 Date : ${now}
🌍 Fuseau : Europe/Paris

━━━━━━━━━━━━━━━━━

💡 Cliquez sur le bouton ci-dessous pour accéder à votre espace`;

  await bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🛒 Accéder à la boutique",
            web_app: { url: miniAppUrl },
          },
        ],
        [
          {
            text: "💰 Recharger mon solde",
            callback_data: "recharge_balance",
          },
        ],
      ],
    },
  });
}

export async function sendOrderConfirmation(
  telegramId: string,
  orderId: number,
  amount: string,
  productNames: string[]
): Promise<void> {
  if (!bot) return;
  const text = `✅ *Commande #${orderId} confirmée !*\n\n💰 Montant : ${amount} €\n📦 Produits : ${productNames.join(", ")}\n\nVos fichiers sont disponibles dans l'app.`;
  await bot.sendMessage(parseInt(telegramId), text, { parse_mode: "Markdown" });
}

export async function sendPaymentConfirmation(
  telegramId: string,
  orderId: number,
  amount: string
): Promise<void> {
  if (!bot) return;
  const text = `🎉 *Paiement reçu !*\n\n✅ Votre paiement de *${amount}* a été confirmé.\n📦 Commande #${orderId} prête au téléchargement !`;
  await bot.sendMessage(parseInt(telegramId), text, { parse_mode: "Markdown" });
}

async function notifyAdmin(text: string): Promise<void> {
  if (!bot || !ADMIN_CHAT_ID) return;
  const ids = ADMIN_CHAT_ID.split(",").map(s => s.trim()).filter(Boolean);
  for (const id of ids) {
    try {
      await bot.sendMessage(parseInt(id), text, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err, chatId: id }, "Failed to send admin Telegram notification");
    }
  }
}

export async function notifyAdminDeposit(params: {
  username: string;
  telegramId: string;
  amount: string;
  currency: string;
  newBalance: string;
}): Promise<void> {
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  await notifyAdmin(
    `💳 *NOUVEAU DÉPÔT CONFIRMÉ*\n\n` +
    `👤 Client : @${params.username || params.telegramId}\n` +
    `🆔 Telegram ID : \`${params.telegramId}\`\n` +
    `💰 Montant : *${parseFloat(params.amount).toFixed(2)} €* (${params.currency})\n` +
    `💼 Nouveau solde : *${parseFloat(params.newBalance).toFixed(2)} €*\n` +
    `🕐 Date : ${now}`
  );
}

export async function notifyAdminOrder(params: {
  username: string;
  telegramId: string;
  orderId: number;
  amount: string;
  productNames: string[];
}): Promise<void> {
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  await notifyAdmin(
    `🛒 *NOUVELLE COMMANDE PAYÉE*\n\n` +
    `👤 Client : @${params.username || params.telegramId}\n` +
    `🆔 Telegram ID : \`${params.telegramId}\`\n` +
    `📦 Commande : *#${params.orderId}*\n` +
    `💰 Montant : *${parseFloat(params.amount).toFixed(2)} €*\n` +
    `🗂 Produits : ${params.productNames.join(", ")}\n` +
    `🕐 Date : ${now}`
  );
}

export async function notifyAdminNewUser(params: {
  username: string;
  telegramId: string;
  firstName: string;
}): Promise<void> {
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  await notifyAdmin(
    `👤 *NOUVEL UTILISATEUR*\n\n` +
    `👤 Nom : ${params.firstName}\n` +
    `🔗 Username : @${params.username || "—"}\n` +
    `🆔 Telegram ID : \`${params.telegramId}\`\n` +
    `🕐 Date : ${now}`
  );
}

export async function sendAdminCreditNotification(
  telegramId: string,
  amount: string,
  newBalance: string,
  note: string | null,
): Promise<void> {
  if (!bot) return;

  const noteSection = note ? `\n📝 Note : _${note}_` : "";

  const text = `╔══════════════════════════════╗
║      💎 CRÉDIT ADMIN          ║
╚══════════════════════════════╝

✅ *Votre solde a été crédité par un administrateur !*

━━━━━━━━━━━━━━━━━
💰 Montant crédité : *+${parseFloat(amount).toFixed(2)} €*
💼 Nouveau solde : *${parseFloat(newBalance).toFixed(2)} €*
━━━━━━━━━━━━━━━━━${noteSection}

Votre solde est disponible immédiatement sur *BANK\\$DATA* 🛒`;

  const replyMarkup: TelegramBot.SendMessageOptions["reply_markup"] = miniAppBaseUrl
    ? {
        inline_keyboard: [
          [{ text: "🛒 Accéder à la boutique", web_app: { url: miniAppBaseUrl } }],
        ],
      }
    : undefined;

  await bot.sendMessage(parseInt(telegramId), text, {
    parse_mode: "Markdown",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function sendDepositConfirmation(
  telegramId: string,
  amount: string,
  newBalance: string,
  _currency: string
): Promise<void> {
  if (!bot) return;

  const text = `╔══════════════════════════════╗
║      💳 DÉPÔT CONFIRMÉ       ║
╚══════════════════════════════╝

✅ *Votre dépôt a bien été reçu !*

━━━━━━━━━━━━━━━━━
💰 Montant déposé : *+${parseFloat(amount).toFixed(2)} €*
💼 Nouveau solde : *${parseFloat(newBalance).toFixed(2)} €*
━━━━━━━━━━━━━━━━━

Votre solde a été crédité instantanément.
Vous pouvez maintenant effectuer vos achats sur *BANK\\$DATA* 🛒`;

  const replyMarkup: TelegramBot.SendMessageOptions["reply_markup"] = miniAppBaseUrl
    ? {
        inline_keyboard: [
          [
            {
              text: "🛒 Accéder à la boutique",
              web_app: { url: miniAppBaseUrl },
            },
          ],
        ],
      }
    : undefined;

  await bot.sendMessage(parseInt(telegramId), text, {
    parse_mode: "Markdown",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}
