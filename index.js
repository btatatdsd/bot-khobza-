/* ============================================================
 *  𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 Discord Bot — Full Version
 *  - Anti bot-invite-link protection (with !link whitelist)
 *  - Auto-fetches role names from Discord (no hardcoded names)
 * ============================================================ */
require('dotenv').config();

const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  PermissionFlagsBits, ChannelType, ActivityType, AuditLogEvent,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Events,
  ModalBuilder, TextInputBuilder, TextInputStyle
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
const TIMEOUT_LOG_CHANNEL_ID   = process.env.TIMEOUT_LOG_CHANNEL_ID || '1558158765453484182';
const NICKNAME_LOG_CHANNEL_ID  = process.env.NICKNAME_LOG_CHANNEL_ID || '1557761519045840956';
const KICK_LOG_CHANNEL_ID      = process.env.KICK_LOG_CHANNEL_ID || '';
const GENERAL_LOG_CHANNEL_ID   = process.env.GENERAL_LOG_CHANNEL_ID || '';
const MC_SERVER_IP             = process.env.MC_SERVER_IP || 'play.khobzasmp.com';
const MC_STORE_URL             = process.env.MC_STORE_URL || 'https://store.khobzasmp.com';
const DATA_DIR                 = process.env.DATA_DIR || __dirname;
const VOICE_CFG_FILE           = path.join(DATA_DIR, 'voice-config.json');
const MUTE_CFG_FILE            = path.join(DATA_DIR, 'mute-config.json');
const GIVEAWAY_CFG_FILE        = path.join(DATA_DIR, 'giveaway-config.json');
const BOTWL_CFG_FILE           = path.join(DATA_DIR, 'bot-whitelist.json');
const LINKWL_CFG_FILE          = path.join(DATA_DIR, 'link-whitelist.json');
const RECONNECT_DELAY          = 5000;
const VERIFY_CHANNEL_ID        = process.env.VERIFY_CHANNEL_ID || '1558503393226530947';
const VERIFY_IMAGE             = process.env.VERIFY_IMAGE || '';
const UNVERIFIED_ROLE_ID       = process.env.UNVERIFIED_ROLE_ID || '1557761141575262298';
const VERIFIED_ROLE_ID         = process.env.VERIFIED_ROLE_ID || '1557761111242051704';
const APPLY_STAFF_CHANNEL_ID   = process.env.APPLY_STAFF_CHANNEL_ID || '1557761363617521724';
const APPLY_RESULTS_CHANNEL_ID = process.env.APPLY_RESULTS_CHANNEL_ID || '1558583636025147505';

const HELPER_ROLE_ID  = process.env.HELPER_ROLE_ID  || '1557761089163231432';
const MOD_ROLE_ID     = process.env.MOD_ROLE_ID     || '1557761087380652043';
const ADMIN_ROLE_ID   = process.env.ADMIN_ROLE_ID   || '1557761086147666011';
const SENIOR_ROLE_ID  = process.env.SENIOR_ROLE_ID  || '1557761084746633216';
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID || '1557761083589132489';
const HEAD_ROLE_ID    = process.env.HEAD_ROLE_ID    || '1557761065545240587';
const COOWNER_ROLE_ID = process.env.COOWNER_ROLE_ID || '1557761063452156034';
const OWNER_ROLE_ID   = process.env.OWNER_ROLE_ID   || '1557761062013763655';

const BOT_WHITELIST_CODE  = process.env.BOT_WHITELIST_CODE  || '1235';
const LINK_WHITELIST_CODE = process.env.LINK_WHITELIST_CODE || '1235';

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

const C = { ok: 0x57f287, err: 0xed4245, info: 0x5865f2, warn: 0xfee75c, giveaway: 0xeb459e };

/* ===================== APPLY QUESTIONS ===================== */
const APPLY_QUESTIONS = [
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
const settings = { antispam: false, antiinvite: false, antiraid: false, antimention: false, automod: false };
const spamMap  = new Map();
const joinLog  = [];
const applications   = new Map();
const dmApplications = new Map();

/* ============================================================
 *  STAFF TIER SYSTEM (names fetched live from Discord)
 * ============================================================ */
const STAFF_ROLES = [
  { id: HELPER_ROLE_ID,  rank: 1, maxMute: 10,  minMute: 5, canMove: false, canTimeout: false, canNickname: false, canBan: false, canKick: false, canGiveaway: false, label: 'Helper' },
  { id: MOD_ROLE_ID,     rank: 2, maxMute: 10,  minMute: 5, canMove: true,  canTimeout: false, canNickname: false, canBan: false, canKick: false, canGiveaway: true,  label: 'Moderator' },
  { id: ADMIN_ROLE_ID,   rank: 3, maxMute: 30,  minMute: 5, canMove: true,  canTimeout: false, canNickname: false, canBan: false, canKick: true,  canGiveaway: true,  label: 'Admin' },
  { id: SENIOR_ROLE_ID,  rank: 4, maxMute: 60,  minMute: 5, canMove: true,  canTimeout: false, canNickname: false, canBan: false, canKick: true,  canGiveaway: true,  label: 'Senior' },
  { id: MANAGER_ROLE_ID, rank: 5, maxMute: -1,  minMute: 5, canMove: true,  canTimeout: false, canNickname: false, canBan: false, canKick: true,  canGiveaway: true,  label: 'Manager' },
  { id: HEAD_ROLE_ID,    rank: 6, maxMute: -1,  minMute: 5, canMove: true,  canTimeout: true,  canNickname: false, canBan: false, canKick: true,  canGiveaway: true,  label: 'Head Admin' },
  { id: COOWNER_ROLE_ID, rank: 7, maxMute: -1,  minMute: 5, canMove: true,  canTimeout: true,  canNickname: true,  canBan: false, canKick: true,  canGiveaway: true,  label: 'Co-Owner' },
  { id: OWNER_ROLE_ID,   rank: 8, maxMute: -1,  minMute: 5, canMove: true,  canTimeout: true,  canNickname: true,  canBan: true,  canKick: true,  canGiveaway: true,  label: 'Owner' }
];

function getRoleName(guild, staffData) {
  if (!guild || !staffData) return staffData?.label || 'Unknown';
  const role = guild.roles.cache.get(staffData.id);
  return role ? role.name : staffData.label;
}

function getStaffTier(member) {
  if (!member) return null;
  const guild = member.guild;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    const top = STAFF_ROLES[STAFF_ROLES.length - 1];
    return { ...top, label: getRoleName(guild, top), isAdminPerm: true };
  }
  let best = null;
  for (const r of STAFF_ROLES) {
    if (member.roles.cache.has(r.id)) {
      if (!best || r.rank > best.rank) best = r;
    }
  }
  if (!best) return null;
  return { ...best, label: getRoleName(guild, best) };
}

/* ===================== BOT WHITELIST STORAGE ===================== */
function loadJson(file, fallback) {
  try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error(`[LOAD ${path.basename(file)}]:`, e.message); }
  return fallback;
}
function saveJson(file, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) { console.error(`[SAVE ${path.basename(file)}]:`, e.message); }
}

const botWhitelist = loadJson(BOTWL_CFG_FILE, { bots: {} });
if (!botWhitelist.bots) botWhitelist.bots = {};
const isBotWhitelisted = id => !!botWhitelist.bots[id];

/* ===================== LINK WHITELIST STORAGE ===================== */
/*
 * link-whitelist.json:
 * {
 *   "users": {
 *     "<userId>": { addedBy, addedAt }
 *   }
 * }
 */
const linkWhitelist = loadJson(LINKWL_CFG_FILE, { users: {} });
if (!linkWhitelist.users) linkWhitelist.users = {};
const isLinkWhitelisted = id => !!linkWhitelist.users[id];

/* ============================================================
 *  BOT INVITE LINK DETECTION
 * ============================================================ */
const BOT_INVITE_PATTERNS = [
  /discord(?:app)?\.com\/(?:oauth2|api\/oauth2)\/authorize\?[^\s]*?(?:scope=bot|client_id=\d+)/i,
  /discord(?:app)?\.com\/oauth2\/authorize\?[^\s]*?permissions=\d+/i,
  /top\.gg\/bot\/\d+/i,
  /discord\.me\/oauth2\/authorize\?[^\s]*?scope=bot/i,
  /discordbotlist\.com\/bot\/\d+/i,
  /discord\.com\/api\/oauth2\/authorize/i
];

function containsBotInviteLink(content) {
  if (!content) return null;
  for (const rx of BOT_INVITE_PATTERNS) {
    const m = content.match(rx);
    if (m) return m[0];
  }
  return null;
}

/* ============================================================
 *  VOICE MUTE STORAGE
 * ============================================================ */
const activeMutes = loadJson(MUTE_CFG_FILE, {});
const muteTimers  = new Map();

