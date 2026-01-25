import { Telegraf, Context } from "telegraf";
import { QuantXClient } from "quantx-sdk";
import * as dotenv from "dotenv";
import { Keypair, StrKey } from "@stellar/stellar-sdk";

// 1. Setup & Config
dotenv.config();

// Fix BigInt serialization
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

if (!process.env.BOT_TOKEN || !process.env.BOT_SECRET_KEY) {
  throw new Error("Missing BOT_TOKEN or BOT_SECRET_KEY in .env");
}

// CONSTANTS
const USDC_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
// Standard XLM for Testnet (often wrapped, but we use USDC address as placeholder for demo)
const XLM_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"; 

const bot = new Telegraf(process.env.BOT_TOKEN);

console.log("Initializing QuantX SDK...");
const client = new QuantXClient({
  network: "TESTNET",
  contractId: process.env.CONTRACT_ID!,
  wallet: {
    secretKey: process.env.BOT_SECRET_KEY,
  },
});

const BOT_ADDRESS = Keypair.fromSecret(process.env.BOT_SECRET_KEY).publicKey();
console.log(`Bot Wallet Address: ${BOT_ADDRESS}`);

// --- HELPER FUNCTIONS ---

function isValidAddress(addr: string): boolean {
  return StrKey.isValidEd25519PublicKey(addr);
}

// Escapes Markdown characters to prevent Telegram crashes
function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// --- COMMANDS ---

bot.start((ctx) => {
  ctx.reply(
    `🤖 **QuantX Subscription Bot**\n\n` +
    `Wallet: \`${BOT_ADDRESS}\`\n\n` +
    `**Commands:**\n` +
    `1️⃣ **Subscribe:**\n` +
    `\`/subscribe <To> <Amt> <Token> <Secs> [Type] [Cycles]\`\n` +
    `_Type: 'auto' (default) or 'prepaid'_\n` +
    `_Cycles: Total payments (0 = unlimited)_\n\n` +
    `2️⃣ **Approve Token:** (Required for AutoPay)\n` +
    `\`/approve <Token>\`\n\n` +
    `3️⃣ **Check / Cancel:**\n` +
    `\`/check <ID>\`\n` +
    `\`/cancel <ID>\``,
    { parse_mode: "Markdown" }
  );
});

// 1. APPROVE COMMAND (New)
bot.command("approve", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const tokenTicker = parts[1] || "USDC";

    let tokenAddress = USDC_TESTNET;
    if (tokenTicker.toUpperCase() === "XLM") tokenAddress = XLM_TESTNET;
    else if (isValidAddress(tokenTicker)) tokenAddress = tokenTicker;

    ctx.reply(`🔓 Approving Contract to spend your ${tokenTicker}...`);
    
    try {
        const res = await client.approveAllowance(tokenAddress);
        ctx.reply(`✅ **Approved!**\nHash: \`${res.hash}\``, { parse_mode: "Markdown" });
    } catch (e: any) {
        ctx.reply(`❌ Error: ${e.message}`);
    }
});

