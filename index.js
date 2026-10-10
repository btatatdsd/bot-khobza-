/* ============================================================
 *  𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 Discord Bot
 * ============================================================ */
require('dotenv').config();

const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  PermissionFlagsBits, ChannelType, ActivityType, AuditLogEvent,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Events
} = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

/* ===================== CONFIG ===================== */
const TOKEN                    = process.env.DISCORD_TOKEN;
const PREFIX                   = process.env.PREFIX || '!';
const WELCOME_CHANNEL_ID       = process.env.WELCOME_CHANNEL_ID || '1558168781677924383';
const WELCOME_IMAGE            = process.env.WELCOME_IMAGE || '';
const ROLE_LOG_CHANNEL_ID      = process.env.ROLE_LOG_CHANNEL_ID || '1557761485961171085';
const MUTE_LOG_CHANNEL_ID      = process.env.MUTE_LOG_CHANNEL_ID || '1558158698805723226';
const MOVE_LOG_CHANNEL_ID      = process.env.MOVE_LOG_CHANNEL_ID || '1558625461821640808';
const BAN_LOG_CHANNEL_ID       = process.env.BAN_LOG_CHANNEL_ID || '1558158791659229354';
const KICK_LOG_CHANNEL_ID      = process.env.KICK_LOG_CHANNEL_ID || '';
const GENERAL_LOG_CHANNEL_ID   = process.env.GENERAL_LOG_CHANNEL_ID || '';
const MC_SERVER_IP             = process.env.MC_SERVER_IP || 'play.khobzasmp.com';
const MC_STORE_URL             = process.env.MC_STORE_URL || 'https://store.khobzasmp.com';
const DATA_DIR                 = process.env.DATA_DIR || __dirname;
const VOICE_CFG_FILE           = path.join(DATA_DIR, 'voice-config.json');
const MUTE_CFG_FILE            = path.join(DATA_DIR, 'mute-config.json');
const RECONNECT_DELAY          = 5000;
const VERIFY_CHANNEL_ID        = process.env.VERIFY_CHANNEL_ID || '1558503393226530947';
const VERIFY_IMAGE             = process.env.VERIFY_IMAGE || '';
const UNVERIFIED_ROLE_ID       = process.env.UNVERIFIED_ROLE_ID || '1557761141575262298';
const VERIFIED_ROLE_ID         = process.env.VERIFIED_ROLE_ID || '1557761111242051704';
const APPLY_STAFF_CHANNEL_ID   = process.env.APPLY_STAFF_CHANNEL_ID || '1557761363617521724';
const APPLY_RESULTS_CHANNEL_ID = process.env.APPLY_RESULTS_CHANNEL_ID || '1558583636025147505';

// === Staff Roles ===
const HELPER_ROLE_ID           = process.env.HELPER_ROLE_ID || '1557761089163231432';
const MOD_ROLE_ID              = process.env.MOD_ROLE_ID || '1557761087380652043';
const ADMIN_ROLE_ID            = process.env.ADMIN_ROLE_ID || '1557761086147666011';

if (!TOKEN) { console.error('[FATAL] DISCORD_TOKEN missing.'); process.exit(1); }

/* ===================== CLIENT ===================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User, Partials.Reaction]
});

const C = { ok: 0x57f287, err: 0xed4245, info: 0x5865f2, warn: 0xfee75c };

/* ===================== APPLY QUESTIONS ===================== */
const APPLY_QUESTIONS_MC = [
  { key: 'mc_username',      label: 'Minecraft Username',   q: 'What is your Minecraft username?' },
  { key: 'discord_username', label: 'Discord Username',     q: 'What is your Discord username?' },
  { key: 'age',              label: 'Age',                  q: 'How old are you?' },
  { key: 'tz_country',       label: 'Timezone & Country',   q: 'What is your time zone and country?' },
  { key: 'position',         label: 'Staff Position',       q: 'Which staff position are you applying for? (Helper, Moderator, Admin)' },
  { key: 'playtime',         label: 'Minecraft Playtime',   q: 'How long have you been playing Minecraft?' }
];

const APPLY_QUESTIONS_DISCORD = [
  { key: 'mc_username',      label: 'Minecraft Username',   q: 'What is your Minecraft username?' },
  { key: 'discord_username', label: 'Discord Username',     q: 'What is your Discord username?' },
  { key: 'age',              label: 'Age',                  q: 'How old are you?' },
  { key: 'tz_country',       label: 'Timezone & Country',   q: 'What is your time zone and country?' },
  { key: 'position',         label: 'Staff Position',       q: 'Which staff position are you applying for? (Helper, Moderator, Admin)' },
  { key: 'playtime',         label: 'Minecraft Playtime',   q: 'How long have you been playing Minecraft?' }
];

/* ===================== STORES ===================== */
const warnings = new Map();
const afks     = new Map();
const economy  = new Map();
const settings = { antispam: false, antiinvite: false, antiraid: false, antimention: false, automod: false, logs: '' };
const spamMap  = new Map();
const joinLog  = [];
const applications   = new Map();
const dmApplications = new Map();

/* ===================== STAFF TIER SYSTEM ===================== */
function getStaffTier(member) {
  if (!member) return null;
  if (member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return { tier: 'admin', maxMute: 30, minMute: 5, canMove: true, label: 'Admin' };
  }
  if (member.roles.cache.has(ADMIN_ROLE_ID))
    return { tier: 'admin', maxMute: 30, minMute: 5, canMove: true, label: 'Admin' };
  if (member.roles.cache.has(MOD_ROLE_ID))
    return { tier: 'mod', maxMute: 10, minMute: 5, canMove: true, label: 'Moderator' };
  if (member.roles.cache.has(HELPER_ROLE_ID))
    return { tier: 'helper', maxMute: 10, minMute: 5, canMove: false, label: 'Helper' };
  return null;
}

/* ===================== VOICE MUTE STORAGE ===================== */
/* Structure: { "guildId:userId": { guildId, userId, unmuteAt, reason, modTag, modTier } } */
function loadMuteConfig() {
  try { if (fs.existsSync(MUTE_CFG_FILE)) return JSON.parse(fs.readFileSync(MUTE_CFG_FILE, 'utf8')); }
  catch (e) { console.error('[MUTE CFG] load:', e.message); }
  return {};
}
function saveMuteConfig(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(MUTE_CFG_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('[MUTE CFG] save:', e.message); }
}
const activeMutes = loadMuteConfig();
const muteTimers  = new Map(); // key -> Timeout

function scheduleUnmute(key) {
  if (muteTimers.has(key)) clearTimeout(muteTimers.get(key));
  const data = activeMutes[key];
  if (!data) return;

  const delay = data.unmuteAt - Date.now();
  if (delay <= 0) { doUnmute(key).catch(()=>{}); return; }

  const t = setTimeout(() => doUnmute(key).catch(()=>{}), delay);
  muteTimers.set(key, t);
}

async function doUnmute(key) {
  const data = activeMutes[key];
  if (!data) return;

  delete activeMutes[key];
  saveMuteConfig(activeMutes);
  if (muteTimers.has(key)) { clearTimeout(muteTimers.get(key)); muteTimers.delete(key); }

  try {
    const guild = client.guilds.cache.get(data.guildId);
    if (!guild) return;
    const member = await guild.members.fetch(data.userId).catch(()=>null);
    if (!member) return;
    if (member.voice?.serverMute) {
      await member.voice.setMute(false, 'Auto-unmute (duration expired)').catch(()=>{});
    }

    const e = okE('🔊 Auto Unmuted').addFields(
      { name: 'User', value: `<@${data.userId}>`, inline: true },
      { name: 'Reason', value: data.reason || '—', inline: true }
    );
    sendLog(guild, MUTE_LOG_CHANNEL_ID, e);
    console.log(`[MUTE] Auto-unmuted ${data.userId}`);
  } catch (e) { console.error('[MUTE] auto-unmute error:', e.message); }
}

async function restoreMutes() {
  for (const key of Object.keys(activeMutes)) {
    const data = activeMutes[key];
    try {
      const guild = client.guilds.cache.get(data.guildId);
      if (!guild) continue;
      const member = await guild.members.fetch(data.userId).catch(()=>null);
      if (member && member.voice?.channel && !member.voice.serverMute) {
        await member.voice.setMute(true, 'Restoring mute after restart').catch(()=>{});
      }
      scheduleUnmute(key);
    } catch (e) { console.error('[MUTE] restore error:', e.message); }
  }
}

