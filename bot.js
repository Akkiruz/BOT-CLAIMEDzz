const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

// CONFIGURAÇÃO - Lê o token da variável de ambiente
const TOKEN = process.env.TOKEN;

// Validação do token
if (!TOKEN) {
  console.error('❌ ERRO: Token não encontrado! Configure a variável de ambiente TOKEN no Railway.');
  process.exit(1);
}

// ID do canal de status (será criado automaticamente)
let statusChannelId = null;

// Configuração das hunts com 2 horas (120 minutos) cada
const HUNTS = {
  // ENERGY
  'energy-vip': { name: 'Energy VIP', category: 'Energy', duration: 120 },
  'energy-free': { name: 'Energy FREE', category: 'Energy', duration: 120 },
  
  // TERRA
  'terra-vip': { name: 'Terra VIP', category: 'Terra', duration: 120 },
  'terra-free': { name: 'Terra FREE', category: 'Terra', duration: 120 },
  
  // ICE
  'ice-vip': { name: 'Ice VIP', category: 'Ice', duration: 120 },
  'ice-free': { name: 'Ice FREE', category: 'Ice', duration: 120 },
  
  // FIRE
  'fire-vip': { name: 'Fire VIP', category: 'Fire', duration: 120 },
  'fire-free': { name: 'Fire FREE', category: 'Fire', duration: 120 },
  
  // OUTRAS VIP
  'elfo-vip': { name: 'Elfo VIP', category: 'VIP', duration: 120 },
  'falcon-vip': { name: 'Falcon VIP', category: 'VIP', duration: 120 },
  'carnivor-vip': { name: 'Carnivor VIP', category: 'VIP', duration: 120 },
  'turbulent-vip': { name: 'Turbulent VIP', category: 'VIP', duration: 120 },
  'brachiodemon-vip': { name: 'Brachiodemon VIP', category: 'VIP', duration: 120 },
  'cloak-vip': { name: 'Cloak VIP', category: 'VIP', duration: 120 },
  'rotten-vip': { name: 'Rotten VIP', category: 'VIP', duration: 120 },
  'dark-thais-vip': { name: 'Dark Thais VIP', category: 'VIP', duration: 120 },
  
  // GOANNA VIP (4 vagas)
  'goanna-vip-1': { name: 'Goanna VIP Vaga 1', category: 'Goanna', duration: 120 },
  'goanna-vip-2': { name: 'Goanna VIP Vaga 2', category: 'Goanna', duration: 120 },
  'goanna-vip-3': { name: 'Goanna VIP Vaga 3', category: 'Goanna', duration: 120 },
  'goanna-vip-4': { name: 'Goanna VIP Vaga 4', category: 'Goanna', duration: 120 },
  
  // HARD
  'noxious-hard': { name: 'Noxious HARD', category: 'HARD', duration: 120 },
  'aranha-hard': { name: 'Aranha HARD', category: 'HARD', duration: 120 },
  'bloated-hard': { name: 'Bloated HARD', category: 'HARD', duration: 120 },
  'darklight-hard': { name: 'Darklight HARD', category: 'HARD', duration: 120 },
  'rotten-man-hard': { name: 'Rotten Man HARD', category: 'HARD', duration: 120 },
  'wandering-hard': { name: 'Wandering HARD', category: 'HARD', duration: 120 },
  'dark-thais-hard': { name: 'Dark Thais HARD', category: 'HARD', duration: 120 },
  'dark-thais-2-hard': { name: 'Dark Thais 2 HARD', category: 'HARD', duration: 120 },
  'piranha-hard': { name: 'Piranha HARD', category: 'HARD', duration: 120 },
  'cloak-hard': { name: 'Cloak HARD', category: 'HARD', duration: 120 },
  'rotten-hard': { name: 'Rotten HARD', category: 'HARD', duration: 120 },
  'brachiodemon-hard': { name: 'Brachiodemon HARD', category: 'HARD', duration: 120 }
};

