import TelegramBot from "node-telegram-bot-api";
import { logger } from "./logger";
import { db, usersTable, botButtonsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";
import fs from "fs";
import path from "path";
import os from "os";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

let bot: TelegramBot | null = null;
let botUsername: string | null = null;
let miniAppBaseUrl: string | null = null;
const storageService = new ObjectStorageService();
const securityAlertCooldowns = new Map<string, number>();

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
      inline_keyboard: await buildStartKeyboard(miniAppUrl),
    },
  });
}

async function buildStartKeyboard(miniAppUrl: string): Promise<TelegramBot.InlineKeyboardButton[][]> {
  // Default button always present
  const defaultBtn: TelegramBot.InlineKeyboardButton = {
    text: "🛒 Accéder à la boutique",
    web_app: { url: miniAppUrl },
  };

  try {
    const buttons = await db.select().from(botButtonsTable)
      .where(eq(botButtonsTable.isActive, true))
      .orderBy(asc(botButtonsTable.sortOrder), asc(botButtonsTable.id));

    if (buttons.length === 0) {
      return [[defaultBtn]];
    }

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [[defaultBtn]];
    const rowGroups = new Map<number, TelegramBot.InlineKeyboardButton[]>();
    for (const btn of buttons) {
      const button: TelegramBot.InlineKeyboardButton = btn.isWebApp
        ? { text: btn.label, web_app: { url: btn.url } }
        : { text: btn.label, url: btn.url };
      const rowNum = btn.row ?? 0;
      if (!rowGroups.has(rowNum)) rowGroups.set(rowNum, []);
      rowGroups.get(rowNum)!.push(button);
    }
    const sortedRows = [...rowGroups.entries()].sort((a, b) => a[0] - b[0]);
    for (const [, rowButtons] of sortedRows) {
      keyboard.push(rowButtons);
    }
    return keyboard;
  } catch (err) {
    logger.warn({ err }, "Failed to load bot buttons from DB, using default");
    return [[defaultBtn]];
  }
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
  try {
    await bot.sendMessage(parseInt(telegramId), text, { parse_mode: "Markdown" });
  } catch (err) {
    logger.warn({ err, telegramId }, "Failed to send payment confirmation with Markdown, retrying plain text");
    await bot.sendMessage(parseInt(telegramId), text);
  }
}

export async function sendOrderDeliveryLinks(
  telegramId: string,
  orderId: number,
  amount: string,
  links: Array<{ productName: string; url: string }>,
): Promise<void> {
  if (!bot || links.length === 0) return;

  const lines = links.map((item, index) => `${index + 1}. ${item.productName}\n${item.url}`).join("\n\n");
  const text =
`╔══════════════════════════════╗
║      📦 COMMANDE LIVRÉE      ║
╚══════════════════════════════╝

✅ Paiement confirmé pour la commande #${orderId}
💰 Montant : ${parseFloat(amount).toFixed(2)} €

🔗 Liens de téléchargement :

${lines}

⚠️ Ces liens sont temporaires et limités en nombre de téléchargements.`;

  await bot.sendMessage(parseInt(telegramId), text);
}