/* ===================== HELPERS ===================== */
const em = (color, title, desc) => {
  const e = new EmbedBuilder().setColor(color).setTimestamp();
  if (title) e.setTitle(title);
  if (desc) e.setDescription(desc);
  return e;
};
const okE = (t, d) => em(C.ok, t, d);
const errE = (t, d) => em(C.err, t, d);
const infoE = (t, d) => em(C.info, t, d);

async function sendLog(guild, channelId, embed) {
  if (!channelId || !guild) return;
  const ch = guild.channels.cache.get(channelId);
  if (!ch || !ch.isTextBased()) return;
  try { await ch.send({ embeds: [embed] }); } catch (e) { console.error('log err:', e.message); }
}
async function auditExec(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const e = logs.entries.find(x => x.targetId === targetId && Date.now() - x.createdTimestamp < 15000);
    return e ? e.executor : null;
  } catch { return null; }
}
const has = (m, p) => m.permissions.has(p);
function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
  return `${Math.floor(s/86400)}d`;
}
async function resolveMember(msg, str) {
  if (!str) return null;
  const m = msg.mentions.members.first(); if (m) return m;
  return msg.guild.members.fetch(str.replace(/[<@!>]/g, '')).catch(() => null);
}
async function resolveUser(msg, str) {
  if (!str) return null;
  const u = msg.mentions.users.first(); if (u) return u;
  return client.users.fetch(str.replace(/[<@!>]/g, '')).catch(() => null);
}
function eco(id) {
  if (!economy.has(id)) economy.set(id, { balance: 100, daily: 0, rep: 0, msgs: 0 });
  return economy.get(id);
}

/* ===================== VOICE 24/7 ===================== */
function loadVoiceConfig() {
  try { if (fs.existsSync(VOICE_CFG_FILE)) return JSON.parse(fs.readFileSync(VOICE_CFG_FILE, 'utf8')); }
  catch (e) { console.error('[VOICE CFG] load:', e.message); }
  return {};
}
function saveVoiceConfig(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(VOICE_CFG_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('[VOICE CFG] save:', e.message); }
}
const voiceConfig = loadVoiceConfig();
const reconnectTimers = new Map();

async function connectToVoice(guild, channelId) {
  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(()=>null);
  if (!channel) throw new Error(`Channel not found: ${channelId}`);
  if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)
    throw new Error('Target is not a voice channel.');
  const me = guild.members.me || (await guild.members.fetch(client.user.id));
  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionFlagsBits.Connect)) throw new Error('Missing **Connect** permission.');
  if (!perms?.has(PermissionFlagsBits.Speak))   throw new Error('Missing **Speak** permission.');
  const existing = getVoiceConnection(guild.id);
  if (existing) { try { existing.destroy(); } catch {} }
  const connection = joinVoiceChannel({
    channelId: channel.id, guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true, selfMute: true
  });
  connection.on(VoiceConnectionStatus.Ready, () => console.log(`[VOICE] ✅ Ready in ${guild.name}`));
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000)
      ]);
    } catch {
      try { connection.destroy(); } catch {}
      if (reconnectTimers.has(guild.id)) return;
      const t = setTimeout(async () => {
        reconnectTimers.delete(guild.id);
        const saved = voiceConfig[guild.id]; if (!saved) return;
        try { await connectToVoice(guild, saved); } catch (e) { console.error('[VOICE] reconnect:', e.message); }
      }, RECONNECT_DELAY);
      reconnectTimers.set(guild.id, t);
    }
  });
  return connection;
}
async function restoreAllVoiceConnections() {
  for (const [guildId, channelId] of Object.entries(voiceConfig)) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    try { await connectToVoice(guild, channelId); }
    catch (e) { console.error(`[VOICE] restore ${guildId}:`, e.message); }
  }
}

/* ===================== WELCOME FUNCTION ===================== */
async function sendWelcome(guild, member) {
  if (!WELCOME_CHANNEL_ID) return { ok: false, reason: 'ID empty' };
  let ch = guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!ch) ch = await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(()=>null);
  if (!ch) return { ok: false, reason: 'Channel not found' };
  if (!ch.isTextBased()) return { ok: false, reason: 'Not text-based' };
  const perms = ch.permissionsFor(guild.members.me);
  if (!perms?.has(PermissionFlagsBits.ViewChannel)) return { ok: false, reason: 'Missing View' };
  if (!perms?.has(PermissionFlagsBits.SendMessages)) return { ok: false, reason: 'Missing Send' };

  const embed = new EmbedBuilder()
    .setColor(C.ok)
    .setTitle('🎉 Welcome!')
    .setDescription(`مرحبا بيك في سيرفر **𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷** ${member}!\nWelcome to **𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷**!`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Member #${guild.memberCount}` })
    .setTimestamp();
  if (WELCOME_IMAGE) embed.setImage(WELCOME_IMAGE);

  try {
    await ch.send({ content: `${member}`, embeds: [embed] });
    return { ok: true, channel: ch };
  } catch (err) { return { ok: false, reason: err.message }; }
}

/* ============================================================
 *                       COMMANDS
 * ============================================================ */
const commands = {};

/* ---------- VERIFY ---------- */
commands.verifypanel = { cat: 'Verify', desc: 'Send verification panel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const ch = m.guild.channels.cache.get(VERIFY_CHANNEL_ID) || await m.guild.channels.fetch(VERIFY_CHANNEL_ID).catch(()=>null);
  if (!ch || !ch.isTextBased()) return m.reply({ embeds: [errE(`❌ Channel <#${VERIFY_CHANNEL_ID}> not found.`)] });

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle('✅ Verification')
    .setDescription(
      '**مرحبا بيك فـ 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷!**\n\n' +
      'باش توصل لجميع الرومات، خاصك تدير التحقق.\n' +
      'كليكي على الزر تحت باش تأخذ الـ Verified role.\n\n' +
      '**Welcome to 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷!**\n' +
      'Click the button below to verify and get access to all channels.'
    )
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Verification System' })
    .setTimestamp();

  if (VERIFY_IMAGE) embed.setImage(VERIFY_IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_button').setLabel('Verify').setEmoji('✅').setStyle(ButtonStyle.Success)
  );

  await ch.send({ embeds: [embed], components: [row] });
  m.reply({ embeds: [okE('✅ Panel sent', `In ${ch}`)] }).catch(()=>{});
}};

/* ---------- APPLY STAFF PANEL ---------- */
commands.applypanel = { cat: 'Verify', desc: 'Send apply staff panel (with optional image)', usage: 'applypanel [imageURL]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });

  const ch = m.guild.channels.cache.get(APPLY_STAFF_CHANNEL_ID) || await m.guild.channels.fetch(APPLY_STAFF_CHANNEL_ID).catch(()=>null);
  if (!ch || !ch.isTextBased()) return m.reply({ embeds: [errE(`❌ Channel <#${APPLY_STAFF_CHANNEL_ID}> not found.`)] });

  let imageURL = (a[0] || '').trim();

  if (!imageURL && m.reference?.messageId) {
    const replied = await m.channel.messages.fetch(m.reference.messageId).catch(()=>null);
    if (replied) {
      if (replied.attachments.size) imageURL = replied.attachments.first().url;
      else { const urlMatch = replied.content.match(/https?:\/\/\S+/i); if (urlMatch) imageURL = urlMatch[0]; }
    }
  }
  if (!imageURL && m.attachments.size) imageURL = m.attachments.first().url;

  if (!imageURL) {
    await m.reply({ embeds: [infoE('🖼️ أرسل رابط الصورة', 'صيفط رابط الصورة (URL)، أو ارفع صورة، أو كتب `cancel` لإلغاء.\nعندك **60 ثانية**.')] });
    const filter = x => x.author.id === m.author.id && x.channel.id === m.channel.id;
    try {
      const coll = await m.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const replyMsg = coll.first();
      if (replyMsg.content.toLowerCase().trim() === 'cancel') return m.reply({ embeds: [infoE('❌ Cancelled.')] });
      if (replyMsg.attachments.size) imageURL = replyMsg.attachments.first().url;
      else { const urlMatch = replyMsg.content.match(/https?:\/\/\S+/i); if (urlMatch) imageURL = urlMatch[0]; }
      replyMsg.delete().catch(()=>{});
      if (!imageURL) return m.reply({ embeds: [errE('❌ No valid URL found.')] });
    } catch { return m.reply({ embeds: [errE('⏰ Timed out.')] }); }
  }

  imageURL = imageURL.trim().replace(/[>),]+$/, '');
  if (!/^https?:\/\//i.test(imageURL)) return m.reply({ embeds: [errE('❌ Invalid URL.', `\`${imageURL.slice(0, 100)}\``)] });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📝 Apply for Staff — 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷')
    .setDescription(
      '**بغيتي تولي Staff فـ 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷؟**\n\n' +
      'اختار النوع اللي بغيتي تقدم عليه:\n\n' +
      '🎮 **Apply Staff Minecraft** — Staff داخل السيرفر\n' +
      '💬 **Apply Staff Discord** — Staff فـ الديسكورد\n\n' +
      '**كيفاش كيخدم؟**\n' +
      '1. كليكي على الزر المناسب.\n' +
      '2. البوت غادي يصيفط ليك DM بالأسئلة.\n' +
      '3. جاوب على كل الأسئلة فـ الخاص.\n' +
      '4. الـ Staff غادي يراجع طلبك.'
    )
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Applications' })
    .setTimestamp()
    .setImage(imageURL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_minecraft').setLabel('Apply Staff Minecraft').setEmoji('🎮').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('apply_discord').setLabel('Apply Staff Discord').setEmoji('💬').setStyle(ButtonStyle.Primary)
  );

  try {
    await ch.send({ embeds: [embed], components: [row] });
    m.reply({ embeds: [okE('✅ Panel sent', `In ${ch}\n**Image:** ${imageURL}`)] }).catch(()=>{});
  } catch (e) {
    console.error('[APPLYPANEL] send error:', e);
    m.reply({ embeds: [errE('❌ Failed to send', e.message)] });
  }
}};

