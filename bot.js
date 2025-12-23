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

// ID da categoria onde os canais temporários serão criados
let tempChannelsCategoryId = null;

// Configuração das hunts - duração será escolhida pelo usuário via reações
const HUNTS = {
  // ENERGY
  'energy-vip': { name: 'Energy VIP', category: 'Energy' },
  'energy-free': { name: 'Energy FREE', category: 'Energy' },
  
  // TERRA
  'terra-vip': { name: 'Terra VIP', category: 'Terra' },
  'terra-free': { name: 'Terra FREE', category: 'Terra' },
  
  // ICE
  'ice-vip': { name: 'Ice VIP', category: 'Ice' },
  'ice-free': { name: 'Ice FREE', category: 'Ice' },
  
  // FIRE
  'fire-vip': { name: 'Fire VIP', category: 'Fire' },
  'fire-free': { name: 'Fire FREE', category: 'Fire' },
  
  // INFERNIAK
  'inferniak-1': { name: 'INFERNIAK 1', category: 'INFERNIAK' },
  'inferniak-m1': { name: 'INFERNIAK M1', category: 'INFERNIAK' },
  
  // WARZONE (11 vagas)
  'warzone-1': { name: 'WARZONE 1', category: 'WARZONE' },
  'warzone-2': { name: 'WARZONE 2', category: 'WARZONE' },
  'warzone-3': { name: 'WARZONE 3', category: 'WARZONE' },
  'warzone-4': { name: 'WARZONE 4', category: 'WARZONE' },
  'warzone-5': { name: 'WARZONE 5', category: 'WARZONE' },
  'warzone-6': { name: 'WARZONE 6', category: 'WARZONE' },
  'warzone-7': { name: 'WARZONE 7', category: 'WARZONE' },
  'warzone-8': { name: 'WARZONE 8', category: 'WARZONE' },
  'warzone-9': { name: 'WARZONE 9', category: 'WARZONE' },
  'warzone-10': { name: 'WARZONE 10', category: 'WARZONE' },
  'warzone-11': { name: 'WARZONE 11', category: 'WARZONE' },
  
  // OUTRAS VIP
  'elfo-vip': { name: 'Elfo VIP', category: 'VIP' },
  'falcon-vip': { name: 'Falcon VIP', category: 'VIP' },
  'carnivor-vip': { name: 'Carnivor VIP', category: 'VIP' },
  'turbulent-vip': { name: 'Turbulent VIP', category: 'VIP' },
  'brachiodemon-vip': { name: 'Brachiodemon VIP', category: 'VIP' },
  'cloak-vip': { name: 'Cloak VIP', category: 'VIP' },
  'rotten-vip': { name: 'Rotten VIP', category: 'VIP' },
  'dark-thais-vip': { name: 'Dark Thais VIP', category: 'VIP' },
  
  // GOANNA VIP (4 vagas)
  'goanna-vip-1': { name: 'Goanna VIP Vaga 1', category: 'Goanna' },
  'goanna-vip-2': { name: 'Goanna VIP Vaga 2', category: 'Goanna' },
  'goanna-vip-3': { name: 'Goanna VIP Vaga 3', category: 'Goanna' },
  'goanna-vip-4': { name: 'Goanna VIP Vaga 4', category: 'Goanna' },
  
  // HARD
  'noxious-hard': { name: 'Noxious HARD', category: 'HARD' },
  'aranha-hard': { name: 'Aranha HARD', category: 'HARD' },
  'bloated-hard': { name: 'Bloated HARD', category: 'HARD' },
  'darklight-hard': { name: 'Darklight HARD', category: 'HARD' },
  'rotten-man-hard': { name: 'Rotten Man HARD', category: 'HARD' },
  'wandering-hard': { name: 'Wandering HARD', category: 'HARD' },
  'dark-thais-hard': { name: 'Dark Thais HARD', category: 'HARD' },
  'dark-thais-2-hard': { name: 'Dark Thais 2 HARD', category: 'HARD' },
  'piranha-hard': { name: 'Piranha HARD', category: 'HARD' },
  'cloak-hard': { name: 'Cloak HARD', category: 'HARD' },
  'rotten-hard': { name: 'Rotten HARD', category: 'HARD' },
  'brachiodemon-hard': { name: 'Brachiodemon HARD', category: 'HARD' }
};

// Armazena os claims ativos
const activeClaims = {};
const nextQueue = {};
const pendingDurationSelection = {};

// Emojis para as reações
const DURATION_EMOJIS = {
  '1️⃣': { duration: 75, label: '1h 15min' },
  '2️⃣': { duration: 135, label: '2h 15min' },
  '3️⃣': { duration: 195, label: '3h 15min' },
  '➕': { action: 'next', label: 'Next (entrar na fila)' },
  '✅': { action: 'finish', label: 'Terminar hunt' }
};

function formatBrasiliaTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

client.once('ready', async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  console.log(`📋 ${Object.keys(HUNTS).length} hunts configuradas`);
  
  setInterval(checkExpiredClaims, 30000);
  setInterval(() => updateStatusChannel(), 60000);
  setInterval(() => updateTempChannels(), 10000);
});

async function getOrCreateTempCategory(guild) {
  if (tempChannelsCategoryId) {
    const category = guild.channels.cache.get(tempChannelsCategoryId);
    if (category) return category;
  }

  let category = guild.channels.cache.find(c => c.name === '🎯 HUNTS ATIVAS' && c.type === ChannelType.GuildCategory);
  
  if (!category) {
    try {
      category = await guild.channels.create({
        name: '🎯 HUNTS ATIVAS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          }
        ]
      });
      console.log(`✅ Categoria "🎯 HUNTS ATIVAS" criada!`);
    } catch (error) {
      console.error('❌ Erro ao criar categoria:', error);
      return null;
    }
  }
  
  tempChannelsCategoryId = category.id;
  return category;
}

async function createTempChannel(guild, userId, username, huntId, huntName) {
  const category = await getOrCreateTempCategory(guild);
  if (!category) return null;

  try {
    const channelName = `🎯-${huntName.toLowerCase().replace(/\s+/g, '-')}`;
    
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `Hunt claimed por ${username} - Use as reações para gerenciar`,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: userId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
        }
      ]
    });

    console.log(`✅ Canal temporário criado: ${channel.name}`);
    return channel;
  } catch (error) {
    console.error('❌ Erro ao criar canal temporário:', error);
    return null;
  }
}

