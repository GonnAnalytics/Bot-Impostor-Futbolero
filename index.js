require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ===== FUTBOLISTAS =====
const FUTBOLISTAS = [
  'Lionel Messi','Cristiano Ronaldo','Ronaldinho','Zinedine Zidane',
  'Ronaldo Nazário','Pelé','Diego Maradona','Kylian Mbappé',
  'Erling Haaland','Vinicius Jr.','Ángel Di María','Sergio Agüero',
  'Gabriel Batistuta','Juan Román Riquelme','Carlos Tevez',
  'Neymar','Kaká','Romário','Thierry Henry','Luka Modric',
  'Andrés Iniesta','Xavi Hernández','Sergio Busquets','Gerard Piqué',
  'Carles Puyol','David Villa','Fernando Torres','Iker Casillas',
  'Raúl González','Luis Suárez','Edinson Cavani','Diego Forlán',
  'Antoine Griezmann','Karim Benzema','Eden Hazard','Kevin De Bruyne',
  'Mohamed Salah','Sadio Mané','Robert Lewandowski','Harry Kane',
  'Paul Pogba','N\'Golo Kanté','Mesut Özil','Thomas Müller',
  'Manuel Neuer','Philipp Lahm','Bastian Schweinsteiger',
  'Toni Kroos','Marco Reus','Mario Götze','Joshua Kimmich',
  'Jamal Musiala','Jude Bellingham','Pedri','Gavi','Ansu Fati',
  'Marcus Rashford','Lamine Yamal','Casemiro','Raphaël Varane',
  'Sergio Ramos','Marcelo','Dani Carvajal','Thibaut Courtois',
  'Jan Oblak','Alisson Becker','Ederson Moraes','Virgil van Dijk',
  'Trent Alexander-Arnold','Andrew Robertson','Kalidou Koulibaly',
  'Achraf Hakimi','Reece James','Kyle Walker','Riyad Mahrez',
  'Bernardo Silva','Jack Grealish','Erik ten Hag','Pep Guardiola',
  'Didier Drogba','Frank Lampard','John Terry','Petr Čech',
  'Ashley Cole','Michael Ballack','Agustín Rossi','Arjen Robben',
  'Franck Ribéry','Ruud van Nistelrooy','Robin van Persie',
  'Dennis Bergkamp','Patrick Vieira','Zlatan Ibrahimović',
  'Gianluigi Buffon','Fabio Cannavaro','Alessandro Del Piero',
  'Francesco Totti','Paolo Maldini','Andrea Pirlo',
  'Gennaro Gattuso','Filippo Inzaghi',
  'George Best','Bobby Charlton','Johan Cruyff',
  'Marco van Basten','Ruud Gullit','Lothar Matthäus',
  'Franz Beckenbauer','Gerd Müller',
  'Hugo Sánchez','Pasarella','Wayne Rooney',
  'Baresi','Hulk',
  'Alexis Sánchez','Arturo Vidal','James Rodríguez',
  'Radamel Falcao','Juan Cuadrado',
  'Son Heung-min','Miguel Merentiel',
  'Didier Deschamps','Mastantuono',
  'Dani Alves','Roberto Carlos','Cafu','Isco',
  'Chiquito Romero','Rivaldo','Cholo Simeone',
  'Enzo Francescoli','Diego Godín',
  'Paulo Dybala','Lautaro Martínez',
  'Bukayo Saka','Declan Rice',
  'Victor Osimhen','Khvicha Kvaratskhelia',
  'João Félix','Bruno Fernandes'
];

// ===== ESTADO =====
// players: Map<userId, { username, vivo }>
const partidas = new Map();

// ===== HELPERS =====
function elegirAlAzar(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function calcularImpostores(total) {
  if (total <= 5) return 1;
  if (total <= 8) return 2;
  return 3;
}

function calcularRondasMaximas(total) {
  if (total <= 5) return 1;
  if (total <= 8) return 2;
  return 3;
}

function jugadoresVivos(partida) {
  return [...partida.players.entries()].filter(([, d]) => d.vivo);
}

function embedLobby(partida) {
  const lista =
    partida.players.size > 0
      ? [...partida.players.values()].map((d) => `• ${d.username}`).join('\n')
      : '_Nadie se unió todavía..._';

  return new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('🏟️ Lobby — El Impostor Futbolero')
    .addFields(
      { name: 'Host', value: `<@${partida.host}>`, inline: true },
      { name: 'Jugadores', value: `${partida.players.size}`, inline: true },
      { name: ' ', value: lista }
    )
    .setFooter({ text: 'Mínimo 4 jugadores para comenzar' });
}

function botonesLobby() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('unirse')
      .setLabel('Unirse ⚽')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('salir')
      .setLabel('Salir')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('comenzar')
      .setLabel('¡Comenzar!')
      .setStyle(ButtonStyle.Primary)
  );
}