/* ---------- DIAGNOSTIC ---------- */
commands.intents = { cat: 'Utility', desc: 'Check intents', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  m.reply({ embeds: [infoE('🔍 Intents').setDescription(
    `**Guilds**: ${client.guilds.cache.size}\n**Members**: ${m.guild.memberCount}\n**Cached**: ${m.guild.members.cache.size}\n\n**Members Intent**: ${m.guild.members.cache.size > 1 ? '✅ ON' : '❌ OFF'}`
  )] });
}};
commands.mytier = { cat: 'Utility', desc: 'Show your staff tier', async run(m) {
  const t = getStaffTier(m.member);
  if (!t) return m.reply({ embeds: [errE('❌ ما عندكش رتبة staff.')] });
  m.reply({ embeds: [infoE('🎖️ Staff Tier').addFields(
    { name: 'Rank', value: t.label, inline: true },
    { name: 'Max Mute', value: `${t.maxMute} دقائق`, inline: true },
    { name: 'Min Mute', value: `${t.minMute} دقائق`, inline: true },
    { name: 'Can Move', value: t.canMove ? '✅' : '❌', inline: true }
  )] });
}};

/* ---------- MODERATION ---------- */
commands.ban = { cat: 'Moderation', desc: 'Ban', usage: 'ban <@user> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Not found.')] });
  if (!t.bannable) return m.reply({ embeds: [errE('Hierarchy.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  await t.ban({ reason: `${m.author.tag}: ${r}` }).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('🔨 Banned').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'By', value: m.author.tag, inline: true }, { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, BAN_LOG_CHANNEL_ID, e);
}};
commands.unban = { cat: 'Moderation', desc: 'Unban', usage: 'unban <id>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  if (!a[0]) return m.reply({ embeds: [errE('Provide ID.')] });
  try { await m.guild.bans.remove(a[0]); m.reply({ embeds: [okE('🔓 Unbanned', `\`${a[0]}\``)] }); } catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.kick = { cat: 'Moderation', desc: 'Kick', usage: 'kick <@user> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.KickMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Not found.')] });
  if (!t.kickable) return m.reply({ embeds: [errE('Hierarchy.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  await t.kick(`${m.author.tag}: ${r}`).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('👢 Kicked').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'By', value: m.author.tag, inline: true }, { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, KICK_LOG_CHANNEL_ID, e);
}};

/* ============================================================
 *  !mute — VOICE MUTE (server mute in voice channel)
 *  Helper & Moderator → 5-10 min
 *  Admin → 5-30 min
 *  Logs → MUTE_LOG_CHANNEL_ID
 * ============================================================ */
commands.mute = { cat: 'Moderation', desc: 'Voice-mute a member (server mute)', usage: 'mute <@user> <minutes> <reason>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ ما عندكش صلاحية تدير mute.')] });

  const target = await resolveMember(m, a[0]);
  if (!target) return m.reply({ embeds: [errE('❌ ما لقيتش العضو. Usage: `!mute @user <minutes> <reason>`')] });

  const minutes = parseInt(a[1], 10);
  const reason = a.slice(2).join(' ').trim();

  if (isNaN(minutes)) return m.reply({ embeds: [errE('❌ خاصك تحدد المدة بالدقائق. مثال: `!mute @user 10 spam`')] });
  if (!reason) return m.reply({ embeds: [errE('❌ خاصك تكتب السبب. مثال: `!mute @user 10 spam`')] });

  if (minutes < tier.minMute) {
    return m.reply({ embeds: [errE('❌ المدة قليلة بزاف', `الحد الأدنى هو **${tier.minMute}** دقائق.`)] });
  }
  if (minutes > tier.maxMute) {
    if (tier.tier === 'helper') {
      return m.reply({ embeds: [errE('❌ mymknch aw9 rak 4a helper', `الحد الأقصى للـ Helper هو **10 دقائق**.`)] });
    }
    if (tier.tier === 'mod') {
      return m.reply({ embeds: [errE('❌ الحد الأقصى للـ Moderator هو 10 دقائق', `طلب من Admin إلا بغيتي مدة أطول.`)] });
    }
    return m.reply({ embeds: [errE('❌ الحد الأقصى هو 30 دقيقة.')] });
  }

  // Must be in a voice channel
  if (!target.voice?.channel) {
    return m.reply({ embeds: [errE('❌ العضو ماشي فـ voice channel.', 'الـ mute هو **voice mute** — العضو خاصو يكون فـ روم صوتي.')] });
  }

  // Check bot can mute (hierarchy)
  const me = m.guild.members.me;
  if (target.roles.highest.position >= me.roles.highest.position) {
    return m.reply({ embeds: [errE('❌ ما نقدرش ندير mute لهاد العضو (Role hierarchy).')] });
  }

  try {
    await target.voice.setMute(true, `${m.author.tag} [${tier.label}]: ${reason}`);

    const key = `${m.guild.id}:${target.id}`;
    const ms = minutes * 60 * 1000;
    activeMutes[key] = {
      guildId: m.guild.id,
      userId: target.id,
      unmuteAt: Date.now() + ms,
      reason,
      modTag: m.author.tag,
      modTier: tier.label,
      channelId: target.voice.channel.id
    };
    saveMuteConfig(activeMutes);
    scheduleUnmute(key);

    const e = okE('🔇 Voice Muted').addFields(
      { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
      { name: 'Duration', value: `${minutes} min`, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'Channel', value: `<#${target.voice.channel.id}>`, inline: true },
      { name: 'Reason', value: reason }
    );
    m.reply({ embeds: [e] });
    sendLog(m.guild, MUTE_LOG_CHANNEL_ID, e);
    console.log(`[MUTE] ${target.user.tag} muted for ${minutes} min by ${m.author.tag}`);
  } catch (err) {
    console.error('[MUTE] error:', err);
    m.reply({ embeds: [errE('❌ فشل الـ mute', err.message)] });
  }
}};

commands.unmute = { cat: 'Moderation', desc: 'Unmute (voice)', usage: 'unmute <@user>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ ما عندكش صلاحية.')] });

  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Not found.')] });

  if (!t.voice?.channel) return m.reply({ embeds: [errE('❌ العضو ماشي فـ voice channel.')] });
  if (!t.voice.serverMute) return m.reply({ embeds: [errE('❌ العضو ماشي muted.')] });

  try {
    await t.voice.setMute(false, `Unmuted by ${m.author.tag}`);

    const key = `${m.guild.id}:${t.id}`;
    if (activeMutes[key]) {
      delete activeMutes[key];
      saveMuteConfig(activeMutes);
      if (muteTimers.has(key)) { clearTimeout(muteTimers.get(key)); muteTimers.delete(key); }
    }

    const e = okE('🔊 Unmuted').addFields(
      { name: 'User', value: `${t.user.tag}`, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true }
    );
    m.reply({ embeds: [e] });
    sendLog(m.guild, MUTE_LOG_CHANNEL_ID, e);
  } catch (err) {
    m.reply({ embeds: [errE('❌ Failed', err.message)] });
  }
}};
commands.timeout = commands.mute;
commands.untimeout = commands.unmute;