// Armazena os claims ativos {huntId: {user, username, channel, timestamp, endTime}}
const activeClaims = {};

// Função para formatar horário em Brasília (UTC-3)
function formatBrasiliaTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

// Função para formatar data e hora completa em Brasília
function formatBrasiliaDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('pt-BR', { 
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  console.log(`📋 ${Object.keys(HUNTS).length} hunts configuradas`);
  
  // Verifica claims expirados a cada 30 segundos
  setInterval(checkExpiredClaims, 30000);
  
  // Atualiza o canal de status a cada minuto
  setInterval(() => updateStatusChannel(), 60000);
});

// Função para criar/encontrar canal de status
async function getOrCreateStatusChannel(guild) {
  if (statusChannelId) {
    const channel = guild.channels.cache.get(statusChannelId);
    if (channel) return channel;
  }

  // Procura por canal existente
  let channel = guild.channels.cache.find(c => c.name === '📊-hunt-status');
  
  if (!channel) {
    try {
      channel = await guild.channels.create({
        name: '📊-hunt-status',
        type: ChannelType.GuildText,
        topic: 'Status em tempo real dos claims de hunts',
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages]
          }
        ]
      });
      console.log(`✅ Canal #📊-hunt-status criado!`);
    } catch (error) {
      console.error('❌ Erro ao criar canal:', error);
      return null;
    }
  }
  
  statusChannelId = channel.id;
  return channel;
}