// ===== SERVIDOR HTTP (necesario para Railway) =====
const http = require('http');
http.createServer((_, res) => res.end('Bot online ⚽')).listen(process.env.PORT || 3000);

// ===== EVENTOS =====
client.once('ready', () => {
  console.log(`✅ Conectado como ${client.user.tag} ⚽`);
});

client.on('interactionCreate', async (interaction) => {

  // ── Slash commands ───────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const { commandName, user, channelId } = interaction;

    if (commandName === 'ping') {
      await interaction.reply('🏓 Pong! El bot está en cancha ⚽');
    }

    if (commandName === 'iniciar') {
      if (partidas.has(channelId)) {
        return interaction.reply({
          content: '❌ Ya hay una partida abierta en este canal.',
          ephemeral: true,
        });
      }
      const partida = {
        host: user.id,
        players: new Map([[user.id, { username: user.username, vivo: true }]]),
        impostores: new Set(),
        futbolista: null,
        status: 'lobby',
        votes: new Map(),
        ronda: 0,
        rondasMaximas: 0,
      };
      partidas.set(channelId, partida);
      await interaction.reply({
        embeds: [embedLobby(partida)],
        components: [botonesLobby()],
      });
    }

    if (commandName === 'lista') {
      const partida = partidas.get(channelId);
      if (!partida || partida.players.size === 0) {
        return interaction.reply({ content: 'No hay jugadores en este canal.', ephemeral: true });
      }
      const lista = [...partida.players.values()].map((d, i) => `${i + 1}. ${d.username}`).join('\n');
      await interaction.reply({ content: `👥 **Jugadores:**\n${lista}`, ephemeral: true });
    }

    if (commandName === 'cancelar') {
      const partida = partidas.get(channelId);
      if (!partida) {
        return interaction.reply({ content: '❌ No hay ninguna partida activa en este canal.', ephemeral: true });
      }
      if (user.id !== partida.host) {
        return interaction.reply({ content: '❌ Solo el host puede cancelar la partida.', ephemeral: true });
      }
      partidas.delete(channelId);
      await interaction.reply({ content: '🛑 Partida cancelada. Usá `/iniciar` para empezar una nueva.', ephemeral: true });
    }
  }

  // ── Botones ──────────────────────────────────────────────
  if (interaction.isButton()) {
    const { customId, user, channelId } = interaction;
    const partida = partidas.get(channelId);

    if (!partida) {
      return interaction.reply({ content: '❌ Esta partida ya no existe. Usá `/iniciar` para crear una nueva.', ephemeral: true });
    }

    if (customId === 'unirse') {
      if (partida.players.has(user.id)) {
        return interaction.reply({ content: '⚠️ Ya estás en la partida.', ephemeral: true });
      }
      partida.players.set(user.id, { username: user.username, vivo: true });
      await interaction.update({ embeds: [embedLobby(partida)], components: [botonesLobby()] });
    }

    if (customId === 'salir') {
      if (!partida.players.has(user.id)) {
        return interaction.reply({ content: '⚠️ No estás en la partida.', ephemeral: true });
      }
      if (user.id === partida.host) {
        return interaction.reply({
          content: '❌ El host no puede salir. Usá `/cancelar` para cerrar la partida.',
          ephemeral: true,
        });
      }
      partida.players.delete(user.id);
      await interaction.update({ embeds: [embedLobby(partida)], components: [botonesLobby()] });
    }

    if (customId === 'comenzar') {
      if (user.id !== partida.host) {
        return interaction.reply({ content: '❌ Solo el host puede comenzar.', ephemeral: true });
      }
      const MIN_JUGADORES = 4;
      if (partida.players.size < MIN_JUGADORES) {
        return interaction.reply({
          content: `❌ Se necesitan al menos ${MIN_JUGADORES} jugadores. Hay ${partida.players.size}.`,
          ephemeral: true,
        });
      }

      const futbolista = elegirAlAzar(FUTBOLISTAS);
      const cantImpostores = calcularImpostores(partida.players.size);
      const ids = [...partida.players.keys()].sort(() => Math.random() - 0.5);
      const impostores = new Set(ids.slice(0, cantImpostores));

      partida.impostores = impostores;
      partida.futbolista = futbolista;
      partida.status = 'jugando';
      partida.ronda = 1;
      partida.rondasMaximas = calcularRondasMaximas(partida.players.size);

      const partidaEmbed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle('🏁 ¡La partida comenzó!')
        .setDescription(
          `**Jugadores:** ${partida.players.size}  |  **Impostores ocultos:** ${cantImpostores}\n\n` +
          '📨 Cada jugador debe apretar el botón para ver su rol.\n\n' +
          '💬 Discutan en el chat y cuando estén listos, el host abre la votación.'
        )
        .setFooter({ text: `Ronda 1 de ${calcularRondasMaximas(partida.players.size)}` });

      const rowJuego = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ver_rol')
          .setLabel('🔍 Ver mi rol')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('abrir_votacion')
          .setLabel('🗳️ Abrir votación')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ embeds: [partidaEmbed], components: [rowJuego] });
    }

    if (customId === 'ver_rol') {
      if (!partida.players.has(user.id)) {
        return interaction.reply({ content: '❌ No sos parte de esta partida.', ephemeral: true });
      }
      const esImpostor = partida.impostores.has(user.id);
      const rolEmbed = esImpostor
        ? new EmbedBuilder()
            .setColor(0xff3333)
            .setTitle('🕵️ Sos el IMPOSTOR')
            .setDescription(
              'Los demás jugadores recibieron el nombre de un futbolista.\n' +
              '**Vos no lo sabés.**\n\n' +
              'Respondé con confianza para no delatarte.\n' +
              'Tenés que sobrevivir la votación para ganar.'
            )
            .setFooter({ text: '🔴 Solo vos podés ver esto' })
        : new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle('⚽ Tu futbolista secreto')
            .setDescription(
              `Tu futbolista es:\n\n# ${partida.futbolista}\n\n` +
              'Detectá al impostor — es el que **no sabe** quién es este jugador.'
            )
            .setFooter({ text: '🟢 Solo vos podés ver esto' });

      await interaction.reply({ embeds: [rolEmbed], ephemeral: true });
    }

    if (customId === 'abrir_votacion') {
      if (user.id !== partida.host) {
        return interaction.reply({ content: '❌ Solo el host puede abrir la votación.', ephemeral: true });
      }
      if (partida.status !== 'jugando') {
        return interaction.reply({ content: '❌ La votación ya está abierta.', ephemeral: true });
      }

      partida.status = 'votando';
      partida.votes.clear();

      const vivos = jugadoresVivos(partida);
      const totalQueVotan = vivos.length;

      const votacionEmbed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle(`🗳️ Votación — Ronda ${partida.ronda}`)
        .setDescription(
          '**¿Quién es el impostor?**\n\n' +
          'Cada jugador tiene que votar. El más votado es eliminado.\n' +
          '_En caso de empate, nadie es eliminado._'
        )
        .setFooter({ text: `Votos: 0 / ${totalQueVotan}` });

      // Opciones del menú: solo jugadores vivos
      // Cada jugador ve el menú completo — la validación de no votarse
      // a sí mismo se hace cuando procesa el voto
      const opciones = vivos.map(([id, d]) => ({
        label: d.username,
        value: id,
      }));

      const rowVotacion = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('votar')
          .setPlaceholder('Seleccioná al sospechoso...')
          .addOptions(opciones)
      );

      await interaction.update({ embeds: [votacionEmbed], components: [rowVotacion] });
    }
  }

  // ── Select menu (votos) ──────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    const { customId, user, channelId } = interaction;
    const partida = partidas.get(channelId);

    if (customId === 'votar') {
      if (!partida || partida.status !== 'votando') {
        return interaction.reply({ content: '❌ No hay votación activa.', ephemeral: true });
      }

      const datosVotante = partida.players.get(user.id);
      if (!datosVotante) {
        return interaction.reply({ content: '❌ No sos parte de esta partida.', ephemeral: true });
      }
      if (!datosVotante.vivo) {
        return interaction.reply({ content: '❌ Los eliminados no pueden votar.', ephemeral: true });
      }
      if (partida.votes.has(user.id)) {
        return interaction.reply({ content: '⚠️ Ya votaste.', ephemeral: true });
      }

      const votadoId = interaction.values[0];

      // No puede votarse a sí mismo
      if (votadoId === user.id) {
        return interaction.reply({ content: '❌ No podés votarte a vos mismo.', ephemeral: true });
      }

      partida.votes.set(user.id, votadoId);

      const vivos = jugadoresVivos(partida);
      const totalQueVotan = vivos.length;
      const totalVotos = partida.votes.size;

      await interaction.reply({
        content: `✅ Voto registrado. (${totalVotos}/${totalQueVotan})`,
        ephemeral: true,
      });

      const embedActualizado = EmbedBuilder.from(interaction.message.embeds[0])
        .setFooter({ text: `Votos: ${totalVotos} / ${totalQueVotan}` });
      await interaction.message.edit({ embeds: [embedActualizado] });

      if (totalVotos >= totalQueVotan) {
        await cerrarVotacion(interaction, partida);
      }
    }
  }
});

