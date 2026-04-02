// Correr este archivo cuando agregues o modifiques comandos:
//   node deploy-commands.js

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('iniciar')
    .setDescription('Abre el lobby para una nueva partida ⚽'),

  new SlashCommandBuilder()
    .setName('lista')
    .setDescription('Ver los jugadores anotados en este canal'),

  new SlashCommandBuilder()
    .setName('cancelar')
    .setDescription('Cancela la partida activa en este canal (solo el host)'),

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registrando comandos...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Comandos registrados.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