function scheduleUnmute(key) {
  if (muteTimers.has(key)) { clearTimeout(muteTimers.get(key)); muteTimers.delete(key); }
  const data = activeMutes[key];
  if (!data) return;
  if (data.permanent) return;
  const delay = data.unmuteAt - Date.now();
  if (delay <= 0) { doUnmute(key).catch(()=>{}); return; }
  muteTimers.set(key, setTimeout(() => doUnmute(key).catch(()=>{}), delay));
}
async function doUnmute(key) {
  const data = activeMutes[key];
  if (!data) return;
  delete activeMutes[key];
  saveJson(MUTE_CFG_FILE, activeMutes);
  if (muteTimers.has(key)) { clearTimeout(muteTimers.get(key)); muteTimers.delete(key); }
  try {
    const guild = client.guilds.cache.get(data.guildId);
    if (!guild) return;
    const member = await guild.members.fetch(data.userId).catch(()=>null);
    if (!member) return;
    if (member.voice?.serverMute) await member.voice.setMute(false, 'Auto-unmute').catch(()=>{});
    sendLog(guild, MUTE_LOG_CHANNEL_ID, okE('🔊 Auto Unmuted').addFields(
      { name: 'User', value: `<@${data.userId}>`, inline: true },
      { name: 'Reason', value: data.reason || '—', inline: true }));
  } catch (e) { console.error('[MUTE] auto-unmute:', e.message); }
}
async function restoreMutes() {
  for (const key of Object.keys(activeMutes)) {
    const data = activeMutes[key];
    try {
      const guild = client.guilds.cache.get(data.guildId);
      if (!guild) continue;
      const member = await guild.members.fetch(data.userId).catch(()=>null);
      if (member && member.voice?.channel && !member.voice.serverMute)
        await member.voice.setMute(true, 'Restoring mute').catch(()=>{});
      scheduleUnmute(key);
    } catch (e) { console.error('[MUTE] restore:', e.message); }
  }
}

/* ===================== GIVEAWAY STORAGE ===================== */
const activeGiveaways = loadJson(GIVEAWAY_CFG_FILE, {});
const giveawayTimers  = new Map();

function buildGiveawayEmbed(gw, ended = false) {
  const timeLeft = Math.max(0, gw.endsAt - Date.now());
  const totalSec = Math.floor(timeLeft / 1000);
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
  const e = new EmbedBuilder()
    .setColor(ended ? C.err : C.giveaway)
    .setTitle(ended ? '🎉 GIVEAWAY ENDED' : '🎉 GIVEAWAY!')
    .setDescription(
      `## ${gw.prize}\n\n🎁 **Winners:** ${gw.winners}\n👥 **Entries:** ${gw.entries.length}\n👑 **Hosted by:** <@${gw.hostId}>\n\n` +
      (ended
        ? `**Ended** <t:${Math.floor(gw.endsAt/1000)}:R>\n` +
          (gw.winnerIds.length ? `**Winners:** ${gw.winnerIds.map(id=>`<@${id}>`).join(', ')}` : `**Winners:** ❌ No valid entries`)
        : `⏳ **Ends:** <t:${Math.floor(gw.endsAt/1000)}:R>\n**Time left:** ${h>0?`${h}h `:''}${m}m ${s}s`))
    .setFooter({ text: ended ? 'Giveaway finished' : 'React with 🎉 to enter!' })
    .setTimestamp();
  if (gw.imageURL) e.setImage(gw.imageURL);
  return e;
}

async function endGiveaway(messageId) {
  const gw = activeGiveaways[messageId];
  if (!gw || gw.ended) return;
  gw.ended = true;
  saveJson(GIVEAWAY_CFG_FILE, activeGiveaways);
  if (giveawayTimers.has(messageId)) { clearTimeout(giveawayTimers.get(messageId)); giveawayTimers.delete(messageId); }
  const guild = client.guilds.cache.get(gw.guildId); if (!guild) return;
  const channel = guild.channels.cache.get(gw.channelId); if (!channel) return;
  const msg = await channel.messages.fetch(messageId).catch(()=>null); if (!msg) return;

  const entries = [...new Set(gw.entries)].filter(id => { const m = guild.members.cache.get(id); return m && !m.user.bot; });
  const winners = []; const pool = [...entries];
  while (winners.length < gw.winners && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool[idx]); pool.splice(idx, 1);
  }
  gw.winnerIds = winners;
  saveJson(GIVEAWAY_CFG_FILE, activeGiveaways);

  try {
    await msg.edit({
      content: winners.length ? `🎉 Congratulations ${winners.map(id=>`<@${id}>`).join(', ')}!` : '❌ No valid entries.',
      embeds: [buildGiveawayEmbed(gw, true)], components: []
    });
  } catch (e) { console.error('[GIVEAWAY] edit:', e.message); }

  if (winners.length) channel.send({ content: `🎉 ${winners.map(id=>`<@${id}>`).join(', ')} won **${gw.prize}**!` }).catch(()=>{});
  else channel.send({ content: `❌ No valid entries for **${gw.prize}**.` }).catch(()=>{});
}
async function restoreGiveaways() {
  for (const [messageId, gw] of Object.entries(activeGiveaways)) {
    if (gw.ended) continue;
    const delay = gw.endsAt - Date.now();
    if (delay <= 0) endGiveaway(messageId).catch(()=>{});
    else giveawayTimers.set(messageId, setTimeout(() => endGiveaway(messageId).catch(()=>{}), delay));
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
function fmtMinutes(mins) {
  if (mins === -1) return 'Permanent';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
function parseDuration(str) {
  if (!str) return null;
  const m = String(str).match(/^(\d+)(s|m|h|d|w)$/i);
  if (!m) return null;
  return parseInt(m[1]) * ({ s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 }[m[2].toLowerCase()]);
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
async function resolveMemberById(guild, str) {
  if (!str) return null;
  const id = String(str).replace(/[<@!>]/g, '').trim();
  if (!/^\d{17,20}$/.test(id)) return null;
  return guild.members.fetch(id).catch(() => null);
}
function eco(id) {
  if (!economy.has(id)) economy.set(id, { balance: 100, daily: 0, rep: 0, msgs: 0 });
  return economy.get(id);
}

/* ===================== VOICE 24/7 ===================== */
const voiceConfig = loadJson(VOICE_CFG_FILE, {});
const reconnectTimers = new Map();

async function connectToVoice(guild, channelId) {
  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(()=>null);
  if (!channel) throw new Error(`Channel not found: ${channelId}`);
  if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)
    throw new Error('Target is not a voice channel.');
  const me = guild.members.me || (await guild.members.fetch(client.user.id));
  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionFlagsBits.Connect)) throw new Error('Missing Connect.');
  if (!perms?.has(PermissionFlagsBits.Speak))   throw new Error('Missing Speak.');
  const existing = getVoiceConnection(guild.id);
  if (existing) { try { existing.destroy(); } catch {} }
  const connection = joinVoiceChannel({
    channelId: channel.id, guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator, selfDeaf: true, selfMute: true
  });
  connection.on(VoiceConnectionStatus.Ready, () => console.log(`[VOICE] Ready in ${guild.name}`));
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try { await Promise.race([entersState(connection, VoiceConnectionStatus.Signalling, 5000), entersState(connection, VoiceConnectionStatus.Connecting, 5000)]); }
    catch {
      try { connection.destroy(); } catch {}
      if (reconnectTimers.has(guild.id)) return;
      reconnectTimers.set(guild.id, setTimeout(async () => {
        reconnectTimers.delete(guild.id);
        const saved = voiceConfig[guild.id]; if (!saved) return;
        try { await connectToVoice(guild, saved); } catch (e) { console.error('[VOICE] reconnect:', e.message); }
      }, RECONNECT_DELAY));
    }
  });
  return connection;
}
async function restoreAllVoiceConnections() {
  for (const [guildId, channelId] of Object.entries(voiceConfig)) {
    const guild = client.guilds.cache.get(guildId); if (!guild) continue;
    try { await connectToVoice(guild, channelId); } catch (e) { console.error(`[VOICE] restore:`, e.message); }
  }
}

/* ===================== WELCOME ===================== */
async function sendWelcome(guild, member) {
  if (!WELCOME_CHANNEL_ID) return { ok: false, reason: 'ID empty' };
  let ch = guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!ch) ch = await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(()=>null);
  if (!ch) return { ok: false, reason: 'Channel not found' };
  if (!ch.isTextBased()) return { ok: false, reason: 'Not text-based' };
  const perms = ch.permissionsFor(guild.members.me);
  if (!perms?.has(PermissionFlagsBits.ViewChannel) || !perms?.has(PermissionFlagsBits.SendMessages))
    return { ok: false, reason: 'Missing permissions' };
  const embed = new EmbedBuilder()
    .setColor(C.ok).setTitle('🎉 Welcome!')
    .setDescription(`Welcome ${member} to **𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷**! 🍞\nمرحبا بيك فالسيرفر!`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Member #${guild.memberCount}` })
    .setTimestamp();
  if (WELCOME_IMAGE) embed.setImage(WELCOME_IMAGE);
  try { await ch.send({ content: `${member}`, embeds: [embed] }); return { ok: true, channel: ch }; }
  catch (err) { return { ok: false, reason: err.message }; }
}

/* ============================================================
 *                       COMMANDS
 * ============================================================ */
const commands = {};

