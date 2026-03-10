import {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder
} from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const SHEET_URL = process.env.SHEET_URL;

if (!TOKEN) throw new Error('Missing DISCORD_TOKEN');
if (!SHEET_URL) throw new Error('Missing SHEET_URL');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function fmtCoins(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US');
}

function fmtPctSheet(value) {
  const n = Number(value) || 0;
  return `${n.toFixed(2)}%`;
}

function fmtPctRatio(value) {
  const n = Number(value) || 0;
  return `${(n * 100).toFixed(2)}%`;
}

async function fetchSheetData() {
  const resp = await fetch(SHEET_URL);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const data = await resp.json();
  if (!data.success) {
    throw new Error(data.error || 'Sheet API returned success=false');
  }

  return data;
}

function buildPortfolioEmbed(data) {
  const p = data.portfolio;

  const validItems = data.items.filter(x => String(x['Item'] || '').trim());

  const best = [...validItems]
    .sort((a, b) => (Number(b['Profit %']) || 0) - (Number(a['Profit %']) || 0))
    .slice(0, 3);

  const worst = [...validItems]
    .sort((a, b) => (Number(a['Profit %']) || 0) - (Number(b['Profit %']) || 0))
    .slice(0, 3);

  return new EmbedBuilder()
    .setTitle('Hypixel Investments Portfolio')
    .addFields(
      {
        name: 'Portfolio',
        value:
          `Total Spent: ${fmtCoins(p.totalSpent)}\n` +
          `Current Value: ${fmtCoins(p.currentValue)}\n` +
          `Profit: ${fmtCoins(p.totalProfit)}\n` +
          `ROI: ${fmtPctRatio(p.roi)}`
      },
      {
        name: 'Best 3',
        value: best.length
          ? best.map(x => `• ${x['Item']}: ${fmtPctSheet(x['Profit %'])}`).join('\n')
          : 'No items'
      },
      {
        name: 'Worst 3',
        value: worst.length
          ? worst.map(x => `• ${x['Item']}: ${fmtPctSheet(x['Profit %'])}`).join('\n')
          : 'No items'
      }
    )
    .setFooter({ text: `Updated: ${data.updatedAt}` });
}

function buildInvestmentsEmbed(data, count) {
  const rows = [...data.items]
    .filter(x => String(x['Item'] || '').trim())
    .sort((a, b) => (Number(b['Current Value (After Tax)']) || 0) - (Number(a['Current Value (After Tax)']) || 0))
    .slice(0, count);

  return new EmbedBuilder()
    .setTitle(`Top ${rows.length} Investments`)
    .setDescription(
      rows.map((x, i) =>
        `${i + 1}. **${x['Item']}**\n` +
        `Qty: ${fmtCoins(x['Held Qty'])} | Buy: ${fmtCoins(x['Avg Buy Price'])} | Now: ${fmtCoins(x['Current Unit Price (Best Sell Offer)'])}\n` +
        `Profit: ${fmtCoins(x['Profit'])} | ROI: ${fmtPctSheet(x['Profit %'])}`
      ).join('\n\n')
    )
    .setFooter({ text: `Updated: ${data.updatedAt}` });
}

function buildItemEmbed(item, updatedAt) {
  return new EmbedBuilder()
    .setTitle(String(item['Item'] || 'Item'))
    .addFields(
      { name: 'Held Qty', value: fmtCoins(item['Held Qty']), inline: true },
      { name: 'Avg Buy Price', value: fmtCoins(item['Avg Buy Price']), inline: true },
      { name: 'Current Unit Price', value: fmtCoins(item['Current Unit Price (Best Sell Offer)']), inline: true },
      { name: 'Total Spent', value: fmtCoins(item['Total Spent']), inline: true },
      { name: 'Current Value', value: fmtCoins(item['Current Value (After Tax)']), inline: true },
      { name: 'Profit', value: fmtCoins(item['Profit']), inline: true },
      { name: 'Sell Tax %', value: fmtPctSheet(item['Sell Tax %']), inline: true },
      { name: 'Profit %', value: fmtPctSheet(item['Profit %']), inline: true }
    )
    .setFooter({ text: `Updated: ${updatedAt}` });
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await interaction.deferReply();
    const data = await fetchSheetData();

    if (interaction.commandName === 'portfolio') {
      await interaction.editReply({ embeds: [buildPortfolioEmbed(data)] });
      return;
    }

    if (interaction.commandName === 'investments') {
      const count = interaction.options.getInteger('count') ?? 10;
      await interaction.editReply({ embeds: [buildInvestmentsEmbed(data, count)] });
      return;
    }

    if (interaction.commandName === 'item') {
      const query = interaction.options.getString('name', true).toLowerCase();

      const item = data.items.find(x =>
        String(x['Item'] || '').toLowerCase() === query
      );

      if (!item) {
        await interaction.editReply(`Item not found: ${query}`);
        return;
      }

      await interaction.editReply({ embeds: [buildItemEmbed(item, data.updatedAt)] });
      return;
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply(`Error: ${err.message}`);
  }
});

client.login(TOKEN);
