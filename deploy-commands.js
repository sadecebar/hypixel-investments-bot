import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN) throw new Error('Missing DISCORD_TOKEN');
if (!CLIENT_ID) throw new Error('Missing DISCORD_CLIENT_ID');
if (!GUILD_ID) throw new Error('Missing DISCORD_GUILD_ID');

const commands = [
  new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('Show your investment portfolio'),

  new SlashCommandBuilder()
    .setName('investments')
    .setDescription('Show top investments')
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('How many rows to show')
        .setMinValue(1)
        .setMaxValue(20)
    ),

  new SlashCommandBuilder()
    .setName('item')
    .setDescription('Show one item')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Exact item name')
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
  console.log('Deploying slash commands...');
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('Done.');
} catch (err) {
  console.error(err);
}