// ===== CERRAR VOTACIÓN Y REVELAR =====
async function cerrarVotacion(interaction, partida) {
  // Contar votos
  const conteo = new Map();
  for (const votadoId of partida.votes.values()) {
    conteo.set(votadoId, (conteo.get(votadoId) || 0) + 1);
  }

  // Encontrar el más votado
  let maxVotos = 0;
  let candidatos = [];
  for (const [id, votos] of conteo) {
    if (votos > maxVotos) { maxVotos = votos; candidatos = [id]; }
    else if (votos === maxVotos) { candidatos.push(id); }
  }

  const empate = candidatos.length > 1;
  const eliminadoId = empate ? null : candidatos[0];
  const eraImpostor = eliminadoId ? partida.impostores.has(eliminadoId) : false;

  // Quién votó a quién
  const detalleVotos = [...partida.votes.entries()]
    .map(([votanteId, votadoId]) => {
      const votante = partida.players.get(votanteId)?.username ?? 'Desconocido';
      const votado = partida.players.get(votadoId)?.username ?? 'Desconocido';
      return `• ${votante} → **${votado}**`;
    })
    .join('\n');

  // Resultado de conteo
  const resultados = [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => {
      const nombre = partida.players.get(id)?.username ?? 'Desconocido';
      return `• ${nombre} — **${v}** voto(s)`;
    })
    .join('\n');

  let descripcion = `**Votos:**\n${detalleVotos}\n\n**Conteo:**\n${resultados}\n\n`;

  if (empate) {
    descripcion += '⚖️ **Empate** — nadie es eliminado esta ronda.';
  } else if (eraImpostor) {
    const nombre = partida.players.get(eliminadoId)?.username;
    descripcion += `🎯 **${nombre} era el IMPOSTOR.** ¡El equipo lo descubrió!`;
    partida.impostores.delete(eliminadoId);
    partida.players.get(eliminadoId).vivo = false;
  } else {
    const nombre = partida.players.get(eliminadoId)?.username;
    descripcion += `😮 **${nombre} era un jugador normal.** El impostor sigue libre...`;
    partida.players.get(eliminadoId).vivo = false;
  }

   const finPorImpostoresEliminados = partida.impostores.size === 0;
   const impostorSigueVivo = [...partida.impostores].some(id => partida.players.get(id)?.vivo);
   const finPorRondas = partida.ronda >= partida.rondasMaximas && impostorSigueVivo;

  if (finPorImpostoresEliminados || finPorRondas) {
    const ganador = finPorImpostoresEliminados ? 'equipo' : 'impostor';

    const finalEmbed = new EmbedBuilder()
      .setColor(ganador === 'equipo' ? 0x1db954 : 0xff3333)
      .setTitle(ganador === 'equipo' ? '🏆 ¡El EQUIPO ganó!' : '🕵️ ¡El IMPOSTOR ganó!')
      .setDescription(descripcion)
      .addFields({ name: '⚽ El futbolista era', value: `**${partida.futbolista}**`, inline: true })
      .setFooter({ text: 'Usá /iniciar para una nueva partida' });

    partidas.delete(interaction.channelId);
    return interaction.message.edit({ embeds: [finalEmbed], components: [] });
  }

  // Siguiente ronda
  partida.ronda++;
  partida.status = 'jugando';
  partida.votes.clear();

  const siguienteEmbed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle(`📋 Resultado — Ronda ${partida.ronda - 1}`)
    .setDescription(descripcion)
    .setFooter({ text: `Ronda ${partida.ronda} de ${partida.rondasMaximas} — El host puede abrir la siguiente votación` });

  const rowSiguiente = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ver_rol')
      .setLabel('🔍 Ver mi rol')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('abrir_votacion')
      .setLabel(`🗳️ Ronda ${partida.ronda}`)
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.message.edit({ embeds: [siguienteEmbed], components: [rowSiguiente] });
}

client.login(process.env.TOKEN);