commands.warn = { cat: 'Moderation', desc: 'Warn', usage: 'warn <@user> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Not found.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  const list = warnings.get(t.id) || []; list.push({ mod: m.author.tag, reason: r, ts: Date.now() }); warnings.set(t.id, list);
  m.reply({ embeds: [okE('⚠️ Warned').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'Total', value: `${list.length}`, inline: true }, { name: 'Reason', value: r })] });
}};
commands.warnings = { cat: 'Moderation', desc: 'List warnings', usage: 'warnings <@user>', async run(m, a) {
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [errE('Not found.')] });
  const list = warnings.get(u.id) || [];
  if (!list.length) return m.reply({ embeds: [infoE('No Warnings', `${u.tag} has none.`)] });
  m.reply({ embeds: [infoE(`Warnings for ${u.tag}`).setDescription(list.map((w, i) => `**#${i+1}** — ${w.reason} *by ${w.mod}*`).join('\n'))] });
}};
commands.clearwarns = { cat: 'Moderation', desc: 'Clear warnings', usage: 'clearwarns <@user>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.tier === 'helper') return m.reply({ embeds: [errE('❌ No permission (Moderator+ only).')] });
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [errE('Not found.')] });
  warnings.delete(u.id);
  m.reply({ embeds: [okE('✅ Cleared', u.tag)] });
}};
commands.purge = { cat: 'Moderation', desc: 'Purge', usage: 'purge <1-100>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ No permission.')] });
  const n = Math.min(Math.max(parseInt(a[0]) || 0, 1), 100);
  const del = await m.channel.bulkDelete(n, true).catch(()=>null);
  if (del) m.channel.send({ embeds: [okE('🧹 Purged', `${del.size} messages.`)] }).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 4000));
}};
commands.clear = commands.purge;
commands.slowmode = { cat: 'Moderation', desc: 'Slowmode', usage: 'slowmode <sec>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ No permission.')] });
  const s = Math.min(Math.max(parseInt(a[0]) || 0, 0), 21600);
  await m.channel.setRateLimitPerUser(s).catch(()=>{});
  m.reply({ embeds: [okE('⏱️', `${s}s`)] });
}};
commands.lock = { cat: 'Moderation', desc: 'Lock', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.tier === 'helper') return m.reply({ embeds: [errE('❌ No permission (Moderator+).')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: false }).catch(()=>{});
  m.reply({ embeds: [okE('🔒', `${ch}`)] });
}};
commands.unlock = { cat: 'Moderation', desc: 'Unlock', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.tier === 'helper') return m.reply({ embeds: [errE('❌ No permission (Moderator+).')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: null }).catch(()=>{});
  m.reply({ embeds: [okE('🔓', `${ch}`)] });
}};
commands.lockall = { cat: 'Moderation', desc: 'Lock all', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin.')] });
  let n = 0; for (const [, ch] of m.guild.channels.cache) if (ch.isTextBased()) { await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: false }).catch(()=>{}); n++; }
  m.reply({ embeds: [okE('🔒', `${n}`)] });
}};
commands.unlockall = { cat: 'Moderation', desc: 'Unlock all', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin.')] });
  let n = 0; for (const [, ch] of m.guild.channels.cache) if (ch.isTextBased()) { await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: null }).catch(()=>{}); n++; }
  m.reply({ embeds: [okE('🔓', `${n}`)] });
}};
commands.softban = { cat: 'Moderation', desc: 'Softban', usage: 'softban <@user>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Not found.')] });
  try { await m.guild.bans.create(t.id, { deleteMessageSeconds: 604800 }); await m.guild.bans.remove(t.id); m.reply({ embeds: [okE('🧹', t.user.tag)] }); } catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.hackban = { cat: 'Moderation', desc: 'Hackban', usage: 'hackban <id>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  if (!a[0]) return m.reply({ embeds: [errE('Provide ID.')] });
  try { await m.guild.bans.create(a[0]); m.reply({ embeds: [okE('🔨', `\`${a[0]}\``)] }); } catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.massban = { cat: 'Moderation', desc: 'Massban', usage: 'massban id1,id2', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ids = (a[0] || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!ids.length) return m.reply({ embeds: [errE('Provide IDs.')] });
  let ok = 0, fail = 0;
  for (const id of ids) { try { await m.guild.bans.create(id); ok++; } catch { fail++; } }
  m.reply({ embeds: [okE('Done', `✅ ${ok} • ❌ ${fail}`)] });
}};

/* ============================================================
 *  !move — with MOVE_LOG_CHANNEL_ID
 * ============================================================ */
commands.move = { cat: 'Moderation', desc: 'Move a member to a voice channel', usage: 'move <@user> <#voice>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ ما عندكش صلاحية.')] });
  if (!tier.canMove) return m.reply({ embeds: [errE('❌ mymknkch aw9 rak 4a helper', 'الـ Helper ما عندوش صلاحية الـ move.')] });

  const target = await resolveMember(m, a[0]);
  const ch = m.mentions.channels.first();
  if (!target || !ch) return m.reply({ embeds: [errE('Usage: `!move @user #voice`')] });
  if (ch.type !== ChannelType.GuildVoice && ch.type !== ChannelType.GuildStageVoice)
    return m.reply({ embeds: [errE('❌ الهدف ماشي voice channel.')] });

  const fromCh = target.voice?.channel;

  try {
    await target.voice.setChannel(ch, `Moved by ${m.author.tag} (${tier.label})`);

    const e = okE('➡️ Member Moved').addFields(
      { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'From', value: fromCh ? `${fromCh}` : '*none*', inline: true },
      { name: 'To', value: `${ch}`, inline: true }
    );
    m.reply({ embeds: [e] });
    sendLog(m.guild, MOVE_LOG_CHANNEL_ID, e);
    console.log(`[MOVE] ${target.user.tag} moved to #${ch.name} by ${m.author.tag}`);
  } catch (err) {
    console.error('[MOVE] error:', err);
    m.reply({ embeds: [errE('❌ Failed', err.message)] });
  }
}};

/* ---------- MEMBERS ---------- */
commands.userinfo = { cat: 'Members', desc: 'User info', usage: 'userinfo [@user]', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  const mem = await m.guild.members.fetch(u.id).catch(()=>null);
  const e = infoE(`👤 ${u.tag}`).setThumbnail(u.displayAvatarURL({ size: 256 })).addFields(
    { name: 'ID', value: u.id, inline: true }, { name: 'Bot', value: u.bot ? 'Yes' : 'No', inline: true },
    { name: 'Created', value: `<t:${Math.floor(u.createdTimestamp/1000)}:R>`, inline: true });
  if (mem) e.addFields({ name: 'Joined', value: `<t:${Math.floor(mem.joinedTimestamp/1000)}:R>`, inline: true });
  m.reply({ embeds: [e] });
}};
commands.serverinfo = { cat: 'Members', desc: 'Server info', async run(m) {
  const g = m.guild;
  m.reply({ embeds: [infoE(`📊 ${g.name}`).setThumbnail(g.iconURL({ size: 256 }) || null).addFields(
    { name: 'Owner', value: `<@${g.ownerId}>`, inline: true }, { name: 'Members', value: `${g.memberCount}`, inline: true },
    { name: 'Channels', value: `${g.channels.cache.size}`, inline: true }, { name: 'Roles', value: `${g.roles.cache.size}`, inline: true },
    { name: 'ID', value: g.id })] });
}};
commands.avatar = { cat: 'Members', desc: 'Avatar', usage: 'avatar [@user]', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  m.reply({ embeds: [infoE(`🖼️ ${u.tag}`).setImage(u.displayAvatarURL({ size: 1024 }))] });
}};
commands.membercount = { cat: 'Members', desc: 'Count', async run(m) { m.reply({ embeds: [infoE('👥', `${m.guild.memberCount}`)] }); }};
commands.roles = { cat: 'Members', desc: 'List roles', async run(m) {
  m.reply({ embeds: [infoE('🏷️ Roles').setDescription(m.guild.roles.cache.sort((a,b)=>b.position-a.position).map(r => r.toString()).join(' ').slice(0, 4000))] });
}};
commands.afk = { cat: 'Members', desc: 'AFK', usage: 'afk [reason]', async run(m, a) {
  afks.set(m.author.id, a.join(' ') || 'AFK');
  m.reply({ embeds: [okE('💤', afks.get(m.author.id))] });
}};
commands.whois = commands.userinfo;