/* ============================================================
 *  ⭐ !link — Manage link-whitelist (who can post bot invites)
 *  Usage:
 *    !link add <@user|userID> <code>   → whitelist a user
 *    !link remove <@user|userID>       → unwhitelist
 *    !link list                        → show whitelisted users
 * ============================================================ */
commands.link = {
  cat: 'Security',
  desc: 'Manage link-whitelist (who can post bot invite links)',
  usage: 'link <add|remove|list> [@user|userID] [code]',
  async run(m, a) {
    const tier = getStaffTier(m.member);
    if (!tier || tier.rank < 3) return m.reply({ embeds: [errE('❌ No permission (Admin+).')] });

    const sub = (a[0] || '').toLowerCase();

    /* --- !link add <@user|id> <code> --- */
    if (sub === 'add') {
      if (!a[1]) return m.reply({ embeds: [errE('Usage: `!link add <@user|userID> <code>`')] });
      const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[1]);
      const targetUser = targetMember?.user || await client.users.fetch(String(a[1]).replace(/[<@!>]/g, '')).catch(()=>null);
      if (!targetUser) return m.reply({ embeds: [errE('❌ User not found.')] });
      if (targetUser.bot) return m.reply({ embeds: [errE('❌ Bots can\'t be whitelisted here. Use `!wyh` instead.')] });

      const code = (a[2] || '').trim();
      if (!code) return m.reply({ embeds: [errE('❌ Provide the code.', `Usage: \`!link add ${targetUser.id} ${LINK_WHITELIST_CODE}\``)] });
      if (code !== LINK_WHITELIST_CODE) return m.reply({ embeds: [errE('❌ Invalid code.')] });

      if (isLinkWhitelisted(targetUser.id)) return m.reply({ embeds: [infoE('ℹ️ Already whitelisted', `${targetUser.tag} ديجا فـ الـ whitelist.`)] });

      linkWhitelist.users[targetUser.id] = {
        addedBy: m.author.tag, addedById: m.author.id, addedAt: Date.now()
      };
      saveJson(LINKWL_CFG_FILE, linkWhitelist);

      const e = okE('✅ User Added to Link-Whitelist').addFields(
        { name: 'User', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
        { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true }
      );
      m.reply({ embeds: [e] });
      sendLog(m.guild, GENERAL_LOG_CHANNEL_ID || BAN_LOG_CHANNEL_ID, e);
      return;
    }

    /* --- !link remove <@user|id> --- */
    if (sub === 'remove' || sub === 'rm') {
      if (!a[1]) return m.reply({ embeds: [errE('Usage: `!link remove <@user|userID>`')] });
      const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[1]);
      const targetUser = targetMember?.user || await client.users.fetch(String(a[1]).replace(/[<@!>]/g, '')).catch(()=>null);
      if (!targetUser) return m.reply({ embeds: [errE('❌ User not found.')] });
      if (!isLinkWhitelisted(targetUser.id)) return m.reply({ embeds: [errE('❌ هاد العضو ماشي فـ الـ whitelist.')] });

      delete linkWhitelist.users[targetUser.id];
      saveJson(LINKWL_CFG_FILE, linkWhitelist);

      const e = okE('🗑️ User Removed from Link-Whitelist').addFields(
        { name: 'User', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
        { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true }
      );
      m.reply({ embeds: [e] });
      sendLog(m.guild, GENERAL_LOG_CHANNEL_ID || BAN_LOG_CHANNEL_ID, e);
      return;
    }

    /* --- !link list --- */
    if (sub === 'list') {
      const entries = Object.entries(linkWhitelist.users);
      if (!entries.length) return m.reply({ embeds: [infoE('🔗 Link-Whitelist', 'ما كاين حتى واحد فـ الـ whitelist.')] });
      const list = entries.map(([id, data], i) =>
        `**#${i+1}** <@${id}> (\`${id}\`)\n  *Added by ${data.addedBy} • <t:${Math.floor(data.addedAt/1000)}:R>*`
      ).join('\n');
      m.reply({ embeds: [infoE(`🔗 Link-Whitelisted Users (${entries.length})`).setDescription(list.slice(0, 4000))] });
      return;
    }

    /* --- Help --- */
    m.reply({ embeds: [infoE('🔗 Link Whitelist', 
      '**Usage:**\n' +
      '`!link add <@user|userID> <code>` — Whitelist a user (they can post bot links)\n' +
      '`!link remove <@user|userID>` — Remove from whitelist\n' +
      '`!link list` — Show all whitelisted users\n\n' +
      '**Note:** By default, ANYONE (including Owner) who posts a bot invite link gets it deleted + receives a warning.\n' +
      'Only users in this whitelist can bypass it.')] });
  }
};

/* ============================================================
 *  !wyh — Whitelist a BOT (so it doesn't get auto-banned)
 * ============================================================ */
commands.wyh = { cat: 'Security', desc: 'Whitelist a bot', usage: 'wyh <botUserId>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [errE('❌ No permission (Admin+).')] });
  const targetId = (a[0] || '').replace(/[<@!>]/g, '').trim();
  if (!targetId || !/^\d{17,20}$/.test(targetId)) return m.reply({ embeds: [errE('Usage: `!wyh <botUserId>`')] });
  const user = await client.users.fetch(targetId).catch(()=>null);
  if (!user) return m.reply({ embeds: [errE('❌ User not found.')] });
  if (!user.bot) return m.reply({ embeds: [errE('❌ This user is not a bot.')] });
  const modal = new ModalBuilder().setCustomId(`wyh_modal_${targetId}`).setTitle('Bot Whitelist — Enter Code');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('wyh_code').setLabel('Security Code').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(4).setMaxLength(20)
  ));
  return m.showModal(modal).catch(e => console.error('[WYH] modal:', e));
}};

commands.unwyh = { cat: 'Security', desc: 'Remove bot from whitelist', usage: 'unwyh <botUserId>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [errE('❌ No permission.')] });
  const targetId = (a[0] || '').replace(/[<@!>]/g, '').trim();
  if (!targetId || !/^\d{17,20}$/.test(targetId)) return m.reply({ embeds: [errE('Usage: `!unwyh <botUserId>`')] });
  if (!isBotWhitelisted(targetId)) return m.reply({ embeds: [errE('❌ Not whitelisted.')] });
  delete botWhitelist.bots[targetId];
  saveJson(BOTWL_CFG_FILE, botWhitelist);
  m.reply({ embeds: [okE('🗑️ Removed', `\`${targetId}\``)] });
}};

commands.wyhlist = { cat: 'Security', desc: 'List whitelisted bots', async run(m) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 2) return m.reply({ embeds: [errE('❌ No permission.')] });
  const entries = Object.entries(botWhitelist.bots);
  if (!entries.length) return m.reply({ embeds: [infoE('🤖 Bot Whitelist', 'Empty.')] });
  const list = entries.map(([id, data], i) => `**#${i+1}** <@${id}> (\`${id}\`)\n  *Added by ${data.addedBy}*`).join('\n');
  m.reply({ embeds: [infoE(`🤖 Whitelisted Bots (${entries.length})`).setDescription(list.slice(0, 4000))] });
}};

/* ---------- VERIFY ---------- */
commands.verifypanel = { cat: 'Verify', desc: 'Send verification panel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const ch = m.guild.channels.cache.get(VERIFY_CHANNEL_ID) || await m.guild.channels.fetch(VERIFY_CHANNEL_ID).catch(()=>null);
  if (!ch || !ch.isTextBased()) return m.reply({ embeds: [errE('Channel not found.')] });
  const embed = new EmbedBuilder()
    .setColor(0x2b2d31).setTitle('✅ Verification')
    .setDescription('**Welcome to 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷!**\n\nClick the button below to verify and get access to all channels.')
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Verification' }).setTimestamp();
  if (VERIFY_IMAGE) embed.setImage(VERIFY_IMAGE);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_button').setLabel('Verify').setEmoji('✅').setStyle(ButtonStyle.Success)
  );
  await ch.send({ embeds: [embed], components: [row] });
  m.reply({ embeds: [okE('✅ Panel sent', `${ch}`)] }).catch(()=>{});
}};