// 2. SUBSCRIBE COMMAND (Updated for New Contract)
bot.command("subscribe", async (ctx) => {
  // Format: /subscribe <Recipient> <Amount> <Token> <Interval> [Type] [Cycles]
  const args = ctx.message.text.split(" ").slice(1);

  if (args.length < 4) {
    return ctx.reply(
      `❌ **Missing Arguments**\n` +
      `Usage: \`/subscribe <To> <Amt> <Token> <Secs> [Type] [Cycles]\`\n` +
      `Example: \`/subscribe GABC... 5 USDC 3600 auto 0\``,
      { parse_mode: "Markdown" }
    );
  }

  const [recipient, amountStr, tokenTicker, intervalStr, typeArg, cyclesArg] = args;

  // --- Validation ---
  if (!isValidAddress(recipient)) return ctx.reply("❌ Invalid Recipient Address.");
  
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid Amount.");
  
  const interval = parseInt(intervalStr);
  if (isNaN(interval) || interval < 60) return ctx.reply("❌ Invalid Interval (Min 60s).");

  // Defaults
  const type = (typeArg || "auto").toLowerCase();
  const cycles = parseInt(cyclesArg || "0");

  // Determine SubType Value (0=AutoPay, 1=Prepaid)
  // Logic: The SDK usually handles this, but we pass explicit logic
  const isPrepaid = type === "prepaid";
  const subTypeValue = isPrepaid ? 1 : 0; // 1 for Prepaid, 0 for AutoPay

  if (isPrepaid && cycles <= 0) {
      return ctx.reply("❌ **Prepaid Error:** You must specify 'Cycles' > 0 for prepaid plans.");
  }

  // Token Selection
  let tokenAddress = USDC_TESTNET; 
  if (tokenTicker.toUpperCase() === "USDC") tokenAddress = USDC_TESTNET;
  else if (tokenTicker.toUpperCase() === "XLM") tokenAddress = XLM_TESTNET; 
  else if (isValidAddress(tokenTicker)) tokenAddress = tokenTicker;
  else return ctx.reply("❌ Unknown Token.");

  // --- Summary Message ---
  const totalCost = isPrepaid ? amount * cycles : amount;
  const payMsg = isPrepaid 
     ? `💸 **PREPAID:** Paying ${totalCost} ${tokenTicker} UPFRONT.` 
     : `🔄 **AUTOPAY:** ${amount} ${tokenTicker} per execution.`;

  ctx.reply(
    `⚙️ **Creating Subscription**\n` +
    `📤 To: \`${recipient.substring(0,6)}...\`\n` +
    `⏱ Interval: ${interval}s\n` +
    `${payMsg}\n` +
    `Please wait...`,
    { parse_mode: "Markdown" }
  );

  try {
    const result = await client.subscribe({
      recipient: recipient,
      token: tokenAddress,
      amount: amountStr, 
      interval: interval,
      subType: subTypeValue, // Pass 0 or 1
      cycles: cycles // Pass total cycles
    });

    ctx.reply(
      `✅ **Success!**\n🔗 [View Transaction](https://stellar.expert/explorer/testnet/tx/${result.hash})`,
      { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
    );
  } catch (error: any) {
    console.error(error);
    const msg = escapeMd(error.message || "Unknown error");
    
    if (msg.includes("timeout")) {
       ctx.reply("⚠️ Network slow, check explorer.");
    } else {
       ctx.reply(`❌ Failed: ${msg}`, { parse_mode: "Markdown" });
    }
  }
});

// 3. CHECK COMMAND
bot.command("check", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  if (parts.length !== 2) return ctx.reply("Usage: /check <ID>");
  const id = parts[1];

  try {
    const sub = await client.getSubscription(id);
    if (!sub) return ctx.reply("❌ Not found.");

    // Determine type string
    // Note: You might need to update SDK 'getSubscription' to return sub_type if it doesn't already
    // For now we assume standard fields
    ctx.reply(
      `📊 **Subscription #${sub.id}**\n` +
      `💸 Amount: ${sub.amountFormatted}\n` +
      `👤 To: \`${sub.recipient.substring(0, 10)}...\`\n` +
      `⏱ Next: ${new Date(sub.nextExecution * 1000).toLocaleString()}\n` +
      `📍 Status: ${sub.status}`,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    ctx.reply(`❌ Error: ${escapeMd(error.message)}`, { parse_mode: "Markdown" });
  }
});

// 4. CANCEL COMMAND
bot.command("cancel", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  if (parts.length !== 2) return ctx.reply("Usage: /cancel <ID>");
  const id = parts[1];

  ctx.reply(`🛑 Cancelling #${id}...`);

  try {
    const result = await client.cancel(id);
    ctx.reply(
      `✅ **Cancelled!**\n🔗 [View Transaction](https://stellar.expert/explorer/testnet/tx/${result.hash})`,
      { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
    );
  } catch (error: any) {
    ctx.reply(`❌ Failed: ${escapeMd(error.message)}`, { parse_mode: "Markdown" });
  }
});

bot.launch(() => console.log("QuantX Bot V2 Online!"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));