/* ---------- SECURITY ---------- */
commands.logs = { cat: 'Security', desc: 'Log config', async run(m) {
  m.reply({ embeds: [infoE('📜 Logs').addFields(
    { name: 'Role', value: ROLE_LOG_CHANNEL_ID ? `<#${ROLE_LOG_CHANNEL_ID}>` : 'Not set' },
    { name: 'Mute', value: MUTE_LOG_CHANNEL_ID ? `<#${MUTE_LOG_CHANNEL_ID}>` : 'Not set' },
    { name: 'Move', value: MOVE_LOG_CHANNEL_ID ? `<#${MOVE_LOG_CHANNEL_ID}>` : 'Not set' },
    { name: 'Ban', value: BAN_LOG_CHANNEL_ID ? `<#${BAN_LOG_CHANNEL_ID}>` : 'Not set' },
    { name: 'Kick', value: KICK_LOG_CHANNEL_ID ? `<#${KICK_LOG_CHANNEL_ID}>` : 'Not set' })] });
}};
commands.setlogs = { cat: 'Security', desc: 'Set logs', usage: 'setlogs #ch', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin.')] });
  const ch = m.mentions.channels.first(); if (!ch) return m.reply({ embeds: [errE('Mention.')] });
  settings.logs = ch.id;
  m.reply({ embeds: [okE('✅', `${ch}`)] });
}};
commands.audit = { cat: 'Security', desc: 'Audit', async run(m) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.tier === 'helper') return m.reply({ embeds: [errE('❌ No permission (Moderator+).')] });
  const logs = await m.guild.fetchAuditLogs({ limit: 10 }).catch(()=>null);
  if (!logs) return m.reply({ embeds: [errE('Failed.')] });
  m.reply({ embeds: [infoE('📋 Audit').setDescription(logs.entries.map(e => `**${e.action}** — ${e.executor?.tag || '?'} → ${e.target?.tag || e.targetId || ''}`).join('\n') || 'Empty')] });
}};
commands.modlogs = commands.audit;
const toggle = (key, name) => ({ cat: 'Security', desc: `Toggle ${name}`, async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin.')] });
  settings[key] = !settings[key];
  m.reply({ embeds: [okE(`🛡️ ${name}`, `${settings[key] ? 'ON' : 'OFF'}`)] });
}});
commands.antispam = toggle('antispam', 'Anti-spam');
commands.antiinvite = toggle('antiinvite', 'Anti-invite');
commands.antiraid = toggle('antiraid', 'Anti-raid');
commands.antimention = toggle('antimention', 'Anti-mention');
commands.automod = toggle('automod', 'Automod');
commands.security = { cat: 'Security', desc: 'Security', async run(m) {
  m.reply({ embeds: [infoE('🛡️ Security').addFields(
    { name: 'Anti-spam', value: settings.antispam ? '✅' : '❌', inline: true },
    { name: 'Anti-invite', value: settings.antiinvite ? '✅' : '❌', inline: true },
    { name: 'Anti-raid', value: settings.antiraid ? '✅' : '❌', inline: true },
    { name: 'Anti-mention', value: settings.antimention ? '✅' : '❌', inline: true },
    { name: 'Automod', value: settings.automod ? '✅' : '❌', inline: true })] });
}};