/* ---------- APPLY PANEL ---------- */
commands.applypanel = { cat: 'Verify', desc: 'Send apply panel', usage: 'applypanel [imageURL]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const ch = m.guild.channels.cache.get(APPLY_STAFF_CHANNEL_ID) || await m.guild.channels.fetch(APPLY_STAFF_CHANNEL_ID).catch(()=>null);
  if (!ch || !ch.isTextBased()) return m.reply({ embeds: [errE('Channel not found.')] });

  let imageURL = (a[0] || '').trim();
  if (!imageURL && m.attachments.size) imageURL = m.attachments.first().url;
  if (!imageURL && m.reference?.messageId) {
    const replied = await m.channel.messages.fetch(m.reference.messageId).catch(()=>null);
    if (replied?.attachments.size) imageURL = replied.attachments.first().url;
  }
  if (!imageURL) {
    await m.reply({ embeds: [infoE('🖼️ Send the image URL', 'Type `cancel` to abort. (60s)')] });
    const f = x => x.author.id === m.author.id && x.channel.id === m.channel.id;
    try {
      const c = await m.channel.awaitMessages({ filter: f, max: 1, time: 60000, errors: ['time'] });
      const replyMsg = c.first();
      if (replyMsg.content.toLowerCase().trim() === 'cancel') return m.reply({ embeds: [infoE('Cancelled.')] });
      if (replyMsg.attachments.size) imageURL = replyMsg.attachments.first().url;
      else { const u = replyMsg.content.match(/https?:\/\/\S+/i); if (u) imageURL = u[0]; }
      replyMsg.delete().catch(()=>{});
    } catch { return m.reply({ embeds: [errE('⏰ Timed out.')] }); }
  }
  imageURL = imageURL.trim().replace(/[>),]+$/, '');
  if (!/^https?:\/\//i.test(imageURL)) return m.reply({ embeds: [errE('Invalid URL.')] });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2).setTitle('📝 Apply for Staff — 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷')
    .setDescription('**Want to become staff?**\n\n🎮 **Apply Staff Minecraft**\n💬 **Apply Staff Discord**\n\n**How it works:**\n1. Click a button below.\n2. The bot will DM you with questions.\n3. Answer all questions in DM.')
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Applications' }).setTimestamp();
  if (imageURL) embed.setImage(imageURL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_minecraft').setLabel('Apply Staff Minecraft').setEmoji('🎮').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('apply_discord').setLabel('Apply Staff Discord').setEmoji('💬').setStyle(ButtonStyle.Primary)
  );
  try { await ch.send({ embeds: [embed], components: [row] }); m.reply({ embeds: [okE('✅ Panel sent', `${ch}`)] }).catch(()=>{}); }
  catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};

/* ---------- STAFF INFO ---------- */
function buildStaffInfoEmbeds(guild) {
  const embeds = [];
  const header = new EmbedBuilder()
    .setColor(0x5865f2).setTitle('🎖️ Staff Roles — 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷')
    .setDescription('All staff ranks sorted from #1 (lowest) to #8 (highest).')
    .setFooter({ text: `Total: ${STAFF_ROLES.length} roles` }).setTimestamp();
  embeds.push(header);

  const details = new EmbedBuilder().setColor(0x2b2d31).setTitle('📋 Roles Details');
  for (const r of STAFF_ROLES) {
    const realRole = guild.roles.cache.get(r.id);
    const displayName = realRole ? realRole.name : `${r.label} (not found)`;
    const maxMuteStr = r.maxMute === -1 ? '`Permanent`' : `\`${r.maxMute}m\``;
    const value =
      `**ID:** \`${r.id}\` • **Rank:** \`#${r.rank}\`\n` +
      `**Max Mute:** ${maxMuteStr} • **Min:** \`${r.minMute}m\`\n` +
      `**Move:** ${r.canMove?'✅':'❌'} • **Timeout:** ${r.canTimeout?'✅':'❌'} • **Nick:** ${r.canNickname?'✅':'❌'}\n` +
      `**Kick:** ${r.canKick?'✅':'❌'} • **Ban:** ${r.canBan?'✅':'❌'} • **Giveaway:** ${r.canGiveaway?'✅':'❌'}`;
    details.addFields({ name: `#${r.rank} — ${displayName}`, value, inline: false });
  }
  embeds.push(details);

  const logs = new EmbedBuilder().setColor(0x57f287).setTitle('📜 Log Channels')
    .addFields(
      { name: 'Ban',      value: BAN_LOG_CHANNEL_ID ? `<#${BAN_LOG_CHANNEL_ID}>` : '—', inline: true },
      { name: 'Mute',     value: MUTE_LOG_CHANNEL_ID ? `<#${MUTE_LOG_CHANNEL_ID}>` : '—', inline: true },
      { name: 'Move',     value: MOVE_LOG_CHANNEL_ID ? `<#${MOVE_LOG_CHANNEL_ID}>` : '—', inline: true },
      { name: 'Timeout',  value: TIMEOUT_LOG_CHANNEL_ID ? `<#${TIMEOUT_LOG_CHANNEL_ID}>` : '—', inline: true },
      { name: 'Nickname', value: NICKNAME_LOG_CHANNEL_ID ? `<#${NICKNAME_LOG_CHANNEL_ID}>` : '—', inline: true },
      { name: 'Role',     value: ROLE_LOG_CHANNEL_ID ? `<#${ROLE_LOG_CHANNEL_ID}>` : '—', inline: true }
    ).setTimestamp();
  embeds.push(logs);
  return embeds;
}

commands.staffinfo = { cat: 'Utility', desc: 'Show all staff roles', async run(m) { await m.reply({ embeds: buildStaffInfoEmbeds(m.guild) }); }};
commands.staff = commands.staffinfo;
commands['roles-info'] = commands.staffinfo;

commands.roleinfo = { cat: 'Utility', desc: 'Role info', usage: 'roleinfo <@role|roleID|all>', async run(m, a) {
  const arg = (a[0] || '').toLowerCase();
  if (arg === 'all') return m.reply({ embeds: buildStaffInfoEmbeds(m.guild) });
  let r = m.mentions.roles.first();
  if (!r && a[0] && /^\d{17,20}$/.test(a[0].replace(/[<@&>]/g, '')))
    r = m.guild.roles.cache.get(a[0].replace(/[<@&>]/g, '')) || await m.guild.roles.fetch(a[0].replace(/[<@&>]/g, '')).catch(()=>null);
  if (!r) r = m.guild.roles.cache.find(x => x.name.toLowerCase() === arg);
  if (!r) return m.reply({ embeds: [errE('Role not found.')] });
  const staffData = STAFF_ROLES.find(s => s.id === r.id);
  const e = infoE(`🏷️ ${r.name}`).addFields(
    { name: 'ID', value: `\`${r.id}\``, inline: true },
    { name: 'Color', value: r.hexColor, inline: true },
    { name: 'Members', value: `${r.members.size}`, inline: true },
    { name: 'Position', value: `${r.position}`, inline: true }
  );
  if (staffData) e.addFields(
    { name: '🎖️ Staff Rank', value: `#${staffData.rank} — ${r.name}`, inline: false },
    { name: '🔇 Max Mute', value: fmtMinutes(staffData.maxMute), inline: true },
    { name: '➡️ Move', value: staffData.canMove?'✅':'❌', inline: true },
    { name: '⏳ Timeout', value: staffData.canTimeout?'✅':'❌', inline: true },
    { name: '✏️ Nick', value: staffData.canNickname?'✅':'❌', inline: true },
    { name: '👢 Kick', value: staffData.canKick?'✅':'❌', inline: true },
    { name: '🔨 Ban', value: staffData.canBan?'✅':'❌', inline: true },
    { name: '🎁 Giveaway', value: staffData.canGiveaway?'✅':'❌', inline: true }
  );
  m.reply({ embeds: [e] });
}};

/* ---------- DIAGNOSTIC ---------- */
commands.intents = { cat: 'Utility', desc: 'Check intents', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  m.reply({ embeds: [infoE('🔍 Intents').setDescription(
    `**Guilds**: ${client.guilds.cache.size}\n**Members**: ${m.guild.memberCount}\n**Cached**: ${m.guild.members.cache.size}\n\n**Members Intent**: ${m.guild.members.cache.size > 1 ? '✅ ON' : '❌ OFF'}`
  )] });
}};
commands.mytier = { cat: 'Utility', desc: 'Your staff tier', async run(m) {
  const t = getStaffTier(m.member);
  if (!t) return m.reply({ embeds: [errE('❌ ما عندكش رتبة staff.')] });
  m.reply({ embeds: [infoE('🎖️ Staff Tier').addFields(
    { name: 'Rank', value: `#${t.rank} — ${t.label}`, inline: true },
    { name: 'Max Mute', value: fmtMinutes(t.maxMute), inline: true },
    { name: 'Min Mute', value: `${t.minMute} min`, inline: true },
    { name: 'Move', value: t.canMove?'✅':'❌', inline: true },
    { name: 'Timeout', value: t.canTimeout?'✅':'❌', inline: true },
    { name: 'Nickname', value: t.canNickname?'✅':'❌', inline: true },
    { name: 'Ban', value: t.canBan?'✅':'❌', inline: true }
  )] });
}};