export async function sendOrderDeliveryFiles(
  telegramId: string,
  orderId: number,
  files: Array<{ productName: string; buffer: Buffer; fileName: string }>,
): Promise<{ sent: number; total: number }> {
  if (!bot) {
    logger.warn({ telegramId, orderId }, "Bot not initialized, cannot send delivery files");
    return { sent: 0, total: files.length };
  }

  if (files.length === 0) {
    logger.warn({ telegramId, orderId }, "No files to deliver");
    return { sent: 0, total: 0 };
  }

  logger.info({ telegramId, orderId, fileCount: files.length }, "Starting direct buffer file delivery");

  const chatId = Number(telegramId);
  if (!Number.isFinite(chatId)) {
    logger.error({ telegramId, orderId }, "Invalid telegramId for file delivery");
    return { sent: 0, total: files.length };
  }

  let sent = 0;

  for (const file of files) {
    // Write buffer to a temp file, then send the stream — most reliable with node-telegram-bot-api
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `tg_${orderId}_${Date.now()}_${file.fileName}`);
    try {
      logger.info({ telegramId, orderId, productName: file.productName, fileName: file.fileName, bufferSize: file.buffer.length }, "Sending file via temp file to Telegram");

      fs.writeFileSync(tmpFile, file.buffer);
      const stream = fs.createReadStream(tmpFile);

      await bot.sendDocument(chatId, stream, {
        caption: `📦 Commande #${orderId}\n🗂 Produit: ${file.productName}`,
      }, {
        filename: file.fileName,
        contentType: "text/plain",
      });

      logger.info({ telegramId, orderId, productName: file.productName }, "File sent successfully via stream");
      sent += 1;
    } catch (err) {
      logger.error({ err, telegramId, orderId, productName: file.productName, fileName: file.fileName }, "Failed to deliver file via stream, trying text fallback");

      // Fallback: send as plain text message if the content is small enough (<4000 chars)
      try {
        const textContent = file.buffer.toString("utf-8").trim();
        if (textContent.length > 0 && textContent.length < 4000) {
          await bot.sendMessage(chatId, `📦 Commande #${orderId}\n🗂 Produit: ${file.productName}\n\n${textContent}`);
          logger.info({ telegramId, orderId, productName: file.productName }, "Content sent as text message fallback");
          sent += 1;
        } else {
          logger.warn({ telegramId, orderId, productName: file.productName, contentLength: textContent.length }, "Text fallback skipped — content too large or empty");
        }
      } catch (fallbackErr) {
        logger.error({ err: fallbackErr, telegramId, orderId, productName: file.productName }, "Text fallback also failed");
      }
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch {} 
    }
  }

  logger.info({ telegramId, orderId, sent, total: files.length }, `File delivery completed: ${sent}/${files.length}`);
  return { sent, total: files.length };
}

async function notifyAdmin(text: string): Promise<void> {
  if (!bot) return;

  // Collect admin IDs from both environment variable and database
  const adminIds = new Set<string>();

  // Add IDs from environment variable (TELEGRAM_ADMIN_CHAT_ID)
  if (ADMIN_CHAT_ID) {
    ADMIN_CHAT_ID.split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(id => adminIds.add(id));
  }

  // Add IDs from database (users with isAdmin=true and telegramId set)
  try {
    const dbAdmins = await db.select({ telegramId: usersTable.telegramId })
      .from(usersTable)
      .where(eq(usersTable.isAdmin, true));

    for (const admin of dbAdmins) {
      if (admin.telegramId) {
        adminIds.add(admin.telegramId);
      }
    }
  } catch (err) {
    logger.warn({ err }, "Failed to fetch admin IDs from database");
  }

  // Send to all collected admin IDs
  for (const id of adminIds) {
    try {
      await bot.sendMessage(parseInt(id), text, { parse_mode: "Markdown" });
    } catch (err) {
      logger.warn({ err, chatId: id }, "Failed to send admin Telegram notification with Markdown, retrying plain text");
      try {
        await bot.sendMessage(parseInt(id), text);
      } catch (retryErr) {
        logger.error({ err: retryErr, chatId: id }, "Failed to send admin Telegram notification");
      }
    }
  }
}

export async function notifyAdminSecurityEvent(
  title: string,
  details: Record<string, string | number | boolean | null | undefined> = {},
): Promise<void> {
  if (!bot) return;

  const key = `${title}:${JSON.stringify(details)}`;
  const now = Date.now();
  const cooldownMs = 5 * 60 * 1000;
  const lastSentAt = securityAlertCooldowns.get(key) ?? 0;
  if (now - lastSentAt < cooldownMs) return;
  securityAlertCooldowns.set(key, now);

  const when = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const lines = Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([k, v]) => `• ${k}: ${String(v)}`)
    .join("\n");

  const text =
    `🚨 *ALERTE SÉCURITÉ*\n\n` +
    `*${title}*\n` +
    (lines ? `${lines}\n` : "") +
    `🕐 ${when}`;

  await notifyAdmin(text);
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

  try {
    await bot.sendMessage(parseInt(telegramId), text, {
      parse_mode: "Markdown",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  } catch (err) {
    logger.warn({ err, telegramId }, "Failed to send deposit confirmation with Markdown, retrying plain text");
    await bot.sendMessage(parseInt(telegramId), text, {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }
}