/* ---------- UTILITY ---------- */
commands.help = { cat: 'Utility', desc: 'List commands', usage: 'help [command]', async run(m, a) {
  if (a[0]) {
    const c = commands[a[0].toLowerCase()];
    if (!c) return m.reply({ embeds: [errE('Not found.')] });
    return m.reply({ embeds: [infoE(`📖 ${PREFIX}${a[0]}`).addFields({ name: 'Category', value: c.cat, inline: true }, { name: 'Usage', value: c.usage || `${PREFIX}${a[0]}`, inline: true }, { name: 'Desc', value: c.desc })] });
  }
  const cats = {};
  for (const [n, c] of Object.entries(commands)) (cats[c.cat] = cats[c.cat] || []).push(`\`${PREFIX}${n}\``);
  const e = infoE('📖 Commands');
  for (const [cat, list] of Object.entries(cats)) e.addFields({ name: cat, value: list.join(', ').slice(0, 1020) });
  m.reply({ embeds: [e] });
}};
commands.ping = { cat: 'Utility', desc: 'Ping', async run(m) {
  const s = await m.reply('🏓...');
  s.edit({ content: null, embeds: [okE('🏓 Pong!', `Gateway: **${client.ws.ping}ms**\nRoundtrip: **${s.createdTimestamp - m.createdTimestamp}ms**`)] });
}};
commands.uptime = { cat: 'Utility', desc: 'Uptime', async run(m) { m.reply({ embeds: [infoE('⏱️', fmtDur(client.uptime))] }); }};
commands.botinfo = { cat: 'Utility', desc: 'Bot info', async run(m) {
  m.reply({ embeds: [infoE('🤖 Bot').addFields(
    { name: 'Tag', value: client.user.tag, inline: true }, { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
    { name: 'Uptime', value: fmtDur(client.uptime), inline: true }, { name: 'Node', value: process.version, inline: true })] });
}};
commands.invite = { cat: 'Utility', desc: 'Invite', async run(m) {
  m.reply({ embeds: [infoE('🔗', `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)] });
}};
commands.poll = { cat: 'Utility', desc: 'Poll', usage: 'poll Q? | a | b', async run(m, a) {
  const [q, ...opts] = a.join(' ').split('|').map(s => s.trim());
  if (!q || !opts.length) return m.reply({ embeds: [errE('Usage: poll Q? | opt1 | opt2')] });
  const nums = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const msg = await m.channel.send({ embeds: [infoE(`📊 ${q}`).setDescription(opts.map((o, i) => `${nums[i]} ${o}`).join('\n'))] });
  for (let i = 0; i < Math.min(opts.length, 10); i++) await msg.react(nums[i]);
}};
commands.say = { cat: 'Utility', desc: 'Say', usage: 'say <text>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = a.join(' '); if (!t) return;
  m.delete().catch(()=>{}); m.channel.send(t);
}};
commands.embed = { cat: 'Utility', desc: 'Embed', usage: 'embed Title | Desc', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const [title, ...rest] = a.join(' ').split('|');
  m.channel.send({ embeds: [infoE((title||'').trim(), rest.join('|').trim())] });
}};
commands.msg = { cat: 'Utility', desc: 'Auto message', usage: 'msg create <name>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  if (a[0] !== 'create' || !a[1]) return m.reply({ embeds: [errE('Usage: msg create <name>')] });
  await m.reply({ embeds: [infoE('✍️ Content', 'Type `cancel` (60s).')] });
  const f = x => x.author.id === m.author.id && x.channel.id === m.channel.id;
  let content; try { const c = await m.channel.awaitMessages({ filter: f, max: 1, time: 60000, errors: ['time'] }); content = c.first().content; } catch { return m.reply({ embeds: [errE('Timed out.')] }); }
  if (content.toLowerCase() === 'cancel') return m.reply({ embeds: [infoE('Cancelled.')] });
  await m.reply({ embeds: [infoE('📍 Where?', '`channel` / `#mention` / `dm`')] });
  let w; try { const c = await m.channel.awaitMessages({ filter: f, max: 1, time: 60000, errors: ['time'] }); w = c.first(); } catch { return m.reply({ embeds: [errE('Timed out.')] }); }
  const t = w.content.trim();
  if (t === 'channel') { await m.channel.send(content); return m.reply({ embeds: [okE('✅')] }); }
  if (t === 'dm') {
    await m.reply({ embeds: [infoE('👥 Who?', '`all` / `humans` / `bots` / mention')] });
    let tg; try { const c = await m.channel.awaitMessages({ filter: f, max: 1, time: 60000, errors: ['time'] }); tg = c.first(); } catch { return m.reply({ embeds: [errE('Timed out.')] }); }
    let list = [];
    if (['all','humans','bots'].includes(tg.content)) {
      const all = await m.guild.members.fetch();
      list = [...all.values()].filter(x => x.id !== client.user.id && (tg.content === 'all' || (tg.content === 'humans' && !x.user.bot) || (tg.content === 'bots' && x.user.bot)));
    } else list = [...tg.mentions.members.values()];
    if (!list.length) return m.reply({ embeds: [errE('No recipients.')] });
    const conf = await m.channel.send({ embeds: [infoE('⚠️ Confirm', `Send to **${list.length}**? React ✅`)] });
    await conf.react('✅');
    const r = await conf.awaitReactions({ filter: (re, u) => re.emoji.name === '✅' && u.id === m.author.id, max: 1, time: 30000 }).catch(()=>null);
    if (!r || !r.size) return m.reply({ embeds: [errE('Cancelled.')] });
    let ok = 0, fail = 0;
    for (const mem of list) { try { await mem.send(content); ok++; } catch { fail++; } await new Promise(r => setTimeout(r, 1200)); }
    return m.reply({ embeds: [okE('✅', `✅ ${ok} • ❌ ${fail}`)] });
  }
  const ch = m.mentions.channels.first();
  if (ch) { await ch.send(content); return m.reply({ embeds: [okE('✅', `${ch}`)] }); }
  m.reply({ embeds: [errE('Unknown target.')] });
}};
commands.announce = { cat: 'Utility', desc: 'Announce', usage: 'announce <text>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = a.join(' '); if (!t) return;
  m.channel.send({ embeds: [infoE('📢', t)] });
}};
commands.calculate = { cat: 'Utility', desc: 'Calc', usage: 'calculate 2+2', async run(m, a) {
  const e = a.join(' ').replace(/[^0-9+\-*/(). %]/g, '');
  if (!e) return m.reply({ embeds: [errE('Usage: calculate 2+2')] });
  try { m.reply({ embeds: [okE('🧮', `\`${e}\` = **${Function(`"use strict"; return (${e});`)()}**`)] }); } catch { m.reply({ embeds: [errE('Invalid.')] }); }
}};
commands.choose = { cat: 'Utility', desc: 'Choose', usage: 'choose a b c', async run(m, a) {
  if (a.length < 2) return m.reply({ embeds: [errE('At least 2.')] });
  m.reply({ embeds: [okE('🎲', a[Math.floor(Math.random()*a.length)])] });
}};
commands.coinflip = { cat: 'Utility', desc: 'Coin', async run(m) { m.reply({ embeds: [okE('🪙', Math.random() < 0.5 ? 'Heads' : 'Tails')] }); }};
commands.roll = { cat: 'Utility', desc: 'Roll', usage: 'roll [NdN]', async run(m, a) {
  const r = a[0] && a[0].match(/^(\d+)d(\d+)$/i);
  if (r) { const n = parseInt(r[1]), s = parseInt(r[2]); let tot = 0, rs = []; for (let i = 0; i < Math.min(n, 20); i++) { const v = Math.ceil(Math.random()*s); rs.push(v); tot += v; } return m.reply({ embeds: [okE('🎲', `${rs.join(', ')}\nTotal: **${tot}**`)] }); }
  m.reply({ embeds: [okE('🎲', `**${Math.ceil(Math.random()*100)}**`)] });
}};
commands['8ball'] = { cat: 'Utility', desc: '8-ball', usage: '8ball Q?', async run(m, a) {
  const ans = ['Yes.','No.','Maybe.','Definitely.','Absolutely not.','Ask again.','I doubt it.','For sure!','Unlikely.'];
  m.reply({ embeds: [infoE('🎱', `❓ ${a.join(' ') || '...'}\n💬 **${ans[Math.floor(Math.random()*ans.length)]}**`)] });
}};
commands.servericon = { cat: 'Utility', desc: 'Icon', async run(m) {
  if (!m.guild.iconURL()) return m.reply({ embeds: [errE('No icon.')] });
  m.reply({ embeds: [infoE('🖼️').setImage(m.guild.iconURL({ size: 1024 }))] });
}};

/* ---------- SMP ---------- */
commands.ip = { cat: 'SMP', desc: 'IP', async run(m) { m.reply({ embeds: [infoE('🖥️', `\`\`\`${MC_SERVER_IP}\`\`\``)] }); }};
commands.serverstatus = { cat: 'SMP', desc: 'Status', async run(m) {
  try {
    const r = await fetch(`https://api.mcsrvstat.us/3/${MC_SERVER_IP}`).then(x => x.json());
    if (!r.online) return m.reply({ embeds: [errE('Offline.')] });
    m.reply({ embeds: [infoE('🎮').addFields({ name: 'Players', value: `${r.players?.online ?? 0}/${r.players?.max ?? 0}`, inline: true }, { name: 'Version', value: r.version || '?', inline: true })] });
  } catch { m.reply({ embeds: [errE('API.')] }); }
}};
commands.rules = { cat: 'SMP', desc: 'Rules', async run(m) { m.reply({ embeds: [infoE('📜 Rules', '1. احترم الجميع.\n2. ممنوع Hacks.\n3. ممنوع Griefing.\n4. لا سبام.\n5. التزم بالـ Staff.')] }); }};
commands.store = { cat: 'SMP', desc: 'Store', async run(m) { m.reply({ embeds: [infoE('🛒', MC_STORE_URL)] }); }};
commands.mcuser = { cat: 'SMP', desc: 'MC lookup', usage: 'mcuser <name>', async run(m, a) {
  if (!a[0]) return m.reply({ embeds: [errE('Provide.')] });
  try {
    const r = await fetch(`https://api.mojang.com/users/profiles/minecraft/${a[0]}`).then(x => x.ok ? x.json() : null);
    if (!r) return m.reply({ embeds: [errE('Not found.')] });
    m.reply({ embeds: [infoE(`🎮 ${r.name}`).setThumbnail(`https://mc-heads.net/avatar/${r.id}/128`).addFields({ name: 'UUID', value: r.id })] });
  } catch { m.reply({ embeds: [errE('Failed.')] }); }
}};

/* ---------- VOICE ---------- */
commands.addvoice = { cat: 'Voice', desc: 'Join voice 24/7', usage: 'addvoice <voiceChannelId>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const id = (a[0] || '').replace(/[<#>]/g, '').trim();
  if (!id || !/^\d{17,20}$/.test(id)) return m.reply({ embeds: [errE('Usage: addvoice <voiceChannelId>')] });
  const ch = m.guild.channels.cache.get(id) || await m.guild.channels.fetch(id).catch(()=>null);
  if (!ch) return m.reply({ embeds: [errE('❌ Not found.')] });
  if (ch.type !== ChannelType.GuildVoice && ch.type !== ChannelType.GuildStageVoice) return m.reply({ embeds: [errE('❌ Not voice.')] });
  try { await connectToVoice(m.guild, ch.id); voiceConfig[m.guild.id] = ch.id; saveVoiceConfig(voiceConfig); m.reply({ embeds: [okE('🔊', `${ch}`)] }); }
  catch (e) { m.reply({ embeds: [errE('❌ Failed', e.message)] }); }
}};
commands.removevoice = { cat: 'Voice', desc: 'Disconnect', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const conn = getVoiceConnection(m.guild.id);
  if (conn) { try { conn.destroy(); } catch {} }
  if (reconnectTimers.has(m.guild.id)) { clearTimeout(reconnectTimers.get(m.guild.id)); reconnectTimers.delete(m.guild.id); }
  const had = !!voiceConfig[m.guild.id];
  delete voiceConfig[m.guild.id]; saveVoiceConfig(voiceConfig);
  m.reply({ embeds: [okE('🔇', had ? 'Removed.' : 'Was not saved.')] });
}};

/* ============================================================
 *                     EVENT: READY
 * ============================================================ */
client.once('ready', async () => {
  console.log('==============================');
  console.log(`[READY] Logged in as ${client.user.tag}`);
  console.log(`[READY] Guilds: ${client.guilds.cache.size}`);
  console.log(`[READY] Mute Log: ${MUTE_LOG_CHANNEL_ID}`);
  console.log(`[READY] Move Log: ${MOVE_LOG_CHANNEL_ID}`);
  for (const [, guild] of client.guilds.cache) {
    const ch = guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (ch) {
      console.log(`[READY] ✅ Welcome #${ch.name}`);
      console.log(`[READY] Cached: ${guild.members.cache.size}/${guild.memberCount}`);
      if (guild.members.cache.size <= 1) console.warn('[READY] ⚠️ SERVER MEMBERS INTENT may be OFF!');
    } else console.warn(`[READY] ❌ Welcome channel ${WELCOME_CHANNEL_ID} not found`);
  }
  console.log('==============================');
  client.user.setActivity('𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷', { type: ActivityType.Watching });
  await restoreAllVoiceConnections();
  await restoreMutes();
});

/* ============================================================
 *             EVENT: WELCOME + AUTO ROLE
 * ============================================================ */
client.on('guildMemberAdd', async member => {
  console.log(`[WELCOME] ➕ ${member.user.tag} (${member.id})`);
  if (UNVERIFIED_ROLE_ID) {
    try { await member.roles.add(UNVERIFIED_ROLE_ID, 'Auto role on join'); }
    catch (e) { console.error(`[WELCOME] ❌ unverified role:`, e.message); }
  }
  joinLog.push(Date.now());
  while (joinLog.length && Date.now() - joinLog[0] > 10000) joinLog.shift();
  if (settings.antiraid && joinLog.length >= 8) {
    try { await member.kick('Anti-raid'); } catch {}
    return;
  }
  await sendWelcome(member.guild, member);
});

/* ============================================================
 *             EVENT: INTERACTION
 * ============================================================ */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  const id = interaction.customId;

  /* --- Verify button --- */
  if (id === 'verify_button') {
    try {
      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
        return interaction.reply({ embeds: [infoE('ℹ️ Already Verified', 'راك ديجا verified!')], ephemeral: true });
      }
      await member.roles.add(VERIFIED_ROLE_ID, 'Verified via button');
      if (UNVERIFIED_ROLE_ID && member.roles.cache.has(UNVERIFIED_ROLE_ID))
        await member.roles.remove(UNVERIFIED_ROLE_ID, 'Verified').catch(()=>{});
      await interaction.reply({ embeds: [okE('✅ Verified!', `مرحبا بيك فـ **𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷**! دابا عندك access لجميع الرومات.`)], ephemeral: true });
    } catch (e) {
      console.error('[VERIFY] ❌', e);
      if (!interaction.replied && !interaction.deferred)
        interaction.reply({ embeds: [errE('❌ Error', e.message)], ephemeral: true }).catch(()=>{});
    }
    return;
  }

  /* --- Apply buttons --- */
  if (id === 'apply_minecraft' || id === 'apply_discord') {
    const userId = interaction.user.id;
    const isMc = id === 'apply_minecraft';
    const type = isMc ? 'Minecraft Staff' : 'Discord Staff';
    const questions = isMc ? APPLY_QUESTIONS_MC : APPLY_QUESTIONS_DISCORD;

    if (dmApplications.has(userId)) {
      return interaction.reply({
        embeds: [errE('❌ Already Applying', 'عندك application مفتوحة دابا. كمل الأسئلة فـ الخاص أو كتب `cancel` باش تلغيها.')],
        ephemeral: true
      });
    }

    try {
      const dm = await interaction.user.createDM();
      dmApplications.set(userId, { type, step: 0, answers: {}, questions, guildId: interaction.guild.id, startedAt: Date.now() });

      await interaction.reply({ embeds: [okE('📩 DM Sent', 'تحقق من الـ DMs ديالك باش تبدا الأسئلة!')], ephemeral: true });

      const first = questions[0];
      await dm.send({ embeds: [
        new EmbedBuilder()
          .setColor(C.info)
          .setTitle(`📝 Application — ${type}`)
          .setDescription(
            `مرحبا <@${userId}>! غادي نسولك **${questions.length}** أسئلة.\n` +
            `جاوب على كل سؤال بصدق.\n\n` +
            `اكتب \`cancel\` فـ أي وقت باش تلغي.\n\n` +
            `**Q1/${questions.length}:** ${first.q}`
          )
          .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Applications' })
          .setTimestamp()
      ] });
    } catch (e) {
      console.error('[APPLY] DM failed:', e.message);
      dmApplications.delete(userId);
      return interaction.reply({
        embeds: [errE('❌ Cannot DM you', 'خاصك تفتح الـ DMs من إعدادات السيرفر.\nSettings → Privacy & Safety → Allow DMs from server members.')],
        ephemeral: true
      });
    }
    return;
  }

  /* --- Accept --- */
  if (id.startsWith('apply_accept_')) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [errE('❌ Admin only.')], ephemeral: true });
    }
    const userId = id.replace('apply_accept_', '');
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (user) await user.send({ embeds: [okE('🎉 Congratulations!', `**تم قبولك فـ Staff 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷!**\n\nYour application has been **accepted**.\n\nWelcome to the team! 🎊`)] }).catch(()=>{});
      const data = applications.get(interaction.message.id);
      const e = okE('✅ Application Accepted').addFields(
        { name: 'Applicant', value: `<@${userId}> (\`${userId}\`)` },
        { name: 'Type', value: data?.type || 'Unknown' },
        { name: 'Reviewed by', value: `${interaction.user.tag}` });
      await interaction.reply({ embeds: [e] });
      try { await interaction.message.edit({ components: [] }); } catch {}
    } catch (e) {
      console.error('[ACCEPT] ❌', e);
      if (!interaction.replied && !interaction.deferred)
        interaction.reply({ embeds: [errE('❌ Error', e.message)], ephemeral: true }).catch(()=>{});
    }
    return;
  }

  /* --- Reject --- */
  if (id.startsWith('apply_reject_')) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [errE('❌ Admin only.')], ephemeral: true });
    }
    const userId = id.replace('apply_reject_', '');
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (user) await user.send({ embeds: [errE('❌ Application Result', `**للأسف، تم رفض طلبك.**\n\nYour application has been **rejected**. You can apply again later.`)] }).catch(()=>{});
      const e = errE('❌ Application Rejected').addFields(
        { name: 'Applicant', value: `<@${userId}> (\`${userId}\`)` },
        { name: 'Reviewed by', value: `${interaction.user.tag}` });
      await interaction.reply({ embeds: [e] });
      try { await interaction.message.edit({ components: [] }); } catch {}
    } catch (e) {
      console.error('[REJECT] ❌', e);
      if (!interaction.replied && !interaction.deferred)
        interaction.reply({ embeds: [errE('❌ Error', e.message)], ephemeral: true }).catch(()=>{});
    }
    return;
  }
});