/* ---------- MODERATION ---------- */
commands.ban = { cat: 'Moderation', desc: 'Ban', usage: 'ban <@user|userID> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [errE('❌ No permission (Owner).')] });
  const t = (await resolveMember(m, a[0])) || (await resolveMemberById(m.guild, a[0]));
  if (!t) return m.reply({ embeds: [errE('Not found.')] });
  if (!t.bannable) return m.reply({ embeds: [errE('Hierarchy.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  await t.ban({ reason: `${m.author.tag} [${tier.label}]: ${r}` }).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('🔨 Banned').addFields(
    { name: 'User', value: `${t.user.tag} (${t.id})`, inline: true },
    { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
    { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, BAN_LOG_CHANNEL_ID, e);
}};
commands.unban = { cat: 'Moderation', desc: 'Unban', usage: 'unban <id>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [errE('❌ No permission.')] });
  if (!a[0]) return m.reply({ embeds: [errE('Provide ID.')] });
  try { await m.guild.bans.remove(a[0]); m.reply({ embeds: [okE('🔓 Unbanned', `\`${a[0]}\``)] }); }
  catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.kick = { cat: 'Moderation', desc: 'Kick', usage: 'kick <@user|userID> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canKick) return m.reply({ embeds: [errE('❌ No permission (Admin+).')] });
  const t = (await resolveMember(m, a[0])) || (await resolveMemberById(m.guild, a[0]));
  if (!t) return m.reply({ embeds: [errE('Not found.')] });
  if (!t.kickable) return m.reply({ embeds: [errE('Hierarchy.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  await t.kick(`${m.author.tag} [${tier.label}]: ${r}`).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('👢 Kicked').addFields(
    { name: 'User', value: t.user.tag, inline: true },
    { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
    { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, KICK_LOG_CHANNEL_ID || GENERAL_LOG_CHANNEL_ID, e);
}};

commands.mute = { cat: 'Moderation', desc: 'Voice-mute', usage: 'mute <@user|userID> <minutes|perm> <reason>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ No permission.')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [errE('❌ Not found.')] });
  const durArg = (a[1] || '').trim().toLowerCase();
  const reason = a.slice(2).join(' ').trim();
  if (!durArg) return m.reply({ embeds: [errE('❌ Specify duration.')] });
  if (!reason) return m.reply({ embeds: [errE('❌ Provide reason.')] });
  let minutes = 0, permanent = false;
  if (durArg === 'perm' || durArg === 'permanent') {
    if (tier.maxMute !== -1) return m.reply({ embeds: [errE(`❌ Max for ${tier.label}: ${fmtMinutes(tier.maxMute)}.`)] });
    permanent = true;
  } else {
    minutes = parseInt(durArg, 10);
    if (isNaN(minutes)) return m.reply({ embeds: [errE('Invalid minutes.')] });
    if (minutes < tier.minMute) return m.reply({ embeds: [errE(`Min: ${tier.minMute}m.`)] });
    if (tier.maxMute !== -1 && minutes > tier.maxMute) {
      if (tier.rank === 1) return m.reply({ embeds: [errE('❌ mymknch aw9 rak 4a helper', 'Max Helper: 10 min.')] });
      return m.reply({ embeds: [errE(`❌ Max for ${tier.label}: ${fmtMinutes(tier.maxMute)}.`)] });
    }
  }
  if (!target.voice?.channel) return m.reply({ embeds: [errE('❌ Not in voice.')] });
  if (target.roles.highest.position >= m.guild.members.me.roles.highest.position) return m.reply({ embeds: [errE('❌ Hierarchy.')] });
  try {
    await target.voice.setMute(true, `${m.author.tag}: ${reason}`);
    const key = `${m.guild.id}:${target.id}`;
    activeMutes[key] = { guildId: m.guild.id, userId: target.id, unmuteAt: permanent ? -1 : Date.now() + minutes * 60 * 1000, permanent, reason, modTag: m.author.tag, modTier: tier.label, channelId: target.voice.channel.id };
    saveJson(MUTE_CFG_FILE, activeMutes);
    scheduleUnmute(key);
    const e = okE('🔇 Voice Muted').addFields(
      { name: 'User', value: `${target.user.tag}`, inline: true },
      { name: 'Duration', value: permanent ? 'Permanent' : `${minutes} min`, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'Reason', value: reason });
    m.reply({ embeds: [e] }); sendLog(m.guild, MUTE_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};
commands.unmute = { cat: 'Moderation', desc: 'Unmute', usage: 'unmute <@user|userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!t) return m.reply({ embeds: [errE('Not found.')] });
  if (!t.voice?.channel) return m.reply({ embeds: [errE('❌ Not in voice.')] });
  if (!t.voice.serverMute) return m.reply({ embeds: [errE('❌ Not muted.')] });
  try {
    await t.voice.setMute(false, `Unmuted by ${m.author.tag}`);
    const key = `${m.guild.id}:${t.id}`;
    if (activeMutes[key]) { delete activeMutes[key]; saveJson(MUTE_CFG_FILE, activeMutes); if (muteTimers.has(key)) { clearTimeout(muteTimers.get(key)); muteTimers.delete(key); } }
    m.reply({ embeds: [okE('🔊 Unmuted', t.user.tag)] });
    sendLog(m.guild, MUTE_LOG_CHANNEL_ID, okE('🔊 Unmuted').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'By', value: m.author.tag, inline: true }));
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};

commands.timeout = { cat: 'Moderation', desc: 'Timeout', usage: 'timeout <@user|userID> <min> <reason>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canTimeout) return m.reply({ embeds: [errE('❌ No permission (Head Admin+).')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [errE('Not found.')] });
  const minutes = parseInt(a[1], 10);
  const reason = a.slice(2).join(' ').trim();
  if (isNaN(minutes) || minutes < 1) return m.reply({ embeds: [errE('Invalid minutes.')] });
  if (!reason) return m.reply({ embeds: [errE('Provide reason.')] });
  if (!target.moderatable) return m.reply({ embeds: [errE('Hierarchy.')] });
  try {
    await target.timeout(minutes * 60 * 1000, `${m.author.tag}: ${reason}`);
    const e = okE('⏳ Timed Out').addFields(
      { name: 'User', value: target.user.tag, inline: true },
      { name: 'Duration', value: `${minutes} min`, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'Reason', value: reason });
    m.reply({ embeds: [e] }); sendLog(m.guild, TIMEOUT_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};
commands.untimeout = { cat: 'Moderation', desc: 'Remove timeout', usage: 'untimeout <@user|userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canTimeout) return m.reply({ embeds: [errE('❌ No permission.')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [errE('Not found.')] });
  if (!target.isCommunicationDisabled()) return m.reply({ embeds: [errE('❌ Not timed out.')] });
  try {
    await target.timeout(null, `Untimeout by ${m.author.tag}`);
    m.reply({ embeds: [okE('✅ Timeout removed', target.user.tag)] });
    sendLog(m.guild, TIMEOUT_LOG_CHANNEL_ID, okE('✅ Timeout Removed').addFields({ name: 'User', value: target.user.tag, inline: true }, { name: 'By', value: m.author.tag, inline: true }));
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};

commands.warn = { cat: 'Moderation', desc: 'Warn', usage: 'warn <@user|userID> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!t) return m.reply({ embeds: [errE('Not found.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  const list = warnings.get(t.id) || []; list.push({ mod: m.author.tag, reason: r, ts: Date.now() }); warnings.set(t.id, list);
  m.reply({ embeds: [okE('⚠️ Warned').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'Total', value: `${list.length}`, inline: true }, { name: 'Reason', value: r })] });
}};
commands.warnings = { cat: 'Moderation', desc: 'List warnings', usage: 'warnings <@user|userID>', async run(m, a) {
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [errE('Not found.')] });
  const list = warnings.get(u.id) || [];
  if (!list.length) return m.reply({ embeds: [infoE('No Warnings', `${u.tag} has none.`)] });
  m.reply({ embeds: [infoE(`Warnings for ${u.tag}`).setDescription(list.map((w, i) => `**#${i+1}** — ${w.reason} *by ${w.mod}*`).join('\n'))] });
}};
commands.clearwarns = { cat: 'Moderation', desc: 'Clear warnings', usage: 'clearwarns <@user|userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [errE('❌ No permission (Admin+).')] });
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
  if (!tier || tier.rank < 2) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: false }).catch(()=>{});
  m.reply({ embeds: [okE('🔒', `${ch}`)] });
}};
commands.unlock = { cat: 'Moderation', desc: 'Unlock', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 2) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: null }).catch(()=>{});
  m.reply({ embeds: [okE('🔓', `${ch}`)] });
}};
commands.hackban = { cat: 'Moderation', desc: 'Hackban', usage: 'hackban <id> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [errE('❌ No permission (Owner).')] });
  if (!a[0]) return m.reply({ embeds: [errE('Provide ID.')] });
  const r = a.slice(1).join(' ') || 'Hackban';
  try {
    await m.guild.bans.create(a[0], { reason: `${m.author.tag}: ${r}` });
    m.reply({ embeds: [okE('🔨 Hackbanned', `\`${a[0]}\``)] });
  } catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};