async function updateTempChannels() {
  for (const [huntId, claim] of Object.entries(activeClaims)) {
    if (!claim.tempChannel) continue;
    
    const channel = client.channels.cache.get(claim.tempChannel);
    if (!channel) continue;

    try {
      const messages = await channel.messages.fetch({ limit: 5 });
      const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);

      if (botMessage) {
        const timeRemaining = getTimeRemainingDetailed(claim.endTime);
        const endTimeFormatted = formatBrasiliaTime(claim.endTime);
        const hunt = HUNTS[huntId];
        
        const embed = new EmbedBuilder()
          .setColor(Date.now() >= claim.endTime ? '#FF0000' : '#00FF00')
          .setTitle(`🎯 ${hunt.name}`)
          .setDescription(`**Status:** ${Date.now() >= claim.endTime ? '🔴 EXPIRADO' : '🟢 ATIVO'}`)
          .addFields(
            { name: '👤 Claimed por', value: `<@${claim.user}>`, inline: true },
            { name: '⏱️ Duração', value: `${claim.duration} minutos`, inline: true },
            { name: '⏰ Tempo restante', value: timeRemaining, inline: true },
            { name: '🕐 Expira às', value: endTimeFormatted, inline: true },
            { name: '📅 Horário', value: 'Brasília (UTC-3)', inline: true }
          )
          .setFooter({ text: 'Atualiza automaticamente a cada 10 segundos' })
          .setTimestamp();

        if (nextQueue[huntId] && nextQueue[huntId].length > 0) {
          let queueText = '';
          nextQueue[huntId].forEach((next, index) => {
            const nextStart = formatBrasiliaTime(next.startTime);
            const nextEnd = formatBrasiliaTime(next.endTime);
            queueText += `**${index + 1}.** <@${next.user}> | 🕐 ${nextStart}-${nextEnd}\n`;
          });
          
          embed.addFields({
            name: `\n🔔 FILA (${nextQueue[huntId].length}/5)`,
            value: queueText,
            inline: false
          });
        }

        await botMessage.edit({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Erro ao atualizar canal temporário:', error);
    }
  }
}

async function deleteTempChannel(channelId) {
  if (!channelId) return;
  
  try {
    const channel = client.channels.cache.get(channelId);
    if (channel) {
      await channel.delete();
      console.log(`✅ Canal temporário deletado`);
    }
  } catch (error) {
    console.error('❌ Erro ao deletar canal temporário:', error);
  }
}

async function getOrCreateStatusChannel(guild) {
  if (statusChannelId) {
    const channel = guild.channels.cache.get(statusChannelId);
    if (channel) return channel;
  }

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

async function updateStatusChannel() {
  if (!statusChannelId) return;
  
  const channel = client.channels.cache.get(statusChannelId);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 10 });
  await channel.bulkDelete(messages).catch(() => {});

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

  for (const [category, claims] of Object.entries(categories)) {
    let description = '';
    
    claims.forEach(claim => {
      const status = claim.expired ? '🔴' : '🟢';
      description += `${status} **${claim.name}**\n`;
      description += `   👤 ${claim.user}\n`;
      description += `   ⏰ ${claim.time}\n\n`;
    });

    const embed = new EmbedBuilder()
      .setColor(category === 'HARD' ? '#FF0000' : category === 'VIP' ? '#FFD700' : category === 'INFERNIAK' ? '#FF6600' : category === 'WARZONE' ? '#8B00FF' : '#00FF00')
      .setTitle(`📍 ${category}`)
      .setDescription(description || 'Nenhum claim ativo')
      .setFooter({ text: '🕐 Horário de Brasília (UTC-3) • Atualiza a cada minuto' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

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

async function checkExpiredClaims() {
  const now = Date.now();
  
  for (const [huntId, claim] of Object.entries(activeClaims)) {
    if (now >= claim.endTime) {
      const hunt = HUNTS[huntId];
      const channel = client.channels.cache.get(claim.channel);
      
      const hasNext = nextQueue[huntId] && nextQueue[huntId].length > 0;
      
      if (hasNext) {
        const nextPerson = nextQueue[huntId].shift();
        
        const startTime = Date.now();
        const endTime = startTime + (nextPerson.duration * 60 * 1000);
        
        await deleteTempChannel(claim.tempChannel);
        
        const tempChannel = await createTempChannel(channel.guild, nextPerson.user, nextPerson.username, huntId, hunt.name);
        
        activeClaims[huntId] = {
          user: nextPerson.user,
          username: nextPerson.username,
          channel: nextPerson.channel,
          timestamp: startTime,
          endTime: endTime,
          duration: nextPerson.duration,
          tempChannel: tempChannel ? tempChannel.id : null
        };
        
        recalculateQueue(huntId);
        
        const endTimeFormatted = formatBrasiliaTime(endTime);
        
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔔 Próximo da Fila Ativado!')
            .setDescription(`O claim de <@${claim.user}> expirou!\n**${hunt.name}** agora é de <@${nextPerson.user}>`)
            .addFields(
              { name: '📍 Hunt', value: hunt.name, inline: true },
              { name: '⏱️ Duração', value: `${nextPerson.duration} minutos`, inline: true },
              { name: '🕐 Expira às', value: endTimeFormatted, inline: true }
            )
            .setFooter({ text: 'Horário de Brasília' })
            .setTimestamp();
          
          if (nextQueue[huntId] && nextQueue[huntId].length > 0) {
            let queueText = '';
            nextQueue[huntId].forEach((next, index) => {
              const nextStart = formatBrasiliaTime(next.startTime);
              const nextEnd = formatBrasiliaTime(next.endTime);
              queueText += `**${index + 1}.** <@${next.user}> | 🕐 ${nextStart}-${nextEnd}\n`;
            });
            
            embed.addFields({
              name: '\n🔔 PRÓXIMOS NA FILA',
              value: queueText,
              inline: false
            });
          }
          
          await channel.send({ embeds: [embed] });
        }
        
        if (tempChannel) {
          await sendTempChannelMessage(tempChannel, huntId, nextPerson.user, nextPerson.duration, endTime);
        }
      } else {
        if (channel) {
          channel.send(`⏰ O claim de **${hunt.name}** de <@${claim.user}> expirou! A hunt está disponível novamente! 🎉`);
        }
        
        await deleteTempChannel(claim.tempChannel);
        delete activeClaims[huntId];
      }
    }
  }
  
  await updateStatusChannel();
}

async function sendTempChannelMessage(channel, huntId, userId, duration, endTime) {
  const hunt = HUNTS[huntId];
  const endTimeFormatted = formatBrasiliaTime(endTime);
  const timeRemaining = getTimeRemainingDetailed(endTime);
  
  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle(`🎯 ${hunt.name}`)
    .setDescription('**Status:** 🟢 ATIVO')
    .addFields(
      { name: '👤 Claimed por', value: `<@${userId}>`, inline: true },
      { name: '⏱️ Duração', value: `${duration} minutos`, inline: true },
      { name: '⏰ Tempo restante', value: timeRemaining, inline: true },
      { name: '🕐 Expira às', value: endTimeFormatted, inline: true },
      { name: '📅 Horário', value: 'Brasília (UTC-3)', inline: true }
    )
    .setFooter({ text: 'Use as reações abaixo para gerenciar sua hunt' })
    .setTimestamp();

  const controlEmbed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🎮 CONTROLES DA HUNT')
    .setDescription('Use as reações abaixo para gerenciar:')
    .addFields(
      { name: '➕ Next', value: 'Entrar na fila desta hunt', inline: false },
      { name: '✅ Terminar', value: 'Finalizar sua hunt agora', inline: false }
    )
    .setFooter({ text: 'Clique nas reações para usar' });

  const message = await channel.send({ content: `<@${userId}> Bem-vindo ao seu canal de hunt!`, embeds: [embed, controlEmbed] });
  
  await message.react('➕');
  await message.react('✅');
}

function listHunts(message) {
  const categories = {};
  
  for (const [id, hunt] of Object.entries(HUNTS)) {
    if (!categories[hunt.category]) {
      categories[hunt.category] = [];
    }
    
    const claim = activeClaims[id];
    const status = claim ? '🔴' : '🟢';
    categories[hunt.category].push({ id, hunt, status, claim });
  }

  for (const [category, hunts] of Object.entries(categories)) {
    let description = '';
    
    hunts.forEach(({ id, hunt, status, claim }) => {
      description += `${status} **${hunt.name}** (\`${id}\`)\n`;
      
      if (claim) {
        const time = getTimeRemainingDetailed(claim.endTime);
        const endTime = formatBrasiliaTime(claim.endTime);
        description += `   👤 <@${claim.user}> | ⏰ ${time} | 🕐 ${endTime}\n`;
        
        if (nextQueue[id] && nextQueue[id].length > 0) {
          description += `   🔔 **FILA (${nextQueue[id].length}):**\n`;
          nextQueue[id].forEach((next, index) => {
            const nextStart = formatBrasiliaTime(next.startTime);
            const nextEnd = formatBrasiliaTime(next.endTime);
            description += `      **${index + 1}.** <@${next.user}> | 🕐 ${nextStart}-${nextEnd}\n`;
          });
        }
      }
      description += '\n';
    });

    const embed = new EmbedBuilder()
      .setColor(category === 'HARD' ? '#FF0000' : category === 'VIP' ? '#FFD700' : category === 'INFERNIAK' ? '#FF6600' : category === 'WARZONE' ? '#8B00FF' : '#00FF00')
      .setTitle(`📍 ${category}`)
      .setDescription(description)
      .setFooter({ text: 'Use !claim <hunt> para claimar' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
}

function showCommands(message) {
  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('📋 Lista de Comandos')
    .setDescription('Todos os comandos disponíveis do bot')
    .addFields(
      { 
        name: '👥 Comandos Gerais', 
        value: '`!hunts` - Lista todas as hunts por categoria\n`!lista` - Lista simplificada (disponíveis/claimed)\n`!claim <hunt>` - Claima uma hunt (escolha a duração)\n`!tempo <hunt>` - Verifica tempo restante\n`!fila <hunt>` - Mostra a fila de uma hunt\n`!status` - Status de todos os claims ativos\n`!comandos` - Mostra esta lista',
        inline: false 
      },
      { 
        name: '🛡️ Comandos Admin', 
        value: '`!terminoja <hunt>` - Remove claim de uma hunt\n`!limparclaims` - Remove todos os claims\n`!limpasala` - Limpa todas as mensagens do canal',
        inline: false 
      },
      {
        name: '🎯 Sistema de Claims',
        value: 'Ao dar !claim, escolha a duração:\n**1️⃣** 1h 15min (75 minutos)\n**2️⃣** 2h 15min (135 minutos)\n**3️⃣** 3h 15min (195 minutos)\n**➕** Next (entrar na fila)\n**✅** Terminar hunt',
        inline: false
      }
    )
    .setFooter({ text: 'Bot de Hunt Claims • Desenvolvido para organização' })
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

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

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('⏱️ Escolha a Duração da Hunt')
    .setDescription(`**${hunt.name}**\n\nClique em uma das reações abaixo para definir quanto tempo você vai ficar:`)
    .addFields(
      { name: '1️⃣', value: '**1h 15min** (75 minutos)', inline: true },
      { name: '2️⃣', value: '**2h 15min** (135 minutos)', inline: true },
      { name: '3️⃣', value: '**3h 15min** (195 minutos)', inline: true }
    )
    .setFooter({ text: 'Você tem 60 segundos para escolher' })
    .setTimestamp();

  const selectionMessage = await message.reply({ embeds: [embed] });
  
  await selectionMessage.react('1️⃣');
  await selectionMessage.react('2️⃣');
  await selectionMessage.react('3️⃣');

  pendingDurationSelection[selectionMessage.id] = {
    huntId: huntId,
    userId: message.author.id,
    username: message.author.username,
    channel: message.channel.id,
    guildId: message.guild.id,
    timestamp: Date.now()
  };

  setTimeout(() => {
    if (pendingDurationSelection[selectionMessage.id]) {
      delete pendingDurationSelection[selectionMessage.id];
      selectionMessage.delete().catch(() => {});
    }
  }, 60000);
}

async function processDurationSelection(reaction, user, messageId) {
  const selection = pendingDurationSelection[messageId];
  if (!selection || selection.userId !== user.id) return;

  const emoji = reaction.emoji.name;
  const durationInfo = DURATION_EMOJIS[emoji];
  
  if (!durationInfo || !durationInfo.duration) return;

  const hunt = HUNTS[selection.huntId];
  const duration = durationInfo.duration;
  
  const startTime = Date.now();
  const endTime = startTime + (duration * 60 * 1000);

  const guild = client.guilds.cache.get(selection.guildId);
  const tempChannel = await createTempChannel(guild, user.id, selection.username, selection.huntId, hunt.name);

  activeClaims[selection.huntId] = {
    user: user.id,
    username: selection.username,
    channel: selection.channel,
    timestamp: startTime,
    endTime: endTime,
    duration: duration,
    tempChannel: tempChannel ? tempChannel.id : null
  };

  const endTimeFormatted = formatBrasiliaTime(endTime);

  const originalChannel = client.channels.cache.get(selection.channel);
  if (originalChannel) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Claim Realizado!')
      .setDescription(`**${hunt.name}** foi claimed por <@${user.id}>`)
      .addFields(
        { name: '📍 Hunt', value: hunt.name, inline: true },
        { name: '⏱️ Duração', value: `${duration} minutos (${durationInfo.label})`, inline: true },
        { name: '🕐 Expira às', value: endTimeFormatted, inline: true }
      )
      .setFooter({ text: 'Horário de Brasília (UTC-3)' })
      .setTimestamp();

    await originalChannel.send({ embeds: [embed] });
  }

  if (tempChannel) {
    await sendTempChannelMessage(tempChannel, selection.huntId, user.id, duration, endTime);
  }

  delete pendingDurationSelection[messageId];
  reaction.message.delete().catch(() => {});

  await updateStatusChannel();
}

function getTimeRemainingDetailed(endTime) {
  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) {
    return '⏰ **EXPIRADO**';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
}

function checkTime(message, huntId) {
  const hunt = HUNTS[huntId];
  
  if (!hunt) {
    return message.reply(`❌ Hunt não encontrada! Use \`!hunts\` ou \`!lista\` para ver as hunts disponíveis.`);
  }

  const claim = activeClaims[huntId];
  
  if (!claim) {
    return message.reply(`✅ **${hunt.name}** está disponível para claim!`);
  }

  const timeRemaining = getTimeRemainingDetailed(claim.endTime);
  const endTime = formatBrasiliaTime(claim.endTime);
  
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`⏰ Status: ${hunt.name}`)
    .addFields(
      { name: '👤 Claimed por', value: `<@${claim.user}>`, inline: true },
      { name: '⏱️ Duração', value: `${claim.duration} minutos`, inline: true },
      { name: '⏰ Tempo restante', value: timeRemaining, inline: false },
      { name: '🕐 Expira às', value: endTime, inline: true },
      { name: '📅 Horário', value: 'Brasília (UTC-3)', inline: true }
    )
    .setTimestamp();

  if (nextQueue[huntId] && nextQueue[huntId].length > 0) {
    let queueText = '';
    nextQueue[huntId].forEach((next, index) => {
      const nextStart = formatBrasiliaTime(next.startTime);
      const nextEnd = formatBrasiliaTime(next.endTime);
      queueText += `**${index + 1}.** <@${next.user}> | 🕐 ${nextStart}-${nextEnd}\n`;
    });
    
    embed.addFields({
      name: `\n🔔 FILA (${nextQueue[huntId].length}/5)`,
      value: queueText,
      inline: false
    });
  }

  message.reply({ embeds: [embed] });
}

function showQueue(message, huntId) {
  const hunt = HUNTS[huntId];
  
  if (!hunt) {
    return message.reply(`❌ Hunt não encontrada! Use \`!hunts\` ou \`!lista\` para ver as hunts disponíveis.`);
  }

  if (!nextQueue[huntId] || nextQueue[huntId].length === 0) {
    return message.reply(`ℹ️ **${hunt.name}** não tem ninguém na fila.`);
  }

  let queueText = '';
  nextQueue[huntId].forEach((next, index) => {
    const nextStart = formatBrasiliaDateTime(next.startTime);
    const nextEnd = formatBrasiliaDateTime(next.endTime);
    queueText += `**${index + 1}.** <@${next.user}>\n`;
    queueText += `   🕐 Início: ${nextStart}\n`;
    queueText += `   🕐 Fim: ${nextEnd}\n`;
    queueText += `   ⏱️ Duração: ${next.duration} minutos\n\n`;
  });

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🔔 Fila: ${hunt.name}`)
    .setDescription(queueText)
    .setFooter({ text: `${nextQueue[huntId].length}/5 pessoas na fila` })
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

async function addToQueue(reaction, user, huntId) {
  const hunt = HUNTS[huntId];
  const claim = activeClaims[huntId];
  
  if (!claim) {
    return;
  }

  if (!nextQueue[huntId]) {
    nextQueue[huntId] = [];
  }

  if (nextQueue[huntId].length >= 5) {
    const tempMessage = await reaction.message.channel.send(`❌ <@${user.id}> A fila de **${hunt.name}** está cheia (máximo 5 pessoas)!`);
    setTimeout(() => tempMessage.delete().catch(() => {}), 5000);
    return;
  }

  const alreadyInQueue = nextQueue[huntId].some(next => next.user === user.id);
  if (alreadyInQueue) {
    const tempMessage = await reaction.message.channel.send(`❌ <@${user.id}> Você já está na fila de **${hunt.name}**!`);
    setTimeout(() => tempMessage.delete().catch(() => {}), 5000);
    return;
  }

  if (claim.user === user.id) {
    const tempMessage = await reaction.message.channel.send(`❌ <@${user.id}> Você não pode entrar na fila da sua própria hunt!`);
    setTimeout(() => tempMessage.delete().catch(() => {}), 5000);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('⏱️ Escolha a Duração para a Fila')
    .setDescription(`**${hunt.name}**\n\nClique em uma das reações abaixo para definir quanto tempo você vai ficar quando for sua vez:`)
    .addFields(
      { name: '1️⃣', value: '**1h 15min** (75 minutos)', inline: true },
      { name: '2️⃣', value: '**2h 15min** (135 minutos)', inline: true },
      { name: '3️⃣', value: '**3h 15min** (195 minutos)', inline: true }
    )
    .setFooter({ text: 'Você tem 60 segundos para escolher' })
    .setTimestamp();

  const selectionMessage = await reaction.message.channel.send({ content: `<@${user.id}>`, embeds: [embed] });
  
  await selectionMessage.react('1️⃣');
  await selectionMessage.react('2️⃣');
  await selectionMessage.react('3️⃣');

  pendingDurationSelection[selectionMessage.id] = {
    huntId: huntId,
    userId: user.id,
    username: user.username,
    channel: reaction.message.channel.id,
    guildId: reaction.message.guild.id,
    timestamp: Date.now(),
    isQueue: true
  };

  setTimeout(() => {
    if (pendingDurationSelection[selectionMessage.id]) {
      delete pendingDurationSelection[selectionMessage.id];
      selectionMessage.delete().catch(() => {});
    }
  }, 60000);
}

async function processQueueDurationSelection(reaction, user, messageId) {
  const selection = pendingDurationSelection[messageId];
  if (!selection || selection.userId !== user.id || !selection.isQueue) return;

  const emoji = reaction.emoji.name;
  const durationInfo = DURATION_EMOJIS[emoji];
  
  if (!durationInfo || !durationInfo.duration) return;

  const hunt = HUNTS[selection.huntId];
  const duration = durationInfo.duration;

  let startTime = activeClaims[selection.huntId].endTime;
  
  if (nextQueue[selection.huntId] && nextQueue[selection.huntId].length > 0) {
    const lastInQueue = nextQueue[selection.huntId][nextQueue[selection.huntId].length - 1];
    startTime = lastInQueue.endTime;
  }

  const endTime = startTime + (duration * 60 * 1000);

  nextQueue[selection.huntId].push({
    user: user.id,
    username: user.username,
    channel: selection.channel,
    duration: duration,
    startTime: startTime,
    endTime: endTime
  });

  const position = nextQueue[selection.huntId].length;
  const startTimeFormatted = formatBrasiliaDateTime(startTime);
  const endTimeFormatted = formatBrasiliaDateTime(endTime);

  const originalChannel = client.channels.cache.get(selection.channel);
  if (originalChannel) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Adicionado à Fila!')
      .setDescription(`<@${user.id}> entrou na fila de **${hunt.name}**`)
      .addFields(
        { name: '📍 Posição', value: `${position}º na fila`, inline: true },
        { name: '⏱️ Duração', value: `${duration} minutos`, inline: true },
        { name: '🕐 Início previsto', value: startTimeFormatted, inline: false },
        { name: '🕐 Fim previsto', value: endTimeFormatted, inline: false }
      )
      .setFooter({ text: 'Horário de Brasília (UTC-3)' })
      .setTimestamp();

    await originalChannel.send({ embeds: [embed] });
  }

  delete pendingDurationSelection[messageId];
  reaction.message.delete().catch(() => {});

  await updateTempChannels();
}

function recalculateQueue(huntId) {
  if (!nextQueue[huntId] || nextQueue[huntId].length === 0) return;

  let startTime = activeClaims[huntId].endTime;

  nextQueue[huntId].forEach((next, index) => {
    next.startTime = startTime;
    next.endTime = startTime + (next.duration * 60 * 1000);
    startTime = next.endTime;
  });
}

async function finishHunt(reaction, user, huntId) {
  const claim = activeClaims[huntId];
  
  if (!claim) return;

  if (claim.user !== user.id) {
    const tempMessage = await reaction.message.channel.send(`❌ <@${user.id}> Apenas quem deu o claim pode finalizar a hunt!`);
    setTimeout(() => tempMessage.delete().catch(() => {}), 5000);
    return;
  }

  const hunt = HUNTS[huntId];
  const originalChannel = client.channels.cache.get(claim.channel);

  const hasNext = nextQueue[huntId] && nextQueue[huntId].length > 0;

  if (hasNext) {
    const nextPerson = nextQueue[huntId].shift();
    
    const startTime = Date.now();
    const endTime = startTime + (nextPerson.duration * 60 * 1000);
    
    await deleteTempChannel(claim.tempChannel);
    
    const guild = reaction.message.guild;
    const tempChannel = await createTempChannel(guild, nextPerson.user, nextPerson.username, huntId, hunt.name);
    
    activeClaims[huntId] = {
      user: nextPerson.user,
      username: nextPerson.username,
      channel: nextPerson.channel,
      timestamp: startTime,
      endTime: endTime,
      duration: nextPerson.duration,
      tempChannel: tempChannel ? tempChannel.id : null
    };
    
    recalculateQueue(huntId);
    
    const endTimeFormatted = formatBrasiliaTime(endTime);
    
    if (originalChannel) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Hunt Finalizada - Próximo Ativado!')
        .setDescription(`<@${user.id}> finalizou **${hunt.name}**!\nAgora é a vez de <@${nextPerson.user}>`)
        .addFields(
          { name: '📍 Hunt', value: hunt.name, inline: true },
          { name: '⏱️ Duração', value: `${nextPerson.duration} minutos`, inline: true },
          { name: '🕐 Expira às', value: endTimeFormatted, inline: true }
        )
        .setFooter({ text: 'Horário de Brasília (UTC-3)' })
        .setTimestamp();
      
      await originalChannel.send({ embeds: [embed] });
    }
    
    if (tempChannel) {
      await sendTempChannelMessage(tempChannel, huntId, nextPerson.user, nextPerson.duration, endTime);
    }
  } else {
    if (originalChannel) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Hunt Finalizada')
        .setDescription(`<@${user.id}> finalizou **${hunt.name}**!\nA hunt está disponível novamente! 🎉`)
        .setTimestamp();
      
      await originalChannel.send({ embeds: [embed] });
    }
    
    await deleteTempChannel(claim.tempChannel);
    delete activeClaims[huntId];
  }

  await updateStatusChannel();
}

function showStatus(message) {
  if (Object.keys(activeClaims).length === 0) {
    return message.reply('✅ Não há nenhum claim ativo no momento!');
  }

  const categories = {};
  
  for (const [id, claim] of Object.entries(activeClaims)) {
    const hunt = HUNTS[id];
    const category = hunt.category;
    
    if (!categories[category]) {
      categories[category] = [];
    }
    
    const timeRemaining = getTimeRemainingDetailed(claim.endTime);
    const endTime = formatBrasiliaTime(claim.endTime);
    
    categories[category].push({
      name: hunt.name,
      user: claim.user,
      time: timeRemaining,
      endTime: endTime,
      duration: claim.duration,
      expired: Date.now() >= claim.endTime,
      hasQueue: nextQueue[id] && nextQueue[id].length > 0,
      queueLength: nextQueue[id] ? nextQueue[id].length : 0
    });
  }

  for (const [category, claims] of Object.entries(categories)) {
    let description = '';
    
    claims.forEach(claim => {
      const status = claim.expired ? '🔴' : '🟢';
      description += `${status} **${claim.name}**\n`;
      description += `   👤 <@${claim.user}>\n`;
      description += `   ⏰ ${claim.time}\n`;
      description += `   🕐 Expira: ${claim.endTime}\n`;
      description += `   ⏱️ Duração: ${claim.duration}min\n`;
      
      if (claim.hasQueue) {
        description += `   🔔 Fila: ${claim.queueLength} pessoa(s)\n`;
      }
      
      description += '\n';
    });

    const embed = new EmbedBuilder()
      .setColor(category === 'HARD' ? '#FF0000' : category === 'VIP' ? '#FFD700' : category === 'INFERNIAK' ? '#FF6600' : category === 'WARZONE' ? '#8B00FF' : '#00FF00')
      .setTitle(`📍 ${category}`)
      .setDescription(description)
      .setFooter({ text: '🕐 Horário de Brasília (UTC-3)' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
}

function listSimple(message) {
  const available = [];
  const claimed = [];

  for (const [id, hunt] of Object.entries(HUNTS)) {
    if (activeClaims[id]) {
      const claim = activeClaims[id];
      const time = getTimeRemainingDetailed(claim.endTime);
      claimed.push(`🔴 **${hunt.name}** - <@${claim.user}> (${time})`);
    } else {
      available.push(`🟢 **${hunt.name}**`);
    }
  }

  const embedAvailable = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('✅ Hunts Disponíveis')
    .setDescription(available.length > 0 ? available.join('\n') : 'Nenhuma hunt disponível')
    .setFooter({ text: `${available.length} hunts disponíveis` })
    .setTimestamp();

  const embedClaimed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('🔴 Hunts Claimed')
    .setDescription(claimed.length > 0 ? claimed.join('\n') : 'Nenhuma hunt claimed')
    .setFooter({ text: `${claimed.length} hunts claimed` })
    .setTimestamp();

  message.channel.send({ embeds: [embedAvailable, embedClaimed] });
}

function removeClaim(message, huntId) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ Você precisa ser administrador para usar este comando!');
  }

  const hunt = HUNTS[huntId];
  
  if (!hunt) {
    return message.reply(`❌ Hunt não encontrada! Use \`!hunts\` ou \`!lista\` para ver as hunts disponíveis.`);
  }

  const claim = activeClaims[huntId];
  
  if (!claim) {
    return message.reply(`ℹ️ **${hunt.name}** não está claimed.`);
  }

  deleteTempChannel(claim.tempChannel);
  delete activeClaims[huntId];
  
  if (nextQueue[huntId]) {
    delete nextQueue[huntId];
  }

  message.reply(`✅ Claim de **${hunt.name}** removido com sucesso! A hunt está disponível novamente.`);
  
  updateStatusChannel();
}

function clearAllClaims(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ Você precisa ser administrador para usar este comando!');
  }

  const count = Object.keys(activeClaims).length;

  for (const [huntId, claim] of Object.entries(activeClaims)) {
    deleteTempChannel(claim.tempChannel);
    delete activeClaims[huntId];
  }

  for (const huntId in nextQueue) {
    delete nextQueue[huntId];
  }

  message.reply(`✅ Todos os ${count} claims foram removidos! Todas as hunts estão disponíveis novamente.`);
  
  updateStatusChannel();
}

async function clearChannel(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ Você precisa ser administrador para usar este comando!');
  }

  try {
    let deleted = 0;
    let fetched;

    do {
      fetched = await message.channel.messages.fetch({ limit: 100 });
      
      const deletableMessages = fetched.filter(msg => {
        const diff = Date.now() - msg.createdTimestamp;
        return diff < 14 * 24 * 60 * 60 * 1000;
      });

      if (deletableMessages.size > 0) {
        await message.channel.bulkDelete(deletableMessages, true);
        deleted += deletableMessages.size;
      }

      if (fetched.size < 100) break;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } while (fetched.size >= 2);

    const confirmMsg = await message.channel.send(`✅ ${deleted} mensagens foram deletadas!`);
    setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
  } catch (error) {
    console.error('Erro ao limpar canal:', error);
    message.reply('❌ Erro ao limpar o canal. Verifique as permissões do bot.');
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args[0].toLowerCase();
  const huntId = args[1] ? args[1].toLowerCase() : null;

  switch (command) {
    case 'hunts':
      listHunts(message);
      break;

    case 'lista':
      listSimple(message);
      break;

    case 'claim':
      if (!huntId) {
        message.reply('❌ Use: `!claim <hunt>`\nExemplo: `!claim energy-vip`');
      } else {
        await claimHunt(message, huntId);
      }
      break;

    case 'tempo':
      if (!huntId) {
        message.reply('❌ Use: `!tempo <hunt>`\nExemplo: `!tempo energy-vip`');
      } else {
        checkTime(message, huntId);
      }
      break;

    case 'fila':
      if (!huntId) {
        message.reply('❌ Use: `!fila <hunt>`\nExemplo: `!fila energy-vip`');
      } else {
        showQueue(message, huntId);
      }
      break;

    case 'status':
      showStatus(message);
      break;

    case 'comandos':
    case 'ajuda':
    case 'help':
      showCommands(message);
      break;

    case 'terminoja':
      if (!huntId) {
        message.reply('❌ Use: `!terminoja <hunt>`\nExemplo: `!terminoja energy-vip`');
      } else {
        removeClaim(message, huntId);
      }
      break;

    case 'limparclaims':
      clearAllClaims(message);
      break;

    case 'limpasala':
      await clearChannel(message);
      break;

    default:
      break;
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Erro ao buscar reação:', error);
      return;
    }
  }

  const messageId = reaction.message.id;
  const emoji = reaction.emoji.name;

  if (pendingDurationSelection[messageId]) {
    const selection = pendingDurationSelection[messageId];
    
    if (selection.isQueue) {
      await processQueueDurationSelection(reaction, user, messageId);
    } else {
      await processDurationSelection(reaction, user, messageId);
    }
    return;
  }

  for (const [huntId, claim] of Object.entries(activeClaims)) {
    if (claim.tempChannel === reaction.message.channel.id) {
      if (emoji === '➕') {
        await addToQueue(reaction, user, huntId);
      } else if (emoji === '✅') {
        await finishHunt(reaction, user, huntId);
      }
      break;
    }
  }
});

client.login(TOKEN);