/* ============================================================
 *             EVENT: VOICE STATE
 * ============================================================ */
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.id === client.user.id && newState.guild) {
    const saved = voiceConfig[newState.guild.id];
    if (!saved) return;
    if (newState.channelId && newState.channelId !== saved) {
      if (reconnectTimers.has(newState.guild.id)) return;
      const t = setTimeout(async () => {
        reconnectTimers.delete(newState.guild.id);
        try { await connectToVoice(newState.guild, saved); } catch (e) { console.error('[VOICE]', e.message); }
      }, 2000);
      reconnectTimers.set(newState.guild.id, t);
    }
    return;
  }

  // If a muted member leaves voice and rejoins → re-apply server mute
  const key = `${newState.guild?.id}:${newState.id}`;
  if (activeMutes[key] && newState.channelId && !newState.serverMute) {
    try { await newState.setMute(true, 'Restoring voice mute'); } catch {}
  }
});

/* ============================================================
 *             EVENT: LOGS
 * ============================================================ */
client.on('guildMemberUpdate', async (o, n) => {
  if (o.nickname !== n.nickname) {
    const exec = await auditExec(n.guild, AuditLogEvent.MemberUpdate, n.id);
    sendLog(n.guild, settings.logs || GENERAL_LOG_CHANNEL_ID,
      infoE('✏️ Nickname').addFields(
        { name: 'Member', value: n.user.tag, inline: true },
        { name: 'Before', value: o.nickname || '*none*', inline: true },
        { name: 'After', value: n.nickname || '*none*', inline: true },
        { name: 'By', value: exec ? exec.tag : '?' }));
  }
  const added = n.roles.cache.filter(r => !o.roles.cache.has(r.id));
  const removed = o.roles.cache.filter(r => !n.roles.cache.has(r.id));
  if (added.size || removed.size) {
    const exec = await auditExec(n.guild, AuditLogEvent.MemberRoleUpdate, n.id);
    const e = infoE('🏷️ Role Update').addFields({ name: 'Member', value: n.user.tag, inline: true });
    if (added.size) e.addFields({ name: 'Added', value: added.map(r => r.toString()).join(' ') });
    if (removed.size) e.addFields({ name: 'Removed', value: removed.map(r => r.toString()).join(' ') });
    if (exec) e.addFields({ name: 'By', value: exec.tag });
    sendLog(n.guild, ROLE_LOG_CHANNEL_ID || settings.logs, e);
  }
});
client.on('messageDelete', msg => {
  if (!msg.guild || msg.author?.bot) return;
  if (!msg.content && !msg.attachments.size) return;
  sendLog(msg.guild, settings.logs || GENERAL_LOG_CHANNEL_ID,
    errE('🗑️ Deleted').addFields({ name: 'Author', value: msg.author?.tag || '?', inline: true }, { name: 'Channel', value: `${msg.channel}`, inline: true }, { name: 'Content', value: (msg.content || '*[file]*').slice(0, 1000) }));
});
client.on('messageUpdate', (o, n) => {
  if (!n.guild || n.author?.bot || o.content === n.content) return;
  sendLog(n.guild, settings.logs || GENERAL_LOG_CHANNEL_ID,
    infoE('✏️ Edited').addFields({ name: 'Author', value: n.author.tag, inline: true }, { name: 'Before', value: (o.content || '').slice(0, 800) }, { name: 'After', value: (n.content || '').slice(0, 800) }));
});
client.on('guildMemberRemove', async member => {
  const exec = await auditExec(member.guild, AuditLogEvent.MemberKick, member.id);
  const e = errE('👋 Left').addFields({ name: 'User', value: `${member.user.tag}` });
  if (exec) e.addFields({ name: 'Kicked by', value: exec.tag });
  sendLog(member.guild, KICK_LOG_CHANNEL_ID || settings.logs || GENERAL_LOG_CHANNEL_ID, e);
});
client.on('guildBanAdd', async ban => {
  const exec = await auditExec(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  sendLog(ban.guild, BAN_LOG_CHANNEL_ID || settings.logs,
    errE('🔨 Banned').addFields({ name: 'User', value: ban.user.tag }, { name: 'By', value: exec ? exec.tag : '?' }, { name: 'Reason', value: ban.reason || 'None' }));
});
client.on('channelCreate', ch => { if (ch.guild) sendLog(ch.guild, settings.logs || GENERAL_LOG_CHANNEL_ID, okE('📁 Created', `${ch.name} (${ch.id})`)); });
client.on('channelDelete', ch => { if (ch.guild) sendLog(ch.guild, settings.logs || GENERAL_LOG_CHANNEL_ID, errE('🗑️ Deleted', `${ch.name} (${ch.id})`)); });

/* ============================================================
 *             EVENT: MESSAGE CREATE
 * ============================================================ */
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  /* ============ DM HANDLING ============ */
  if (!message.guild) {
    const userId = message.author.id;
    if (!dmApplications.has(userId)) return;

    const app = dmApplications.get(userId);
    const content = message.content.trim();

    if (content.toLowerCase() === 'cancel') {
      dmApplications.delete(userId);
      return message.reply({ embeds: [infoE('❌ Cancelled', 'تلغى الـ application ديالك.')] }).catch(()=>{});
    }

    const currentQ = app.questions[app.step];
    app.answers[currentQ.key] = content;
    app.step++;

    if (app.step >= app.questions.length) {
      dmApplications.delete(userId);
      await message.reply({ embeds: [okE('✅ Application Sent!', 'شكراً! تم إرسال طلبك.')] }).catch(()=>{});

      const guild = client.guilds.cache.get(app.guildId);
      const resultsCh = guild?.channels.cache.get(APPLY_RESULTS_CHANNEL_ID)
                     || await guild?.channels.fetch(APPLY_RESULTS_CHANNEL_ID).catch(()=>null);

      if (!resultsCh || !resultsCh.isTextBased()) return;

      const isMc = app.type === 'Minecraft Staff';
      const embed = new EmbedBuilder()
        .setColor(isMc ? C.ok : C.info)
        .setTitle(`📝 New Application — ${app.type}`)
        .setDescription(
          `**Applicant:** <@${userId}> (\`${userId}\`)\n` +
          `**Username:** \`${message.author.tag}\`\n` +
          `**Submitted:** <t:${Math.floor(Date.now()/1000)}:R>`
        )
        .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Use buttons below to Accept or Reject' })
        .setTimestamp();

      for (const q of app.questions) {
        const val = app.answers[q.key] || '(empty)';
        embed.addFields({ name: q.label, value: `\`\`\`${String(val).slice(0, 1000)}\`\`\`` });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`apply_accept_${userId}`).setLabel('Accept').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`apply_reject_${userId}`).setLabel('Reject').setEmoji('❌').setStyle(ButtonStyle.Danger)
      );

      const msg = await resultsCh.send({ content: `<@&${VERIFIED_ROLE_ID}>`, embeds: [embed], components: [row] }).catch(()=>null);
      if (msg) applications.set(msg.id, { userId, type: app.type, answers: app.answers });
      return;
    }

    const nextQ = app.questions[app.step];
    await message.reply({ embeds: [
      new EmbedBuilder()
        .setColor(C.info)
        .setTitle(`Q${app.step + 1}/${app.questions.length}`)
        .setDescription(nextQ.q)
        .setFooter({ text: `Type "cancel" to abort` })
        .setTimestamp()
    ] }).catch(()=>{});
    return;
  }

  /* ============ GUILD MESSAGE HANDLING ============ */
  if (afks.has(message.author.id) && !message.content.startsWith(PREFIX + 'afk')) {
    afks.delete(message.author.id);
    message.reply({ embeds: [okE('👋 Welcome back', 'AFK removed.')] }).then(x => setTimeout(() => x.delete().catch(()=>{}), 5000)).catch(()=>{});
  }
  for (const u of message.mentions.users.values()) {
    if (afks.has(u.id)) message.reply({ embeds: [infoE('💤 AFK', `${u.tag} is AFK: ${afks.get(u.id)}`)] }).catch(()=>{});
  }

  const usr = eco(message.author.id); usr.msgs += 1;

  if (settings.antispam && !has(message.member, PermissionFlagsBits.ManageMessages)) {
    const now = Date.now();
    const arr = (spamMap.get(message.author.id) || []).filter(t => now - t < 5000);
    arr.push(now); spamMap.set(message.author.id, arr);
    if (arr.length >= 6) {
      try { await message.member.timeout(60000, 'Anti-spam'); } catch {}
      spamMap.delete(message.author.id);
      message.channel.send({ embeds: [errE('🛡️ Anti-spam', `${message.author} timed out 1m.`)] }).catch(()=>{});
    }
  }
  if (settings.antiinvite && !has(message.member, PermissionFlagsBits.ManageMessages) && /(discord\.gg|discord\.com\/invite)\//i.test(message.content)) {
    message.delete().catch(()=>{});
  }
  if (settings.antimention && !has(message.member, PermissionFlagsBits.ManageMessages) && message.mentions.users.size >= 5) {
    message.delete().catch(()=>{});
  }
  if (settings.automod && !has(message.member, PermissionFlagsBits.ManageMessages)) {
    const bad = ['fuck','shit','bitch','كلب','زبي','قحبة'];
    if (bad.some(w => message.content.toLowerCase().includes(w))) message.delete().catch(()=>{});
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const name = args.shift().toLowerCase();
  const cmd = commands[name];
  if (!cmd) return;
  try { await cmd.run(message, args, client); }
  catch (e) {
    console.error(`[CMD ERR] ${name}:`, e);
    message.reply({ embeds: [errE('❌ Error', (e.message || 'Unknown').slice(0, 500))] }).catch(()=>{});
  }
});

/* ============================================================
 *             GLOBAL ERROR HANDLING
 * ============================================================ */
process.on('unhandledRejection', e => console.error('[unhandledRejection]', e));
process.on('uncaughtException', e => console.error('[uncaughtException]', e));

/* ============================================================
 *                     LOGIN
 * ============================================================ */
client.login(TOKEN);
