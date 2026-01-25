import { Telegraf, Context } from "telegraf";
import { QuantXClient } from "quantx-sdk";
import * as dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";

// 1. Setup & Config
dotenv.config();

// Fix BigInt serialization for logs
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

if (!process.env.BOT_TOKEN || !process.env.BOT_SECRET_KEY) {
  throw new Error("Missing BOT_TOKEN or BOT_SECRET_KEY in .env");
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// 2. Initialize your SDK
console.log("🚀 Initializing QuantX SDK...");
const client = new QuantXClient({
  network: "TESTNET",
  contractId: process.env.CONTRACT_ID!,
  wallet: {
    secretKey: process.env.BOT_SECRET_KEY,
  },
});

const BOT_ADDRESS = Keypair.fromSecret(process.env.BOT_SECRET_KEY).publicKey();
console.log(`🤖 Bot Wallet Address: ${BOT_ADDRESS}`);

// --- COMMANDS ---

// 1. Start Command
bot.start((ctx) => {
  ctx.reply(
    `👋 Welcome to QuantX Bot!\n\n` +
    `I am running on Stellar Testnet.\n` +
    `My Address: \`${BOT_ADDRESS}\`\n\n` +
    `Commands:\n` +
    `/subscribe - Create a test subscription (Self-Pay)\n` +
    `/check <ID> - Check subscription status`,
    { parse_mode: "Markdown" }
  );
});

// 2. Subscribe Command (Write Transaction)
bot.command("subscribe", async (ctx) => {
  ctx.reply("⏳ Creating Subscription... Please wait (10-20s)...");

  try {
    // For this demo, the bot subscribes to ITSELF to test the SDK
    // In a real app, you might let the user paste an address
    const result = await client.subscribe({
      recipient: BOT_ADDRESS, // Sending to self for testing
      token: process.env.USDC_TOKEN!,
      amount: "1", // 1 USDC
      interval: 300, // 5 mins
      subType: 0, // AutoPay
    });

    ctx.reply(
      `✅ **Subscription Created!**\n\n` +
      `🔗 **Hash:** [View on Explorer](https://stellar.expert/explorer/testnet/tx/${result.hash})\n`,
      { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
    );
  } catch (error: any) {
    console.error(error);
    let msg = error.message || "Unknown error";
    
    if (msg.includes("timeout")) {
      ctx.reply("⚠️ Transaction sent, but network is slow. Check explorer manually.");
    } else {
      ctx.reply(`❌ Error: ${msg}`);
    }
  }
});

// 3. Check Command (Read Transaction)
bot.command("check", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  if (parts.length !== 2) {
    return ctx.reply("Usage: /check <SubscriptionID>");
  }

  const id = parts[1];
  ctx.reply(`🔍 Fetching ID: ${id}...`);

  try {
    const sub = await client.getSubscription(id);
    if (!sub) {
      return ctx.reply("❌ Subscription not found.");
    }

    ctx.reply(
      `📊 **Subscription Details**\n\n` +
      `🆔 ID: ${sub.id}\n` +
      `💰 Amount: ${sub.amountFormatted} USDC\n` +
      `⏱ Interval: ${sub.interval} seconds\n` +
      `👤 Payer: \`${sub.payer.substring(0, 10)}...\`\n` +
      `📍 Status: ${sub.status}`,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    ctx.reply(`❌ Error fetching data: ${error.message}`);
  }
});

// --- LAUNCH ---
bot.launch(() => {
  console.log("✅ QuantX Bot is online and listening!");
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));