commands.move = { cat: 'Moderation', desc: 'Move member', usage: 'move <@user|userID> <#voice|voiceID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [errE('❌ No permission.')] });
  if (!tier.canMove) return m.reply({ embeds: [errE('❌ mymknkch aw9 rak 4a helper')] });
  if (!a[0] || !a[1]) return m.reply({ embeds: [errE('Usage: `!move <@user|userID> <#voice|voiceID>`')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [errE('❌ Member not found.')] });
  let destCh = m.mentions.channels.first();
  if (!destCh) {
    const chStr = a[1].trim().replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(chStr)) destCh = m.guild.channels.cache.get(chStr) || await m.guild.channels.fetch(chStr).catch(()=>null);
  }
  if (!destCh) return m.reply({ embeds: [errE('❌ Channel not found.')] });
  if (destCh.type !== ChannelType.GuildVoice && destCh.type !== ChannelType.GuildStageVoice) return m.reply({ embeds: [errE('❌ Not voice.')] });
  const fromCh = target.voice?.channel;
  if (!fromCh) return m.reply({ embeds: [errE('❌ Not in voice.')] });
  if (fromCh.id === destCh.id) return m.reply({ embeds: [errE('❌ Already there.')] });
  if (target.roles.highest.position >= m.guild.members.me.roles.highest.position) return m.reply({ embeds: [errE('❌ Hierarchy.')] });
  try {
    await target.voice.setChannel(destCh, `Moved by ${m.author.tag}`);
    const e = okE('➡️ Moved').addFields(
      { name: 'User', value: target.user.tag, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'From', value: `${fromCh}`, inline: true },
      { name: 'To', value: `${destCh}`, inline: true });
    m.reply({ embeds: [e] }); sendLog(m.guild, MOVE_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};

commands.nickname = { cat: 'Members', desc: 'Change nickname', usage: 'nickname <@user|userID> <name>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canNickname) return m.reply({ embeds: [errE('❌ No permission (Co-Owner+).')] });
  if (!a[0] || a.length < 2) return m.reply({ embeds: [errE('Usage: `!nickname <@user|userID> <name>`')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [errE('❌ Not found.')] });
  const nickname = a.slice(1).join(' ').trim().slice(0, 32);
  if (!nickname) return m.reply({ embeds: [errE('Provide nickname.')] });
  if (target.roles.highest.position >= m.guild.members.me.roles.highest.position) return m.reply({ embeds: [errE('❌ Hierarchy.')] });
  const oldNick = target.nickname || target.user.username;
  try {
    await target.setNickname(nickname, `Changed by ${m.author.tag}`);
    const e = okE('✏️ Nickname Changed').addFields(
      { name: 'User', value: target.user.tag, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'Before', value: oldNick, inline: true },
      { name: 'After', value: nickname, inline: true });
    m.reply({ embeds: [e] }); sendLog(m.guild, NICKNAME_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};
commands.resetnick = { cat: 'Members', desc: 'Reset nickname', usage: 'resetnick <@user|userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canNickname) return m.reply({ embeds: [errE('❌ No permission.')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [errE('❌ Not found.')] });
  const oldNick = target.nickname || target.user.username;
  try {
    await target.setNickname(null, `Reset by ${m.author.tag}`);
    const e = okE('↩️ Reset').addFields(
      { name: 'User', value: target.user.tag, inline: true },
      { name: 'Before', value: oldNick, inline: true },
      { name: 'After', value: target.user.username, inline: true });
    m.reply({ embeds: [e] }); sendLog(m.guild, NICKNAME_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};

/* ---------- GIVEAWAY ---------- */
commands.giveaway = { cat: 'Fun', desc: 'Start a giveaway', usage: 'giveaway <time> <winners> <prize...> [imageURL]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [errE('❌ No permission (Moderator+).')] });
  if (a.length < 3) return m.reply({ embeds: [errE('Usage: `!giveaway <time> <winners> <prize> [imageURL]`')] });
  const durationMs = parseDuration(a[0]);
  if (!durationMs) return m.reply({ embeds: [errE('Invalid time. Use: 10m, 1h, 1d')] });
  const winners = parseInt(a[1], 10);
  if (isNaN(winners) || winners < 1 || winners > 50) return m.reply({ embeds: [errE('Winners 1-50.')] });
  let rest = a.slice(2), imageURL = '';
  if (rest.length > 1 && /^https?:\/\/\S+/i.test(rest[rest.length - 1])) imageURL = rest.pop();
  if (!imageURL && m.attachments.size) imageURL = m.attachments.first().url;
  const prize = rest.join(' ').trim();
  if (!prize) return m.reply({ embeds: [errE('Provide a prize.')] });
  const gw = { guildId: m.guild.id, channelId: m.channel.id, hostId: m.author.id, prize, winners, imageURL, endsAt: Date.now() + durationMs, ended: false, entries: [], winnerIds: [] };
  let msg;
  try { msg = await m.channel.send({ embeds: [buildGiveawayEmbed(gw, false)] }); await msg.react('🎉'); }
  catch (e) { return m.reply({ embeds: [errE('Failed', e.message)] }); }
  activeGiveaways[msg.id] = gw;
  saveJson(GIVEAWAY_CFG_FILE, activeGiveaways);
  giveawayTimers.set(msg.id, setTimeout(() => endGiveaway(msg.id).catch(()=>{}), durationMs));
  m.reply({ embeds: [okE('✅ Giveaway Started!', `Prize: ${prize} • Winners: ${winners} • Ends in: ${fmtDur(durationMs)}\nID: \`${msg.id}\``)] }).catch(()=>{});
}};
commands.gend = { cat: 'Fun', desc: 'Force-end giveaway', usage: 'gend <msgID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [errE('❌ No permission.')] });
  const id = (a[0] || '').trim(); if (!id) return m.reply({ embeds: [errE('Usage: `!gend <msgID>`')] });
  const gw = activeGiveaways[id]; if (!gw) return m.reply({ embeds: [errE('Not found.')] });
  if (gw.ended) return m.reply({ embeds: [errE('Already ended.')] });
  await endGiveaway(id);
  m.reply({ embeds: [okE('✅ Ended', `\`${id}\``)] }).catch(()=>{});
}};
commands.greroll = { cat: 'Fun', desc: 'Re-roll winners', usage: 'greroll <msgID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [errE('❌ No permission.')] });
  const id = (a[0] || '').trim(); if (!id) return m.reply({ embeds: [errE('Usage: `!greroll <msgID>`')] });
  const gw = activeGiveaways[id]; if (!gw) return m.reply({ embeds: [errE('Not found.')] });
  if (!gw.ended) return m.reply({ embeds: [errE('Still running.')] });
  const entries = [...new Set(gw.entries)].filter(uid => { const m2 = m.guild.members.cache.get(uid); return m2 && !m2.user.bot; });
  const newWinners = []; const pool = [...entries];
  while (newWinners.length < gw.winners && pool.length > 0) { const idx = Math.floor(Math.random() * pool.length); newWinners.push(pool[idx]); pool.splice(idx, 1); }
  if (!newWinners.length) return m.reply({ embeds: [errE('No entries.')] });
  gw.winnerIds = newWinners; saveJson(GIVEAWAY_CFG_FILE, activeGiveaways);
  const channel = m.guild.channels.cache.get(gw.channelId);
  if (channel) channel.send({ content: `🔄 **Re-roll!** ${newWinners.map(x=>`<@${x}>`).join(', ')} won **${gw.prize}**!` }).catch(()=>{});
  m.reply({ embeds: [okE('✅ Re-rolled', newWinners.map(x=>`<@${x}>`).join(', '))] });
}};

/* ---------- MEMBERS ---------- */
commands.userinfo = { cat: 'Members', desc: 'User info', usage: 'userinfo [@user|userID]', async run(m, a) {
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
commands.avatar = { cat: 'Members', desc: 'Avatar', usage: 'avatar [@user|userID]', async run(m, a) {
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
commands.poll = { cat: 'Utility', desc: 'Poll', usage: 'poll Q? | a | b', async run(m, a) {
  const [q, ...opts] = a.join(' ').split('|').map(s => s.trim());
  if (!q || !opts.length) return m.reply({ embeds: [errE('Usage: poll Q? | opt1 | opt2')] });
  const nums = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const msg = await m.channel.send({ embeds: [infoE(`📊 ${q}`).setDescription(opts.map((o, i) => `${nums[i]} ${o}`).join('\n'))] });
  for (let i = 0; i < Math.min(opts.length, 10); i++) await msg.react(nums[i]);
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
commands['8ball'] = { cat: 'Utility', desc: '8-ball', usage: '8ball Q?', async run(m, a) {
  const ans = ['Yes.','No.','Maybe.','Definitely.','Absolutely not.','Ask again.','I doubt it.','For sure!','Unlikely.'];
  m.reply({ embeds: [infoE('🎱', `❓ ${a.join(' ') || '...'}\n💬 **${ans[Math.floor(Math.random()*ans.length)]}**`)] });
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
commands.rules = { cat: 'SMP', desc: 'Rules', async run(m) { m.reply({ embeds: [infoE('📜 Rules', '1. Be respectful.\n2. No hacks.\n3. No griefing.\n4. No spam.\n5. Follow staff instructions.')] }); }};
commands.store = { cat: 'SMP', desc: 'Store', async run(m) { m.reply({ embeds: [infoE('🛒', MC_STORE_URL)] }); }};
commands.mcuser = { cat: 'SMP', desc: 'MC lookup', usage: 'mcuser <name>', async run(m, a) {
  if (!a[0]) return m.reply({ embeds: [errE('Provide username.')] });
  try {
    const r = await fetch(`https://api.mojang.com/users/profiles/minecraft/${a[0]}`).then(x => x.ok ? x.json() : null);
    if (!r) return m.reply({ embeds: [errE('Not found.')] });
    m.reply({ embeds: [infoE(`🎮 ${r.name}`).setThumbnail(`https://mc-heads.net/avatar/${r.id}/128`).addFields({ name: 'UUID', value: r.id })] });
  } catch { m.reply({ embeds: [errE('Failed.')] }); }
}};

/* ---------- VOICE ---------- */
commands.addvoice = { cat: 'Voice', desc: 'Join voice 24/7', usage: 'addvoice <voiceChannelId>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 7) return m.reply({ embeds: [errE('❌ No permission (Co-Owner+).')] });
  const id = (a[0] || '').replace(/[<#>]/g, '').trim();
  if (!id || !/^\d{17,20}$/.test(id)) return m.reply({ embeds: [errE('Usage: addvoice <voiceChannelId>')] });
  const ch = m.guild.channels.cache.get(id) || await m.guild.channels.fetch(id).catch(()=>null);
  if (!ch) return m.reply({ embeds: [errE('Not found.')] });
  if (ch.type !== ChannelType.GuildVoice && ch.type !== ChannelType.GuildStageVoice) return m.reply({ embeds: [errE('Not voice.')] });
  try { await connectToVoice(m.guild, ch.id); voiceConfig[m.guild.id] = ch.id; saveJson(VOICE_CFG_FILE, voiceConfig); m.reply({ embeds: [okE('🔊', `${ch}`)] }); }
  catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.removevoice = { cat: 'Voice', desc: 'Disconnect', async run(m) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 7) return m.reply({ embeds: [errE('❌ No permission.')] });
  const conn = getVoiceConnection(m.guild.id);
  if (conn) { try { conn.destroy(); } catch {} }
  if (reconnectTimers.has(m.guild.id)) { clearTimeout(reconnectTimers.get(m.guild.id)); reconnectTimers.delete(m.guild.id); }
  delete voiceConfig[m.guild.id]; saveJson(VOICE_CFG_FILE, voiceConfig);
  m.reply({ embeds: [okE('🔇 Disconnected')] });
}};

/* ============================================================
 *                     EVENT: READY
 * ============================================================ */
client.once('ready', async () => {
  console.log('==============================');
  console.log(`[READY] Logged in as ${client.user.tag}`);
  console.log(`[READY] Guilds: ${client.guilds.cache.size}`);
  console.log(`[READY] Staff roles: ${STAFF_ROLES.length}`);
  console.log(`[READY] Link-whitelist: ${Object.keys(linkWhitelist.users).length} user(s)`);
  console.log(`[READY] Bot-whitelist: ${Object.keys(botWhitelist.bots).length} bot(s)`);
  console.log(`[READY] Link code: ${LINK_WHITELIST_CODE ? '✅ set' : '❌ not set'}`);
  for (const [, guild] of client.guilds.cache) {
    console.log(`[READY] Guild: ${guild.name}`);
    for (const r of STAFF_ROLES) {
      const role = guild.roles.cache.get(r.id);
      console.log(`[READY]  #${r.rank} → ${role ? role.name : '(NOT FOUND)'}`);
    }
  }
  console.log('==============================');
  client.user.setActivity('𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 🍞', { type: ActivityType.Watching });
  await restoreAllVoiceConnections();
  await restoreMutes();
  await restoreGiveaways();
});

/* ============================================================
 *  EVENT: MEMBER JOIN — Anti-bot + Welcome
 * ============================================================ */
client.on('guildMemberAdd', async member => {
  console.log(`[JOIN] ➕ ${member.user.tag} (${member.id}) — Bot: ${member.user.bot}`);

  if (member.user.bot) {
    if (member.id === client.user.id) return;
    if (isBotWhitelisted(member.id)) { console.log(`[ANTI-BOT] Whitelisted: ${member.user.tag}`); return; }
    console.log(`[ANTI-BOT] Banning: ${member.user.tag}`);
    try {
      await member.ban({ reason: 'Unauthorized bot.', deleteMessageSeconds: 3600 });
      sendLog(member.guild, BAN_LOG_CHANNEL_ID, errE('🔨 Unauthorized Bot Banned').addFields(
        { name: 'Bot', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: 'Reason', value: 'Not whitelisted', inline: true }));
    } catch (err) {
      console.error('[ANTI-BOT] Failed:', err.message);
    }
    return;
  }

  if (UNVERIFIED_ROLE_ID) {
    try { await member.roles.add(UNVERIFIED_ROLE_ID, 'Auto role'); } catch (e) { console.error('[JOIN] unverified:', e.message); }
  }
  joinLog.push(Date.now());
  while (joinLog.length && Date.now() - joinLog[0] > 10000) joinLog.shift();
  if (settings.antiraid && joinLog.length >= 8) { try { await member.kick('Anti-raid'); } catch {} return; }
  await sendWelcome(member.guild, member);
});

/* ============================================================
 *             EVENT: INTERACTION
 * ============================================================ */
client.on(Events.InteractionCreate, async interaction => {

  if (interaction.isModalSubmit()) {
    const id = interaction.customId;
    if (id.startsWith('wyh_modal_')) {
      const targetId = id.replace('wyh_modal_', '');
      const code = interaction.fields.getTextInputValue('wyh_code').trim();
      if (code !== BOT_WHITELIST_CODE) return interaction.reply({ embeds: [errE('❌ Invalid code.')], ephemeral: true });
      const tier = getStaffTier(interaction.member);
      if (!tier || tier.rank < 3) return interaction.reply({ embeds: [errE('❌ No permission.')], ephemeral: true });
      const user = await client.users.fetch(targetId).catch(()=>null);
      if (!user || !user.bot) return interaction.reply({ embeds: [errE('❌ Not a bot.')], ephemeral: true });
      if (isBotWhitelisted(targetId)) return interaction.reply({ embeds: [infoE('Already whitelisted.')], ephemeral: true });
      botWhitelist.bots[targetId] = { addedBy: interaction.user.tag, addedById: interaction.user.id, addedAt: Date.now() };
      saveJson(BOTWL_CFG_FILE, botWhitelist);
      await interaction.reply({ embeds: [okE('✅ Bot Whitelisted', `<@${targetId}> added.`)], ephemeral: true });
      sendLog(interaction.guild, BAN_LOG_CHANNEL_ID, okE('✅ Bot Whitelisted').addFields(
        { name: 'Bot', value: `<@${targetId}>`, inline: true },
        { name: 'By', value: `${interaction.user.tag} (${tier.label})`, inline: true }));
      return;
    }
    return;
  }

  if (!interaction.isButton()) return;
  const btnId = interaction.customId;

  if (btnId === 'verify_button') {
    try {
      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(VERIFIED_ROLE_ID)) return interaction.reply({ embeds: [infoE('Already verified.')], ephemeral: true });
      await member.roles.add(VERIFIED_ROLE_ID, 'Verified');
      if (UNVERIFIED_ROLE_ID && member.roles.cache.has(UNVERIFIED_ROLE_ID))
        await member.roles.remove(UNVERIFIED_ROLE_ID, 'Verified').catch(()=>{});
      await interaction.reply({ embeds: [okE('✅ Verified!', 'Welcome!')], ephemeral: true });
    } catch (e) {
      console.error('[VERIFY]', e);
      if (!interaction.replied && !interaction.deferred) interaction.reply({ embeds: [errE('Error', e.message)], ephemeral: true }).catch(()=>{});
    }
    return;
  }

  if (btnId === 'apply_minecraft' || btnId === 'apply_discord') {
    const userId = interaction.user.id;
    const isMc = btnId === 'apply_minecraft';
    const type = isMc ? 'Minecraft Staff' : 'Discord Staff';
    if (dmApplications.has(userId)) return interaction.reply({ embeds: [errE('Already applying.')], ephemeral: true });
    try {
      const dm = await interaction.user.createDM();
      dmApplications.set(userId, { type, step: 0, answers: {}, guildId: interaction.guild.id });
      await interaction.reply({ embeds: [okE('📩 DM Sent')], ephemeral: true });
      await dm.send({ embeds: [
        new EmbedBuilder().setColor(C.info).setTitle(`📝 Application — ${type}`)
          .setDescription(`Welcome! I'll ask you **${APPLY_QUESTIONS.length}** questions.\nType \`cancel\` to abort.\n\n**Q1/${APPLY_QUESTIONS.length}:** ${APPLY_QUESTIONS[0].q}`)
          .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷' }).setTimestamp()
      ] });
    } catch (e) {
      dmApplications.delete(userId);
      return interaction.reply({ embeds: [errE('❌ Cannot DM you.')], ephemeral: true });
    }
    return;
  }

  if (btnId.startsWith('apply_accept_')) {
    const tier = getStaffTier(interaction.member);
    if (!tier || tier.rank < 3) return interaction.reply({ embeds: [errE('❌ Admin only.')], ephemeral: true });
    const userId = btnId.replace('apply_accept_', '');
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (user) await user.send({ embeds: [okE('🎉 Congratulations!', 'Your application has been accepted!')] }).catch(()=>{});
      await interaction.reply({ embeds: [okE('✅ Accepted', `<@${userId}>`)] });
      try { await interaction.message.edit({ components: [] }); } catch {}
    } catch (e) { console.error('[ACCEPT]', e); }
    return;
  }

  if (btnId.startsWith('apply_reject_')) {
    const tier = getStaffTier(interaction.member);
    if (!tier || tier.rank < 3) return interaction.reply({ embeds: [errE('❌ Admin only.')], ephemeral: true });
    const userId = btnId.replace('apply_reject_', '');
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (user) await user.send({ embeds: [errE('❌ Application Result', 'Your application has been rejected.')] }).catch(()=>{});
      await interaction.reply({ embeds: [errE('❌ Rejected', `<@${userId}>`)] });
      try { await interaction.message.edit({ components: [] }); } catch {}
    } catch (e) { console.error('[REJECT]', e); }
    return;
  }
});

/* ============================================================
 *             EVENT: MESSAGE REACTION (Giveaway)
 * ============================================================ */
client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(()=>null);
    if (reaction.emoji.name !== '🎉') return;
    const gw = activeGiveaways[reaction.message.id];
    if (!gw || gw.ended) return;
    if (!gw.entries.includes(user.id)) {
      gw.entries.push(user.id); saveJson(GIVEAWAY_CFG_FILE, activeGiveaways);
      const guild = client.guilds.cache.get(gw.guildId);
      const channel = guild?.channels.cache.get(gw.channelId);
      const msg = await channel?.messages.fetch(reaction.message.id).catch(()=>null);
      if (msg) msg.edit({ embeds: [buildGiveawayEmbed(gw, false)] }).catch(()=>{});
    }
  } catch (e) { console.error('[GIVEAWAY] add:', e.message); }
});
client.on('messageReactionRemove', async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(()=>null);
    if (reaction.emoji.name !== '🎉') return;
    const gw = activeGiveaways[reaction.message.id];
    if (!gw || gw.ended) return;
    gw.entries = gw.entries.filter(id => id !== user.id);
    saveJson(GIVEAWAY_CFG_FILE, activeGiveaways);
  } catch (e) { console.error('[GIVEAWAY] rm:', e.message); }
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
      reconnectTimers.set(newState.guild.id, setTimeout(async () => {
        reconnectTimers.delete(newState.guild.id);
        try { await connectToVoice(newState.guild, saved); } catch (e) { console.error('[VOICE]', e.message); }
      }, 2000));
    }
    return;
  }
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
    sendLog(n.guild, NICKNAME_LOG_CHANNEL_ID || GENERAL_LOG_CHANNEL_ID,
      infoE('✏️ Nickname Changed').addFields(
        { name: 'Member', value: n.user.tag, inline: true },
        { name: 'Before', value: o.nickname || '*none*', inline: true },
        { name: 'After', value: n.nickname || '*none*', inline: true },
        { name: 'By', value: exec ? exec.tag : 'Unknown' }));
  }
  const added = n.roles.cache.filter(r => !o.roles.cache.has(r.id));
  const removed = o.roles.cache.filter(r => !n.roles.cache.has(r.id));
  if (added.size || removed.size) {
    const exec = await auditExec(n.guild, AuditLogEvent.MemberRoleUpdate, n.id);
    const e = infoE('🏷️ Role Update').addFields({ name: 'Member', value: n.user.tag, inline: true });
    if (added.size) e.addFields({ name: 'Added', value: added.map(r => r.toString()).join(' ') });
    if (removed.size) e.addFields({ name: 'Removed', value: removed.map(r => r.toString()).join(' ') });
    if (exec) e.addFields({ name: 'By', value: exec.tag });
    sendLog(n.guild, ROLE_LOG_CHANNEL_ID, e);
  }
});
client.on('guildMemberRemove', async member => {
  const exec = await auditExec(member.guild, AuditLogEvent.MemberKick, member.id);
  const e = errE('👋 Left').addFields({ name: 'User', value: member.user.tag });
  if (exec) e.addFields({ name: 'Kicked by', value: exec.tag });
  sendLog(member.guild, KICK_LOG_CHANNEL_ID || GENERAL_LOG_CHANNEL_ID, e);
});
client.on('guildBanAdd', async ban => {
  const exec = await auditExec(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  sendLog(ban.guild, BAN_LOG_CHANNEL_ID, errE('🔨 Banned').addFields(
    { name: 'User', value: ban.user.tag }, { name: 'By', value: exec ? exec.tag : 'Unknown' }, { name: 'Reason', value: ban.reason || 'None' }));
});

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
      return message.reply({ embeds: [infoE('❌ Cancelled')] }).catch(()=>{});
    }
    app.answers[APPLY_QUESTIONS[app.step].key] = content;
    app.step++;
    if (app.step >= APPLY_QUESTIONS.length) {
      dmApplications.delete(userId);
      await message.reply({ embeds: [okE('✅ Application Sent!')] }).catch(()=>{});
      const guild = client.guilds.cache.get(app.guildId);
      const resultsCh = guild?.channels.cache.get(APPLY_RESULTS_CHANNEL_ID);
      if (!resultsCh || !resultsCh.isTextBased()) return;
      const isMc = app.type === 'Minecraft Staff';
      const embed = new EmbedBuilder().setColor(isMc ? C.ok : C.info)
        .setTitle(`📝 New Application — ${app.type}`)
        .setDescription(`**Applicant:** <@${userId}> (\`${userId}\`)\n**Username:** \`${message.author.tag}\``)
        .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Accept or Reject' }).setTimestamp();
      for (const q of APPLY_QUESTIONS)
        embed.addFields({ name: q.label, value: `\`\`\`${String(app.answers[q.key] || '(empty)').slice(0, 1000)}\`\`\`` });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`apply_accept_${userId}`).setLabel('Accept').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`apply_reject_${userId}`).setLabel('Reject').setEmoji('❌').setStyle(ButtonStyle.Danger)
      );
      const msg = await resultsCh.send({ embeds: [embed], components: [row] }).catch(()=>null);
      if (msg) applications.set(msg.id, { userId, type: app.type, answers: app.answers });
      return;
    }
    const nextQ = APPLY_QUESTIONS[app.step];
    await message.reply({ embeds: [
      new EmbedBuilder().setColor(C.info).setTitle(`Q${app.step + 1}/${APPLY_QUESTIONS.length}`)
        .setDescription(nextQ.q).setFooter({ text: 'Type "cancel" to abort' }).setTimestamp()
    ] }).catch(()=>{});
    return;
  }

  /* ============================================================
   *  ⚠️ ANTI BOT-INVITE-LINK PROTECTION
   *  - Detects bot invite links in ANY message
   *  - Deletes the message
   *  - Replies with HUGE text: "lah yn3l tbon mok"
   *  - Bypass only if user is in LINK whitelist (!link add)
   *  - Even Owner / Administrator cannot bypass
   * ============================================================ */
  if (!isLinkWhitelisted(message.author.id)) {
    const botLink = containsBotInviteLink(message.content);
    if (botLink) {
      // Delete the message
      await message.delete().catch(() => {});

      // Send the big warning
      const warning = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('# lah yn3l tbon mok')
        .setDescription(
          `# lah yn3l tbon mok\n\n` +
          `**${message.author}** — راك تحاول تصيفط رابط بوت. هادشي ممنوع فالسيرفر! 🚫\n\n` +
          `> إلا بغيتي صلاحية تصيفط روابط بوت، تواصل مع الإدارة باش يزيدوك فـ الـ whitelist.`
        )
        .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Khobza SMP • Anti Bot-Link Protection' })
        .setTimestamp();

      message.channel.send({ content: `<@${message.author.id}>`, embeds: [warning] })
        .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 10000))
        .catch(() => {});

      // Log to general
      if (GENERAL_LOG_CHANNEL_ID) {
        sendLog(message.guild, GENERAL_LOG_CHANNEL_ID,
          errE('🚫 Bot Invite Link Blocked').addFields(
            { name: 'User', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
            { name: 'Channel', value: `${message.channel}`, inline: true },
            { name: 'Link', value: `\`${botLink.slice(0, 100)}\``, inline: false }
          ));
      }
      console.log(`[ANTI-LINK] Blocked bot invite from ${message.author.tag}: ${botLink.slice(0, 80)}`);
      return; // Stop processing further
    }
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
  if (settings.antiinvite && !has(message.member, PermissionFlagsBits.ManageMessages) && /(discord\.gg|discord\.com\/invite)\//i.test(message.content))
    message.delete().catch(()=>{});
  if (settings.antimention && !has(message.member, PermissionFlagsBits.ManageMessages) && message.mentions.users.size >= 5)
    message.delete().catch(()=>{});
  if (settings.automod && !has(message.member, PermissionFlagsBits.ManageMessages)) {
    const bad = ['fuck','shit','bitch'];
    if (bad.some(w => message.content.toLowerCase().includes(w))) message.delete().catch(()=>{});
  }

  /* ============ COMMAND DISPATCH ============ */
  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const name = args.shift().toLowerCase();

  if (name === 'roll' && args[0]?.toLowerCase() === 'all' && args[1]?.toLowerCase() === 'info')
    return commands.staffinfo.run(message, []);
  if (name === 'role' && args[0]?.toLowerCase() === 'all' && args[1]?.toLowerCase() === 'info')
    return commands.staffinfo.run(message, []);

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