// Atualiza o canal de status
async function updateStatusChannel() {
  if (!statusChannelId) return;
  
  const channel = client.channels.cache.get(statusChannelId);
  if (!channel) return;

  // Limpa mensagens antigas
  const messages = await channel.messages.fetch({ limit: 10 });
  await channel.bulkDelete(messages).catch(() => {});

  // Organiza claims por categoria
  const categories = {};
  
  for (const [id, claim] of Object.entries(activeClaims)) {
    const hunt = HUNTS[id];
    const category = hunt.category;
    
    if (!categories[category]) {
      categories[category] = [];
    }
    
    const timeRemaining = getTimeRemainingDetailed(claim.endTime);
    categories[category].push({
      name: hunt.name,
      user: claim.username,
      userId: claim.user,
      time: timeRemaining,
      expired: Date.now() >= claim.endTime
    });
  }

  // Cria embed para cada categoria
  for (const [category, claims] of Object.entries(categories)) {
    let description = '';
    
    claims.forEach(claim => {
      const status = claim.expired ? '🔴' : '🟢';
      description += `${status} **${claim.name}**\n`;
      description += `   👤 ${claim.user}\n`;
      description += `   ⏰ ${claim.time}\n\n`;
    });

    const embed = new EmbedBuilder()
      .setColor(category === 'HARD' ? '#FF0000' : category === 'VIP' ? '#FFD700' : '#00FF00')
      .setTitle(`📍 ${category}`)
      .setDescription(description || 'Nenhum claim ativo')
      .setFooter({ text: '🕐 Horário de Brasília (UTC-3) • Atualiza a cada minuto' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  // Hunts disponíveis
  const availableHunts = [];
  for (const [id, hunt] of Object.entries(HUNTS)) {
    if (!activeClaims[id]) {
      availableHunts.push(hunt.name);
    }
  }

  if (availableHunts.length > 0) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Hunts Disponíveis')
      .setDescription(availableHunts.join('\n') || 'Todas claimed!')
      .setFooter({ text: '🕐 Horário de Brasília (UTC-3)' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }
}

// Função para verificar claims expirados
async function checkExpiredClaims() {
  const now = Date.now();
  
  for (const [huntId, claim] of Object.entries(activeClaims)) {
    if (now >= claim.endTime) {
      const hunt = HUNTS[huntId];
      const channel = client.channels.cache.get(claim.channel);
      
      if (channel) {
        channel.send(`⏰ O claim de **${hunt.name}** de <@${claim.user}> expirou! A hunt está disponível novamente! 🎉`);
      }
      
      delete activeClaims[huntId];
    }
  }
  
  // Atualiza canal de status
  await updateStatusChannel();
}

// Comando: !hunts - Lista todas as hunts
function listHunts(message) {
  const categories = {};
  
  // Organiza por categoria
  for (const [id, hunt] of Object.entries(HUNTS)) {
    if (!categories[hunt.category]) {
      categories[hunt.category] = [];
    }
    
    const claim = activeClaims[id];
    const status = claim ? '🔴' : '🟢';
    categories[hunt.category].push({ id, hunt, status, claim });
  }

  // Cria embeds por categoria
  for (const [category, hunts] of Object.entries(categories)) {
    let description = '';
    
    hunts.forEach(({ id, hunt, status, claim }) => {
      description += `${status} **${hunt.name}** (\`${id}\`)\n`;
      if (claim) {
        const time = getTimeRemainingDetailed(claim.endTime);
        description += `   👤 ${claim.username} | ⏰ ${time}\n`;
      }
    });

    const embed = new EmbedBuilder()
      .setColor(category === 'HARD' ? '#FF0000' : category === 'VIP' ? '#FFD700' : '#00FF00')
      .setTitle(`📍 ${category}`)
      .setDescription(description)
      .setFooter({ text: 'Use !claim <hunt> para fazer claim' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
}

// Comando: !claim <hunt> - Fazer claim de uma hunt
async function claimHunt(message, huntId) {
  const hunt = HUNTS[huntId];
  
  if (!hunt) {
    return message.reply(`❌ Hunt não encontrada! Use \`!hunts\` ou \`!lista\` para ver as hunts disponíveis.`);
  }

  const existingClaim = activeClaims[huntId];
  
  if (existingClaim) {
    const timeRemaining = getTimeRemainingDetailed(existingClaim.endTime);
    return message.reply(`❌ **${hunt.name}** já está claimed por <@${existingClaim.user}>!\n⏰ Tempo restante: **${timeRemaining}**`);
  }

  // Calcula horário de término
  const startTime = Date.now();
  const endTime = startTime + (hunt.duration * 60 * 1000);

  // Fazer o claim
  activeClaims[huntId] = {
    user: message.author.id,
    username: message.author.username,
    channel: message.channel.id,
    timestamp: startTime,
    endTime: endTime
  };

  const endTimeFormatted = formatBrasiliaTime(endTime);

  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('✅ Claim Realizado!')
    .setDescription(`**${hunt.name}** foi claimed por <@${message.author.id}>`)
    .addFields(
      { name: '📍 Hunt', value: hunt.name, inline: true },
      { name: '⏱️ Duração', value: `${hunt.duration} minutos`, inline: true },
      { name: '🕐 Expira às', value: endTimeFormatted, inline: true }
    )
    .setFooter({ text: `Use !release ${huntId} para liberar | !tempo ${huntId} para ver tempo restante • Horário de Brasília` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
  
  // Atualiza canal de status
  await updateStatusChannel();
}

// Comando: !tempo <hunt> - Ver tempo restante
function checkTime(message, huntId) {
  const hunt = HUNTS[huntId];
  
  if (!hunt) {
    return message.reply(`❌ Hunt não encontrada!`);
  }

  const claim = activeClaims[huntId];
  
  if (!claim) {
    return message.reply(`✅ **${hunt.name}** está disponível! Ninguém claimou ainda.`);
  }

  const timeRemaining = getTimeRemainingDetailed(claim.endTime);
  const endTimeFormatted = formatBrasiliaTime(claim.endTime);

  const embed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle('⏰ Tempo Restante')
    .setDescription(`**${hunt.name}**`)
    .addFields(
      { name: '👤 Claimed por', value: `<@${claim.user}>`, inline: true },
      { name: '⏱️ Tempo restante', value: timeRemaining, inline: true },
      { name: '🕐 Expira às', value: endTimeFormatted, inline: true }
    )
    .setFooter({ text: 'Horário de Brasília (UTC-3)' })
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

// Verifica se o usuário é administrador
function isAdmin(message) {
  return message.member.permissions.has(PermissionFlagsBits.Administrator);
}

// Comando: !release <hunt> - Liberar uma hunt
async function releaseHunt(message, huntId) {
  const hunt = HUNTS[huntId];
  
  if (!hunt) {
    return message.reply(`❌ Hunt não encontrada!`);
  }

  const claim = activeClaims[huntId];
  
  if (!claim) {
    return message.reply(`❌ **${hunt.name}** não está claimed!`);
  }

  if (claim.user !== message.author.id) {
    return message.reply(`❌ Você não pode liberar essa hunt! Ela foi claimed por <@${claim.user}>`);
  }

  delete activeClaims[huntId];
  await message.reply(`✅ **${hunt.name}** foi liberada e está disponível novamente!`);
  
  // Atualiza canal de status
  await updateStatusChannel();
}

// Comando: !forcerelease <hunt> - Forçar liberação (ADMIN)
async function forceReleaseHunt(message, huntId) {
  if (!isAdmin(message)) {
    return message.reply(`❌ Este comando é apenas para administradores!`);
  }

  const hunt = HUNTS[huntId];
  
  if (!hunt) {
    return message.reply(`❌ Hunt não encontrada!`);
  }

  const claim = activeClaims[huntId];
  
  if (!claim) {
    return message.reply(`❌ **${hunt.name}** não está claimed!`);
  }

  const claimedBy = claim.username;
  delete activeClaims[huntId];
  
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('🔨 Claim Removido (Admin)')
    .setDescription(`**${hunt.name}** foi liberada por um administrador`)
    .addFields(
      { name: '👤 Estava claimed por', value: claimedBy, inline: true },
      { name: '🛡️ Liberado por', value: message.author.username, inline: true }
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
  
  // Atualiza canal de status
  await updateStatusChannel();
}

// Comando: !clearall - Limpar todos os claims (ADMIN)
async function clearAllClaims(message) {
  if (!isAdmin(message)) {
    return message.reply(`❌ Este comando é apenas para administradores!`);
  }

  const claimCount = Object.keys(activeClaims).length;
  
  if (claimCount === 0) {
    return message.reply(`✅ Não há claims ativos para limpar!`);
  }

  // Limpa todos os claims
  for (const huntId in activeClaims) {
    delete activeClaims[huntId];
  }

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('🧹 Todos os Claims Removidos')
    .setDescription(`**${claimCount} claim(s)** foram removidos por um administrador`)
    .addFields(
      { name: '🛡️ Removido por', value: message.author.username }
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
  
  // Atualiza canal de status
  await updateStatusChannel();
}

// Comando: !status - Ver todos os claims ativos
function showStatus(message) {
  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('📊 Status dos Claims Ativos')
    .setDescription('Todas as hunts claimed no momento')
    .setFooter({ text: 'Horário de Brasília (UTC-3)' })
    .setTimestamp();

  let hasActiveClaims = false;

  for (const [id, claim] of Object.entries(activeClaims)) {
    hasActiveClaims = true;
    const hunt = HUNTS[id];
    const timeRemaining = getTimeRemainingDetailed(claim.endTime);
    const endTimeFormatted = formatBrasiliaTime(claim.endTime);
    
    embed.addFields({
      name: `🔹 ${hunt.name}`,
      value: `👤 <@${claim.user}>\n⏰ ${timeRemaining}\n🕐 Expira: ${endTimeFormatted}`,
      inline: true
    });
  }

  if (!hasActiveClaims) {
    embed.setDescription('✅ Nenhuma hunt claimed no momento! Todas disponíveis! 🎉');
  }

  message.reply({ embeds: [embed] });
}

// Calcula tempo restante detalhado
function getTimeRemainingDetailed(endTime) {
  const now = Date.now();
  const remaining = endTime - now;

  if (remaining <= 0) return '⏰ EXPIRADO';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

// Comando !lista - Lista simplificada
function simpleList(message) {
  let available = '**🟢 Disponíveis:**\n';
  let claimed = '\n**🔴 Claimed:**\n';
  
  for (const [id, hunt] of Object.entries(HUNTS)) {
    if (activeClaims[id]) {
      const time = getTimeRemainingDetailed(activeClaims[id].endTime);
      claimed += `❌ ${hunt.name} - <@${activeClaims[id].user}> (${time})\n`;
    } else {
      available += `✅ ${hunt.name} (\`${id}\`)\n`;
    }
  }

  message.reply(available + claimed);
}

// Processa mensagens
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();
  const args = content.split(' ');
  const command = args[0];

  if (command === '!hunts') {
    listHunts(message);
  } else if (command === '!lista') {
    simpleList(message);
  } else if (command === '!claim' && args[1]) {
    await claimHunt(message, args[1]);
  } else if (command === '!tempo' && args[1]) {
    checkTime(message, args[1]);
  } else if (command === '!release' && args[1]) {
    await releaseHunt(message, args[1]);
  } else if (command === '!forcerelease' && args[1]) {
    await forceReleaseHunt(message, args[1]);
  } else if (command === '!clearall') {
    await clearAllClaims(message);
  } else if (command === '!status') {
    showStatus(message);
  } else if (command === '!criar-status') {
    // Comando para criar manualmente o canal de status
    const channel = await getOrCreateStatusChannel(message.guild);
    if (channel) {
      await updateStatusChannel();
      message.reply(`✅ Canal de status criado/atualizado: <#${channel.id}>`);
    }
  } else if (command === '!help' || command === '!ajuda') {
    const isUserAdmin = isAdmin(message);
    
    const helpEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('📖 Comandos do Bot - Tibia Hunt Manager')
      .setDescription('Sistema de gerenciamento de claims para hunts\n**Tempo por hunt: 2 horas (120 minutos)**')
      .addFields(
        { name: '!hunts', value: 'Lista todas as hunts organizadas por categoria' },
        { name: '!lista', value: 'Lista simplificada de hunts disponíveis/claimed' },
        { name: '!claim <hunt>', value: 'Faz claim de uma hunt por 2h\nEx: `!claim energy-vip`' },
        { name: '!tempo <hunt>', value: 'Verifica tempo restante de uma hunt\nEx: `!tempo energy-vip`' },
        { name: '!release <hunt>', value: 'Libera sua hunt claimed\nEx: `!release energy-vip`' },
        { name: '!status', value: 'Mostra todos os claims ativos com tempos' },
        { name: '!criar-status', value: 'Cria canal #📊-hunt-status (automático)' },
        { name: '!help ou !ajuda', value: 'Mostra esta mensagem' }
      )
      .setFooter({ text: 'Bot criado para gerenciamento de hunts' })
      .setTimestamp();
    
    // Adiciona comandos de admin se o usuário for admin
    if (isUserAdmin) {
      helpEmbed.addFields(
        { name: '\n🛡️ **COMANDOS ADMIN**', value: '━━━━━━━━━━━━━━━━━━━━' },
        { name: '!forcerelease <hunt>', value: '🔨 Remove claim de qualquer hunt\nEx: `!forcerelease energy-vip`' },
        { name: '!clearall', value: '🧹 Remove TODOS os claims ativos' }
      );
    }
    
    message.reply({ embeds: [helpEmbed] });
  }
});

// Tratamento de erros
client.on('error', error => {
  console.error('❌ Erro no cliente Discord:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Promise rejection não tratada:', error);
});

// Login
client.login(TOKEN).catch(error => {
  console.error('❌ Erro ao fazer login:', error);
  console.error('Verifique se o TOKEN está correto na variável de ambiente.');
  process.exit(1);
});
