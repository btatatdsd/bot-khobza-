/* ============================================================
 *  𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 Discord Bot — Full Version
 *  - Helpful guidance messages instead of errors
 *  - !roll all info — show all staff roles info
 *  - Ticket System, Anti-Link, Manual Logs
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

const MANUAL_MOVE_LOG_CHANNEL_ID = process.env.MANUAL_MOVE_LOG_CHANNEL_ID || MOVE_LOG_CHANNEL_ID;
const MANUAL_BAN_LOG_CHANNEL_ID  = process.env.MANUAL_BAN_LOG_CHANNEL_ID  || '1559282035502358649';
const MANUAL_MUTE_LOG_CHANNEL_ID = process.env.MANUAL_MUTE_LOG_CHANNEL_ID || '1559282210731728976';

const MC_SERVER_IP             = process.env.MC_SERVER_IP || 'play.khobzasmp.com';
const MC_STORE_URL             = process.env.MC_STORE_URL || 'https://store.khobzasmp.com';
const DATA_DIR                 = process.env.DATA_DIR || __dirname;
const VOICE_CFG_FILE           = path.join(DATA_DIR, 'voice-config.json');
const MUTE_CFG_FILE            = path.join(DATA_DIR, 'mute-config.json');
const GIVEAWAY_CFG_FILE        = path.join(DATA_DIR, 'giveaway-config.json');
const BOTWL_CFG_FILE           = path.join(DATA_DIR, 'bot-whitelist.json');
const LINKWL_CFG_FILE          = path.join(DATA_DIR, 'link-whitelist.json');
const TICKET_CFG_FILE          = path.join(DATA_DIR, 'ticket-config.json');
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

const TICKET_PANEL_CHANNEL_ID = process.env.TICKET_PANEL_CHANNEL_ID || '';
const TICKET_CATEGORY_ID      = process.env.TICKET_CATEGORY_ID      || '';
const TICKET_SUPPORT_ROLE_ID  = process.env.TICKET_SUPPORT_ROLE_ID  || '1557761090069471313';
const TICKET_LOG_CHANNEL_ID   = process.env.TICKET_LOG_CHANNEL_ID   || '1557761467393245276';
const TICKET_PANEL_IMAGE      = process.env.TICKET_PANEL_IMAGE      || 'https://i.postimg.cc/nhG6tKTM/ddddddd.jpg';

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

/* ===================== TICKET TYPES ===================== */
const TICKET_TYPES = {
  pub:    { id: 'pub',    label: 'Pub',    emoji: '🔥', title: 'Pub Report',             desc: 'Report spam or pub',         color: 0xed4245 },
  bugs:   { id: 'bugs',   label: 'Bugs',   emoji: '🐛', title: 'Bug Report',             desc: 'Report bugs or issues',      color: 0x57f287 },
  abuse:  { id: 'abuse',  label: 'Abuse',  emoji: '⚔️', title: 'Abuse Report',           desc: 'Report abuse or harassment', color: 0xeb459e },
  server: { id: 'server', label: 'Server', emoji: '🔒', title: 'Server Info / Requests', desc: 'Server info or requests',    color: 0x5865f2 },
  staff:  { id: 'staff',  label: 'Staff',  emoji: '🛠️', title: 'Staff Abuse Report',     desc: 'Report staff issues',        color: 0xfee75c },
  donate: { id: 'donate', label: 'Donate', emoji: '💰', title: 'Donation Support',       desc: 'Support The Server',         color: 0xf0c264 }
};

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
const settings = { antispam: false, antiraid: false, antimention: false, automod: false };
const spamMap  = new Map();
const joinLog  = [];
const applications   = new Map();
const dmApplications = new Map();

/* ============================================================
 *  STAFF TIER SYSTEM
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

/* ===================== JSON STORAGE ===================== */
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

const linkWhitelist = loadJson(LINKWL_CFG_FILE, { users: {} });
if (!linkWhitelist.users) linkWhitelist.users = {};
const isLinkWhitelisted = id => !!linkWhitelist.users[id];

const ticketConfig = loadJson(TICKET_CFG_FILE, { tickets: {} });
if (!ticketConfig.tickets) ticketConfig.tickets = {};

/* ============================================================
 *  LINK DETECTION
 * ============================================================ */
const ANY_URL_PATTERN = /(https?:\/\/[^\s<>]+)|(www\.[^\s<>]+\.[a-z]{2,}[^\s<>]*)|((?:discord\.gg|discord\.com\/invite)\/[^\s<>]+)/i;
function containsAnyLink(content) {
  if (!content) return null;
  const m = content.match(ANY_URL_PATTERN);
  return m ? m[0] : null;
}

/* ===================== VOICE MUTE STORAGE ===================== */
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
  } catch (e) {}

  if (winners.length) channel.send({ content: `🎉 ${winners.map(id=>`<@${id}>`).join(', ')} won **${gw.prize}**!` }).catch(()=>{});
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

/* ⭐ Help message builder — shows "what to do" instead of "Error" */
const helpE = (title, desc, fields = []) => {
  const e = new EmbedBuilder()
    .setColor(C.info)
    .setTitle(`📘 ${title}`)
    .setDescription(desc)
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • How to use' })
    .setTimestamp();
  for (const f of fields) e.addFields(f);
  return e;
};

/* ⭐ Missing args helper — shows usage nicely */
const usageE = (commandName, syntax, examples = []) => {
  const e = new EmbedBuilder()
    .setColor(C.warn)
    .setTitle(`❓ How to use \`!${commandName}\``)
    .setDescription(`**Usage:**\n\`\`\`${syntax}\`\`\``)
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Help' })
    .setTimestamp();
  if (examples.length) {
    e.addFields({ name: '📝 Examples', value: examples.map(x => `\`${x}\``).join('\n') });
  }
  return e;
};

async function sendLog(guild, channelId, embed) {
  if (!channelId || !guild) return;
  const ch = guild.channels.cache.get(channelId);
  if (!ch || typeof ch.isTextBased !== 'function' || !ch.isTextBased()) return;
  try { await ch.send({ embeds: [embed] }); } catch (e) { console.error('log err:', e.message); }
}
async function auditExec(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 10 });
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
  if (!ch || typeof ch.isTextBased !== 'function' || !ch.isTextBased()) return { ok: false, reason: 'Channel not found' };
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
 *  📋 !roll all info — Show all staff roles
 *  Aliases: !rollinfo, !roleinfo all, !roles-info
 * ============================================================ */
function buildStaffInfoEmbeds(guild) {
  const embeds = [];
  const header = new EmbedBuilder()
    .setColor(0x5865f2).setTitle('🎖️ Staff Roles — 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷')
    .setDescription('All staff ranks sorted from **#1** (lowest) to **#8** (highest).\n\n🔇 `Mute` • ➡️ `Move` • ⏳ `Timeout` • ✏️ `Nick` • 👢 `Kick` • 🔨 `Ban` • 🎁 `Giveaway`')
    .setFooter({ text: `Total: ${STAFF_ROLES.length} roles • ${guild.name}` })
    .setTimestamp();
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

commands.staffinfo = { cat: 'Utility', desc: 'Show all staff roles', async run(m) {
  await m.reply({ embeds: buildStaffInfoEmbeds(m.guild) });
}};
commands.staff = commands.staffinfo;
commands['roles-info'] = commands.staffinfo;

commands.roleinfo = { cat: 'Utility', desc: 'Role info', usage: 'roleinfo <@role|roleID|all>', async run(m, a) {
  const arg = (a[0] || '').toLowerCase();

  // !roleinfo all
  if (arg === 'all') return m.reply({ embeds: buildStaffInfoEmbeds(m.guild) });

  // No arg → show help
  if (!a[0]) {
    return m.reply({ embeds: [usageE('roleinfo', '!roleinfo <@role|roleID|all>', [
      '!roleinfo all',
      '!roleinfo @Helper',
      '!roleinfo 1557761089163231432'
    ])] });
  }

  let r = m.mentions.roles.first();
  if (!r && a[0] && /^\d{17,20}$/.test(a[0].replace(/[<@&>]/g, '')))
    r = m.guild.roles.cache.get(a[0].replace(/[<@&>]/g, '')) || await m.guild.roles.fetch(a[0].replace(/[<@&>]/g, '')).catch(()=>null);
  if (!r) r = m.guild.roles.cache.find(x => x.name.toLowerCase() === arg);
  if (!r) return m.reply({ embeds: [helpE('Role not found', 'الرول اللي عطيتي ما لقيتوش.', [
    { name: '💡 Tip', value: 'جرب `!roleinfo all` باش تشوف جميع الرولات' }
  ])] });

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

/* ============================================================
 *  🎫 !ticketpanel
 * ============================================================ */
commands.ticketpanel = { cat: 'Tickets', desc: 'Send the ticket support panel', usage: 'ticketpanel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator))
    return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Administrator** باش تدير هاد الأمر.')] });

  let ch = null;
  if (TICKET_PANEL_CHANNEL_ID && /^\d{17,20}$/.test(String(TICKET_PANEL_CHANNEL_ID).trim())) {
    ch = m.guild.channels.cache.get(String(TICKET_PANEL_CHANNEL_ID).trim());
    if (!ch) ch = await m.guild.channels.fetch(String(TICKET_PANEL_CHANNEL_ID).trim()).catch(() => null);
  }
  if (!ch) ch = m.channel;

  if (!ch || typeof ch.isTextBased !== 'function' || !ch.isTextBased()) {
    return m.reply({ embeds: [helpE('Channel Not Found', 'ما لقيتش الروم اللي غادي يبعث فيه البانل.', [
      { name: '💡 Solution', value: 'تأكد أن `TICKET_PANEL_CHANNEL_ID` صحيح، ولا استعمل الأمر فـ الروم اللي بغيتي' }
    ])] });
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Ticket Support System')
    .setDescription(
      '• We want to keep our community **safe, friendly, and fun** for everyone. ' +
      'To help with this, we have a report system you can use to tell us about any problems or questions you have. ' +
      'Here\'s a quick look at the different parts of our report system: `·͜·`\n\n' +
      '• 🔥 **Pub**: Report spam or pub\n' +
      '• 🐛 **Bugs**: Report bugs or issues\n' +
      '• ⚔️ **Abuse**: Report abuse or harassment\n' +
      '• 🔒 **Server**: Server info or requests\n' +
      '• 🛠️ **Staff Abuse**: Report staff issues\n' +
      '• 💰 **Donate**: Support The Server\n\n' +
      '• 🌸 *Use these modules for assistance or to report issues.* Our team is here to help!'
    )
    .setThumbnail(m.guild.iconURL({ size: 256 }) || null)
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Support System' })
    .setTimestamp();

  if (TICKET_PANEL_IMAGE) embed.setImage(TICKET_PANEL_IMAGE);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_pub').setLabel('Pub').setEmoji('🔥').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_bugs').setLabel('Bugs').setEmoji('🐛').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_abuse').setLabel('Abuse').setEmoji('⚔️').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_server').setLabel('Server').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_staff').setLabel('Staff').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_donate').setLabel('Donate').setEmoji('💰').setStyle(ButtonStyle.Secondary)
  );

  try {
    await ch.send({ embeds: [embed], components: [row1, row2] });
    m.reply({ embeds: [okE('✅ Ticket Panel Sent', `In ${ch}`)] }).catch(()=>{});
  } catch (e) { m.reply({ embeds: [errE('❌ Failed', e.message)] }); }
}};

/* ============================================================
 *  🔒 !ticketclose
 * ============================================================ */
commands.ticketclose = { cat: 'Tickets', desc: 'Close the current ticket', usage: 'ticketclose', async run(m) {
  const ticket = ticketConfig.tickets[m.channel.id];
  if (!ticket) return m.reply({ embeds: [helpE('Not a Ticket', 'هاد الروم ماشي تيكت.', [
    { name: '💡 Tip', value: 'استعمل الأمر فـ روم التيكت فقط' }
  ])] });

  const tier = getStaffTier(m.member);
  const isOwner = ticket.userId === m.author.id;
  const isTicketStaff = m.member.roles.cache.has(TICKET_SUPPORT_ROLE_ID);
  if (!isOwner && !tier && !isTicketStaff) return m.reply({ embeds: [helpE('Permission', 'غير صاحب التيكت ولا الـ Staff يقدر يسدو.')] });

  await m.channel.send({ embeds: [
    new EmbedBuilder().setColor(0xed4245).setTitle('🔒 Ticket Closing')
      .setDescription(`This ticket will be closed in **5 seconds** by ${m.author}.`)
      .setTimestamp()
  ] });

  if (TICKET_LOG_CHANNEL_ID) {
    sendLog(m.guild, TICKET_LOG_CHANNEL_ID,
      errE('🔒 Ticket Closed').addFields(
        { name: 'Ticket', value: `${m.channel.name} (\`${m.channel.id}\`)`, inline: true },
        { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
        { name: 'Closed by', value: `${m.author.tag}`, inline: true },
        { name: 'Type', value: `\`${ticket.typeLabel}\``, inline: true }
      ));
  }

  delete ticketConfig.tickets[m.channel.id];
  saveJson(TICKET_CFG_FILE, ticketConfig);
  setTimeout(() => m.channel.delete().catch(()=>{}), 5000);
}};

/* ============================================================
 *  🔗 !link
 * ============================================================ */
commands.link = { cat: 'Security', desc: 'Manage link-whitelist', usage: 'link <add|remove|list>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Admin+** باش تدير هاد الأمر.')] });

  const sub = (a[0] || '').toLowerCase();

  if (!sub) {
    return m.reply({ embeds: [helpE('Link Whitelist', 'إدارة الـ whitelist ديال الروابط:', [
      { name: '`!link add <@user|userID> <code>`', value: 'زيد عضو للـ whitelist' },
      { name: '`!link remove <@user|userID>`', value: 'حيّد عضو من الـ whitelist' },
      { name: '`!link list`', value: 'شوف اللي فـ الـ whitelist' }
    ])] });
  }

  if (sub === 'add') {
    if (!a[1]) return m.reply({ embeds: [usageE('link add', '!link add <@user|userID> <code>', [
      '!link add @User 1235',
      '!link add 123456789012345678 1235'
    ])] });

    const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[1]);
    const targetUser = targetMember?.user || await client.users.fetch(String(a[1]).replace(/[<@!>]/g, '')).catch(()=>null);
    if (!targetUser) return m.reply({ embeds: [helpE('User Not Found', 'ما لقيتش هاد العضو.')] });
    if (targetUser.bot) return m.reply({ embeds: [helpE('Not Allowed', 'البوتات ما كيتزادوش هنا. استعمل `!wyh` بدلها.')] });

    if (!a[2]) return m.reply({ embeds: [usageE('link add', `!link add ${targetUser.id} <code>`, [`!link add ${targetUser.id} ${LINK_WHITELIST_CODE}`])] });

    const code = a[2].trim();
    if (code !== LINK_WHITELIST_CODE) return m.reply({ embeds: [helpE('Invalid Code', 'الكود اللي عطيتي ماشي صحيح.', [
      { name: '💡 Tip', value: 'الكود الصحيح موجود عند الـ Admin' }
    ])] });

    if (isLinkWhitelisted(targetUser.id)) return m.reply({ embeds: [infoE('ℹ️ Already Whitelisted', `<@${targetUser.id}> ديجا فـ الـ whitelist.`)] });

    linkWhitelist.users[targetUser.id] = { addedBy: m.author.tag, addedById: m.author.id, addedAt: Date.now() };
    saveJson(LINKWL_CFG_FILE, linkWhitelist);

    const e = okE('✅ User Added').addFields(
      { name: 'User', value: `<@${targetUser.id}>`, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true });
    m.reply({ embeds: [e] });
    sendLog(m.guild, GENERAL_LOG_CHANNEL_ID || BAN_LOG_CHANNEL_ID, e);
    return;
  }

  if (sub === 'remove' || sub === 'rm') {
    if (!a[1]) return m.reply({ embeds: [usageE('link remove', '!link remove <@user|userID>', ['!link remove @User'])] });
    const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[1]);
    const targetUser = targetMember?.user || await client.users.fetch(String(a[1]).replace(/[<@!>]/g, '')).catch(()=>null);
    if (!targetUser) return m.reply({ embeds: [helpE('User Not Found', 'ما لقيتش هاد العضو.')] });
    if (!isLinkWhitelisted(targetUser.id)) return m.reply({ embeds: [infoE('Not Whitelisted', `<@${targetUser.id}> ماشي فـ الـ whitelist.`)] });

    delete linkWhitelist.users[targetUser.id];
    saveJson(LINKWL_CFG_FILE, linkWhitelist);
    m.reply({ embeds: [okE('🗑️ Removed', `<@${targetUser.id}>`)] });
    return;
  }

  if (sub === 'list') {
    const entries = Object.entries(linkWhitelist.users);
    if (!entries.length) return m.reply({ embeds: [infoE('🔗 Link-Whitelist', 'ما كاين حتى واحد فـ الـ whitelist.')] });
    const list = entries.map(([id, data], i) => `**#${i+1}** <@${id}> *by ${data.addedBy}*`).join('\n');
    m.reply({ embeds: [infoE(`🔗 Link-Whitelisted (${entries.length})`).setDescription(list.slice(0, 4000))] });
    return;
  }

  m.reply({ embeds: [usageE('link', '!link <add|remove|list>', ['!link add @User 1235', '!link remove @User', '!link list'])] });
}};

/* ============================================================
 *  🤖 !wyh
 * ============================================================ */
commands.wyh = { cat: 'Security', desc: 'Whitelist a bot', usage: 'wyh <botUserId>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Admin+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('wyh', '!wyh <botUserId>', ['!wyh 123456789012345678'])] });

  const targetId = a[0].replace(/[<@!>]/g, '').trim();
  if (!/^\d{17,20}$/.test(targetId)) return m.reply({ embeds: [helpE('Invalid ID', 'الـ ID اللي عطيتي ماشي صحيح.', [
    { name: '💡 Tip', value: 'فعّل Developer Mode فـ Discord، كليكي بيمين على البوت، Copy User ID' }
  ])] });

  const user = await client.users.fetch(targetId).catch(()=>null);
  if (!user) return m.reply({ embeds: [helpE('User Not Found', 'ما لقيتش هاد المستعمل.')] });
  if (!user.bot) return m.reply({ embeds: [helpE('Not a Bot', 'هاد الحساب ماشي بوت.', [
    { name: '💡 Tip', value: 'إلا بغيتي تزيد عضو عادي للـ whitelist، استعمل `!link add`' }
  ])] });

  const modal = new ModalBuilder().setCustomId(`wyh_modal_${targetId}`).setTitle('Bot Whitelist — Enter Code');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('wyh_code').setLabel('Security Code').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(4).setMaxLength(20)
  ));
  return m.showModal(modal).catch(e => console.error('[WYH]', e));
}};

commands.unwyh = { cat: 'Security', desc: 'Remove bot from whitelist', usage: 'unwyh <botUserId>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Admin+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('unwyh', '!unwyh <botUserId>', ['!unwyh 123456789012345678'])] });
  const targetId = a[0].replace(/[<@!>]/g, '').trim();
  if (!isBotWhitelisted(targetId)) return m.reply({ embeds: [infoE('Not Whitelisted', `\`${targetId}\` ماشي فـ الـ whitelist.`)] });
  delete botWhitelist.bots[targetId];
  saveJson(BOTWL_CFG_FILE, botWhitelist);
  m.reply({ embeds: [okE('🗑️ Removed', `\`${targetId}\``)] });
}};

commands.wyhlist = { cat: 'Security', desc: 'List whitelisted bots', async run(m) {
  const entries = Object.entries(botWhitelist.bots);
  if (!entries.length) return m.reply({ embeds: [infoE('🤖 Bot Whitelist', 'ما كاين حتى بوت فـ الـ whitelist.')] });
  const list = entries.map(([id, data], i) => `**#${i+1}** <@${id}> *by ${data.addedBy}*`).join('\n');
  m.reply({ embeds: [infoE(`🤖 Whitelisted Bots (${entries.length})`).setDescription(list.slice(0, 4000))] });
}};

/* ============================================================
 *  🎲 !khtar
 * ============================================================ */
commands.khtar = { cat: 'Fun', desc: 'Pick a random winner', usage: 'khtar <messageID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Moderator+** باش تدير هاد الأمر.')] });

  if (!a[0]) return m.reply({ embeds: [usageE('khtar', '!khtar <messageID>', [
    '!khtar 1234567890123456789'
  ])] });

  const messageId = a[0].replace(/[<>&]/g, '').trim();
  if (!/^\d{17,20}$/.test(messageId)) return m.reply({ embeds: [helpE('Invalid Message ID', 'الـ ID اللي عطيتي ماشي صحيح.', [
    { name: '💡 Tip', value: 'فعّل Developer Mode، كليكي بيمين على الرسالة، Copy Message ID' }
  ])] });

  let targetMsg;
  try { targetMsg = await m.channel.messages.fetch(messageId); }
  catch {
    return m.reply({ embeds: [helpE('Message Not Found', 'ما لقيتش هاد الرسالة فـ هاد الروم.', [
      { name: '💡 Tip', value: 'تأكد أن الرسالة فـ نفس الروم اللي كتبتي فيه الأمر' }
    ])] });
  }

  if (targetMsg.reactions.cache.size === 0)
    return m.reply({ embeds: [helpE('No Reactions', 'هاد الرسالة ما فيها حتى react.', [
      { name: '💡 Tip', value: 'خلي الناس يديرو react 🎉 قبل ما تستعمل الأمر' }
    ])] });

  const reactors = new Set();
  for (const [, reaction] of targetMsg.reactions.cache) {
    let lastId, fetched;
    do {
      const options = { limit: 100 };
      if (lastId) options.after = lastId;
      fetched = await reaction.users.fetch(options).catch(() => null);
      if (!fetched || fetched.size === 0) break;
      fetched.forEach(u => { if (!u.bot) reactors.add(u.id); });
      lastId = fetched.last()?.id;
    } while (fetched && fetched.size === 100);
  }

  const participants = [...reactors];
  if (!participants.length) return m.reply({ embeds: [helpE('No Participants', 'ما كاين حتى واحد دار react.')] });

  const winnerId = participants[Math.floor(Math.random() * participants.length)];

  const pickMsg = await m.channel.send({ embeds: [
    new EmbedBuilder().setColor(C.warn).setTitle('🎲 Picking a random winner...')
      .setDescription(`**${participants.length}** participants detected.`)
      .setFooter({ text: 'Khobza SMP • Giveaway Pick' }).setTimestamp()
  ] });
  await new Promise(r => setTimeout(r, 2500));
  await pickMsg.delete().catch(()=>{});

  const winnerEmbed = new EmbedBuilder()
    .setColor(C.ok).setTitle('🎉 CONGRATULATIONS! 🎉')
    .setDescription(
      `## 🏆 Winner: <@${winnerId}>\n\n` +
      `**Congratulations, you won the giveaway!** 🎁\n\n` +
      `> Claim your prize by contacting a staff member.\n\n` +
      `**Total participants:** ${participants.length}\n` +
      `**Message:** [Jump](${targetMsg.url})`
    )
    .setFooter({ text: 'Khobza SMP • Giveaway Winner' }).setTimestamp();

  await m.channel.send({ content: `🎉 <@${winnerId}>`, embeds: [winnerEmbed] });
}};
commands.pick = commands.khtar;

/* ---------- VERIFY / APPLY PANELS ---------- */
commands.verifypanel = { cat: 'Verify', desc: 'Send verification panel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Admin**.')] });
  let ch = m.guild.channels.cache.get(VERIFY_CHANNEL_ID) || await m.guild.channels.fetch(VERIFY_CHANNEL_ID).catch(()=>null);
  if (!ch || typeof ch.isTextBased !== 'function' || !ch.isTextBased()) return m.reply({ embeds: [helpE('Channel Not Found', 'ما لقيتش روم التحقق.')] });
  const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle('✅ Verification')
    .setDescription('**Welcome to 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷!**\n\nClick the button below to verify.')
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Verification' }).setTimestamp();
  if (VERIFY_IMAGE) embed.setImage(VERIFY_IMAGE);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_button').setLabel('Verify').setEmoji('✅').setStyle(ButtonStyle.Success));
  await ch.send({ embeds: [embed], components: [row] });
  m.reply({ embeds: [okE('✅ Panel sent', `${ch}`)] }).catch(()=>{});
}};

commands.applypanel = { cat: 'Verify', desc: 'Send apply panel', usage: 'applypanel [imageURL]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Admin**.')] });
  const ch = m.guild.channels.cache.get(APPLY_STAFF_CHANNEL_ID) || await m.guild.channels.fetch(APPLY_STAFF_CHANNEL_ID).catch(()=>null);
  if (!ch || typeof ch.isTextBased !== 'function' || !ch.isTextBased()) return m.reply({ embeds: [helpE('Channel Not Found', 'ما لقيتش روم التقديم.')] });

  let imageURL = (a[0] || '').trim();
  if (!imageURL && m.attachments.size) imageURL = m.attachments.first().url;
  if (!imageURL) {
    await m.reply({ embeds: [infoE('🖼️ Send the image URL', 'صيفط رابط الصورة، أو ارفع صورة مع الأمر، أو كتب `cancel` باش تلغي.\nعندك **60 ثانية**.')] });
    const f = x => x.author.id === m.author.id && x.channel.id === m.channel.id;
    try {
      const c = await m.channel.awaitMessages({ filter: f, max: 1, time: 60000, errors: ['time'] });
      const replyMsg = c.first();
      if (replyMsg.content.toLowerCase().trim() === 'cancel') return m.reply({ embeds: [infoE('❌ Cancelled')] });
      if (replyMsg.attachments.size) imageURL = replyMsg.attachments.first().url;
      else { const u = replyMsg.content.match(/https?:\/\/\S+/i); if (u) imageURL = u[0]; }
      replyMsg.delete().catch(()=>{});
    } catch { return m.reply({ embeds: [helpE('Timed Out', 'ما عطيتيش الصورة.')] }); }
  }
  imageURL = imageURL.trim().replace(/[>),]+$/, '');
  if (!/^https?:\/\//i.test(imageURL)) return m.reply({ embeds: [helpE('Invalid URL', 'الرابط ماشي صحيح.')] });

  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('📝 Apply for Staff — 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷')
    .setDescription('**Want to become staff?**\n\n🎮 **Apply Staff Minecraft**\n💬 **Apply Staff Discord**\n\n**How it works:**\n1. Click a button below.\n2. The bot will DM you with questions.\n3. Answer all questions in DM.')
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Applications' }).setTimestamp();
  if (imageURL) embed.setImage(imageURL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_minecraft').setLabel('Apply Staff Minecraft').setEmoji('🎮').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('apply_discord').setLabel('Apply Staff Discord').setEmoji('💬').setStyle(ButtonStyle.Primary));
  try { await ch.send({ embeds: [embed], components: [row] }); m.reply({ embeds: [okE('✅ Panel sent', `${ch}`)] }).catch(()=>{}); }
  catch (e) { m.reply({ embeds: [errE('❌ Failed', e.message)] }); }
}};

/* ---------- MODERATION ---------- */
commands.ban = { cat: 'Moderation', desc: 'Ban a member', usage: 'ban <@user|userID> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Owner**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('ban', '!ban <@user|userID> [reason]', ['!ban @User spam', '!ban 123456789012345678 hacking'])] });
  const t = (await resolveMember(m, a[0])) || (await resolveMemberById(m.guild, a[0]));
  if (!t) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.', [{ name: '💡 Tip', value: 'جرب تعمل mention ولا تحط الـ User ID' }])] });
  if (!t.bannable) return m.reply({ embeds: [helpE('Cannot Ban', 'ما نقدرش ندير ban لهاد العضو (Role hierarchy).')] });
  const r = a.slice(1).join(' ') || 'No reason';
  await t.ban({ reason: `${m.author.tag} [${tier.label}]: ${r}` }).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('🔨 Banned').addFields(
    { name: 'User', value: `${t.user.tag}`, inline: true },
    { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
    { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, BAN_LOG_CHANNEL_ID, e);
}};
commands.unban = { cat: 'Moderation', desc: 'Unban a user', usage: 'unban <userID> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Owner**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('unban', '!unban <userID> [reason]', ['!unban 123456789012345678 appeal'])] });
  try { await m.guild.bans.remove(a[0], a.slice(1).join(' ') || undefined); m.reply({ embeds: [okE('🔓 Unbanned', `\`${a[0]}\``)] }); }
  catch (e) { m.reply({ embeds: [helpE('Failed to Unban', e.message)] }); }
}};
commands.kick = { cat: 'Moderation', desc: 'Kick a member', usage: 'kick <@user|userID> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canKick) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Admin+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('kick', '!kick <@user|userID> [reason]', ['!kick @User rule break'])] });
  const t = (await resolveMember(m, a[0])) || (await resolveMemberById(m.guild, a[0]));
  if (!t) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.')] });
  if (!t.kickable) return m.reply({ embeds: [helpE('Cannot Kick', 'Role hierarchy كيمنعني.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  await t.kick(`${m.author.tag} [${tier.label}]: ${r}`).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('👢 Kicked').addFields(
    { name: 'User', value: t.user.tag, inline: true },
    { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
    { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, KICK_LOG_CHANNEL_ID || GENERAL_LOG_CHANNEL_ID, e);
}};

/* ============================================================
 *  🔇 !mute — with HELPFUL guidance
 * ============================================================ */
commands.mute = { cat: 'Moderation', desc: 'Voice-mute a member', usage: 'mute <@user|userID> <minutes|perm> <reason>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [helpE('Permission Required', 'ما عندكش صلاحية تدير mute.', [
    { name: '💡 What you need', value: 'خاصك تكون فـ الـ Staff team' }
  ])] });

  // === Step 1: Target ===
  if (!a[0]) {
    return m.reply({ embeds: [usageE('mute', '!mute <@user|userID> <minutes|perm> <reason>', [
      '!mute @User 10 spam',
      '!mute 123456789012345678 5 bad words',
      '!mute @User perm raiding'
    ])] });
  }

  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) {
    return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.', [
      { name: '💡 How to fix', value: 'استعمل `@mention` ولا حط الـ **User ID** (17-20 رقم)' },
      { name: '📝 Example', value: '`!mute @User 10 spam` ولا `!mute 123456789012345678 10 spam`' }
    ])] });
  }

  // === Step 2: Duration ===
  if (!a[1]) {
    return m.reply({ embeds: [helpE('❓ Missing Duration', 'خاصك تحط **المدة** ديال الـ mute.', [
      { name: '⏱️ Format', value: '`5` = 5 دقائق (تقدر تزيد `m`, `h`, ولا `perm`)' },
      { name: '📝 Examples', value: `\`!mute ${target.user.tag} 10 spam\`\n\`!mute ${target.user.tag} 30 bad language\`\n\`!mute ${target.user.tag} perm raiding\`` },
      { name: '🔒 Your Limit', value: `بما أنك **${tier.label}**، الحدود ديالك هي: **${fmtMinutes(tier.maxMute)}** (Min: ${tier.minMute}m)` }
    ])] });
  }

  const durArg = a[1].trim().toLowerCase();
  const reason = a.slice(2).join(' ').trim();

  // === Step 3: Reason ===
  if (!reason) {
    return m.reply({ embeds: [helpE('❓ Missing Reason', 'خاصك تكتب **السبب** ديال الـ mute.', [
      { name: '📝 Example', value: `\`!mute ${target.user.tag} ${durArg} spam / bad language\`` },
      { name: '💡 Why', value: 'السبب كيتسجل فـ اللوجات باش تكون عندنا مرجعية' }
    ])] });
  }

  let minutes = 0, permanent = false;

  if (durArg === 'perm' || durArg === 'permanent') {
    if (tier.maxMute !== -1) {
      return m.reply({ embeds: [helpE('❌ Not Allowed', `**${tier.label}** ما عندوش صلاحية الـ mute الدائم.`, [
        { name: '🔒 Your Limit', value: `الحد الأقصى: **${fmtMinutes(tier.maxMute)}**` },
        { name: '💡 What to do', value: 'طلب من Admin أعلى إلا بغيتي مدة أطول' }
      ])] });
    }
    permanent = true;
  } else {
    minutes = parseInt(durArg, 10);

    if (isNaN(minutes)) {
      return m.reply({ embeds: [helpE('❌ Invalid Duration', 'المدة خاصها تكون رقم.', [
        { name: '⏱️ Format', value: '`10` = 10 دقائق (min)\n`60` = 60 دقيقة\n`perm` = Permanent' },
        { name: '📝 Example', value: `\`!mute ${target.user.tag} 10 spam\`` }
      ])] });
    }

    if (minutes < tier.minMute) {
      return m.reply({ embeds: [helpE('❌ Too Short', `الحد الأدنى ديال المدة هو **${tier.minMute} دقائق**.`, [
        { name: '📝 Example', value: `\`!mute ${target.user.tag} ${tier.minMute} spam\`` },
        { name: '💡 Why', value: 'باش الـ mute يكون فعّال' }
      ])] });
    }

    if (tier.maxMute !== -1 && minutes > tier.maxMute) {
      if (tier.rank === 1) {
        return m.reply({ embeds: [helpE('❌ Not Allowed', 'بما أنك **Helper**، الحد الأقصى هو **10 دقائق**.', [
          { name: '💡 What to do', value: 'طلب من Moderator ولا Admin إلا بغيتي مدة أطول' }
        ])] });
      }
      return m.reply({ embeds: [helpE('❌ Not Allowed', `الحد الأقصى لـ **${tier.label}** هو **${fmtMinutes(tier.maxMute)}**.`, [
        { name: '💡 What to do', value: 'طلب من رتبة أعلى إلا بغيتي مدة أطول' }
      ])] });
    }
  }

  // === Step 4: Target must be in voice ===
  if (!target.voice?.channel) {
    return m.reply({ embeds: [helpE('❌ Not in Voice', `${target.user.tag} ماشي فـ voice channel.`, [
      { name: '💡 Why', value: 'الـ mute هو **Voice Mute** — العضو خاصو يكون فـ روم صوتي' },
      { name: '🎯 What to do', value: 'خليه يدخل لـ voice channel وعاود جرب' }
    ])] });
  }

  // === Step 5: Hierarchy ===
  if (target.roles.highest.position >= m.guild.members.me.roles.highest.position) {
    return m.reply({ embeds: [helpE('❌ Hierarchy', 'الرول ديال هاد العضو فوق رول البوت.', [
      { name: '💡 What to do', value: 'خاصك تكون أعلى من البوت فـ الـ hierarchy' }
    ])] });
  }

  // === Execute ===
  try {
    await target.voice.setMute(true, `${m.author.tag}: ${reason}`);
    const key = `${m.guild.id}:${target.id}`;
    activeMutes[key] = {
      guildId: m.guild.id, userId: target.id,
      unmuteAt: permanent ? -1 : Date.now() + minutes * 60 * 1000,
      permanent, reason,
      modTag: m.author.tag, modTier: tier.label,
      channelId: target.voice.channel.id
    };
    saveJson(MUTE_CFG_FILE, activeMutes);
    scheduleUnmute(key);

    const e = okE('🔇 Voice Muted').addFields(
      { name: 'User', value: `${target.user.tag}`, inline: true },
      { name: 'Duration', value: permanent ? 'Permanent' : `${minutes} min`, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'Channel', value: `${target.voice.channel}`, inline: true },
      { name: 'Reason', value: reason });
    m.reply({ embeds: [e] });
    sendLog(m.guild, MUTE_LOG_CHANNEL_ID, e);
  } catch (err) {
    m.reply({ embeds: [errE('Failed', err.message)] });
  }
}};

commands.unmute = { cat: 'Moderation', desc: 'Unmute a member', usage: 'unmute <@user|userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون Staff.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('unmute', '!unmute <@user|userID>', ['!unmute @User'])] });
  const t = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!t) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.')] });
  if (!t.voice?.channel) return m.reply({ embeds: [helpE('Not in Voice', 'العضو ماشي فـ voice channel.')] });
  if (!t.voice.serverMute) return m.reply({ embeds: [helpE('Not Muted', 'العضو ماشي muted.')] });
  try {
    await t.voice.setMute(false, `Unmuted by ${m.author.tag}`);
    const key = `${m.guild.id}:${t.id}`;
    if (activeMutes[key]) { delete activeMutes[key]; saveJson(MUTE_CFG_FILE, activeMutes); if (muteTimers.has(key)) { clearTimeout(muteTimers.get(key)); muteTimers.delete(key); } }
    const e = okE('🔊 Unmuted').addFields(
      { name: 'User', value: t.user.tag, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true });
    m.reply({ embeds: [e] });
    sendLog(m.guild, MUTE_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};

commands.timeout = { cat: 'Moderation', desc: 'Timeout a member', usage: 'timeout <@user|userID> <minutes> <reason>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canTimeout) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Head Admin+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('timeout', '!timeout <@user|userID> <minutes> <reason>', ['!timeout @User 60 harassment'])] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.')] });
  if (!a[1]) return m.reply({ embeds: [usageE('timeout', `!timeout ${target.user.tag} <minutes> <reason>`, [`!timeout ${target.user.tag} 60 harassment`])] });
  const minutes = parseInt(a[1], 10);
  const reason = a.slice(2).join(' ').trim();
  if (isNaN(minutes) || minutes < 1) return m.reply({ embeds: [helpE('Invalid Duration', 'المدة خاصها تكون رقم.')] });
  if (!reason) return m.reply({ embeds: [usageE('timeout', `!timeout ${target.user.tag} ${minutes} <reason>`, [`!timeout ${target.user.tag} ${minutes} harassment`])] });
  if (!target.moderatable) return m.reply({ embeds: [helpE('Cannot Timeout', 'Role hierarchy.')] });
  try {
    await target.timeout(minutes * 60 * 1000, `${m.author.tag}: ${reason}`);
    const e = okE('⏳ Timed Out').addFields(
      { name: 'User', value: target.user.tag, inline: true },
      { name: 'Duration', value: `${minutes} min`, inline: true },
      { name: 'By', value: `${m.author.tag}`, inline: true },
      { name: 'Reason', value: reason });
    m.reply({ embeds: [e] }); sendLog(m.guild, TIMEOUT_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};
commands.untimeout = { cat: 'Moderation', desc: 'Remove timeout', usage: 'untimeout <@user|userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canTimeout) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Head Admin+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('untimeout', '!untimeout <@user|userID>', ['!untimeout @User'])] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.')] });
  if (!target.isCommunicationDisabled()) return m.reply({ embeds: [helpE('Not Timed Out', 'هاد العضو ماشي فـ timeout.')] });
  try {
    await target.timeout(null, `Untimeout by ${m.author.tag}`);
    m.reply({ embeds: [okE('✅ Timeout Removed', target.user.tag)] });
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};

commands.warn = { cat: 'Moderation', desc: 'Warn a member', usage: 'warn <@user|userID> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون Staff.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('warn', '!warn <@user|userID> [reason]', ['!warn @User spamming'])] });
  const t = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!t) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  const list = warnings.get(t.id) || []; list.push({ mod: m.author.tag, reason: r, ts: Date.now() }); warnings.set(t.id, list);
  m.reply({ embeds: [okE('⚠️ Warned').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'Total', value: `${list.length}`, inline: true }, { name: 'Reason', value: r })] });
}};
commands.warnings = { cat: 'Moderation', desc: 'List warnings', usage: 'warnings <@user|userID>', async run(m, a) {
  if (!a[0]) return m.reply({ embeds: [usageE('warnings', '!warnings <@user|userID>', ['!warnings @User'])] });
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [helpE('User Not Found', 'ما لقيتش هاد المستعمل.')] });
  const list = warnings.get(u.id) || [];
  if (!list.length) return m.reply({ embeds: [infoE('No Warnings', `${u.tag} ما عندو حتى warn.`)] });
  m.reply({ embeds: [infoE(`Warnings for ${u.tag}`).setDescription(list.map((w, i) => `**#${i+1}** — ${w.reason} *by ${w.mod}*`).join('\n'))] });
}};
commands.clearwarns = { cat: 'Moderation', desc: 'Clear warnings', usage: 'clearwarns <@user|userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Admin+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('clearwarns', '!clearwarns <@user|userID>', ['!clearwarns @User'])] });
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [helpE('User Not Found', 'ما لقيتش هاد المستعمل.')] });
  warnings.delete(u.id);
  m.reply({ embeds: [okE('✅ Cleared', u.tag)] });
}};
commands.purge = { cat: 'Moderation', desc: 'Delete messages', usage: 'purge <1-100>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون Staff.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('purge', '!purge <1-100>', ['!purge 50'])] });
  const n = Math.min(Math.max(parseInt(a[0]) || 0, 1), 100);
  const del = await m.channel.bulkDelete(n, true).catch(()=>null);
  if (del) m.channel.send({ embeds: [okE('🧹 Purged', `${del.size} messages.`)] }).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 4000));
}};
commands.clear = commands.purge;
commands.slowmode = { cat: 'Moderation', desc: 'Set slowmode', usage: 'slowmode <seconds>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون Staff.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('slowmode', '!slowmode <seconds>', ['!slowmode 10', '!slowmode 0 (to disable)'])] });
  const s = Math.min(Math.max(parseInt(a[0]) || 0, 0), 21600);
  await m.channel.setRateLimitPerUser(s).catch(()=>{});
  m.reply({ embeds: [okE('⏱️ Slowmode', `${s}s`)] });
}};
commands.lock = { cat: 'Moderation', desc: 'Lock a channel', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 2) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Moderator+**.')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: false }).catch(()=>{});
  m.reply({ embeds: [okE('🔒 Locked', `${ch}`)] });
}};
commands.unlock = { cat: 'Moderation', desc: 'Unlock a channel', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 2) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Moderator+**.')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: null }).catch(()=>{});
  m.reply({ embeds: [okE('🔓 Unlocked', `${ch}`)] });
}};
commands.hackban = { cat: 'Moderation', desc: 'Ban by user ID', usage: 'hackban <userID> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Owner**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('hackban', '!hackban <userID> [reason]', ['!hackban 123456789012345678 raiding'])] });
  const r = a.slice(1).join(' ') || 'Hackban';
  try {
    await m.guild.bans.create(a[0], { reason: `${m.author.tag}: ${r}` });
    m.reply({ embeds: [okE('🔨 Hackbanned', `\`${a[0]}\``)] });
  } catch (e) { m.reply({ embeds: [helpE('Failed', e.message)] }); }
}};

commands.move = { cat: 'Moderation', desc: 'Move a member to another voice channel', usage: 'move <@user|userID> <#voice|voiceID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون Staff.')] });
  if (!tier.canMove) return m.reply({ embeds: [helpE('Not Allowed', 'بما أنك **Helper**، ما عندكش صلاحية الـ move.', [
    { name: '💡 What to do', value: 'طلب من Moderator ولا Admin' }
  ])] });
  if (!a[0]) return m.reply({ embeds: [usageE('move', '!move <@user|userID> <#voice|voiceID>', ['!move @User #General', '!move 123456789012345678 987654321098765432'])] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.')] });
  if (!a[1]) return m.reply({ embeds: [usageE('move', `!move ${target.user.tag} <#voice|voiceID>`, [`!move ${target.user.tag} #General`])] });

  let destCh = m.mentions.channels.first();
  if (!destCh) {
    const chStr = a[1].trim().replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(chStr)) destCh = m.guild.channels.cache.get(chStr) || await m.guild.channels.fetch(chStr).catch(()=>null);
  }
  if (!destCh) return m.reply({ embeds: [helpE('Channel Not Found', 'ما لقيتش هاد الروم.', [
    { name: '💡 Tip', value: 'منشن الـ voice channel ولا حط الـ ID ديالو' }
  ])] });
  if (destCh.type !== ChannelType.GuildVoice && destCh.type !== ChannelType.GuildStageVoice) return m.reply({ embeds: [helpE('Not Voice', 'هاد الروم ماشي voice channel.')] });

  const fromCh = target.voice?.channel;
  if (!fromCh) return m.reply({ embeds: [helpE('Not in Voice', `${target.user.tag} ماشي فـ voice channel.`)] });
  if (fromCh.id === destCh.id) return m.reply({ embeds: [helpE('Already There', 'العضو ديجا فـ هاد الروم.')] });
  if (target.roles.highest.position >= m.guild.members.me.roles.highest.position) return m.reply({ embeds: [helpE('Hierarchy', 'ما نقدرش نحرك هاد العضو.')] });

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

commands.nickname = { cat: 'Members', desc: 'Change a nickname', usage: 'nickname <@user|userID> <name>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canNickname) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Co-Owner+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('nickname', '!nickname <@user|userID> <name>', ['!nickname @User NewName'])] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.')] });
  if (a.length < 2) return m.reply({ embeds: [usageE('nickname', `!nickname ${target.user.tag} <name>`, [`!nickname ${target.user.tag} NewName`])] });
  const nickname = a.slice(1).join(' ').trim().slice(0, 32);
  if (target.roles.highest.position >= m.guild.members.me.roles.highest.position) return m.reply({ embeds: [helpE('Hierarchy', 'ما نقدرش نبدل الاسم.')] });
  const oldNick = target.nickname || target.user.username;
  try {
    await target.setNickname(nickname, `Changed by ${m.author.tag}`);
    const e = okE('✏️ Nickname Changed').addFields(
      { name: 'User', value: target.user.tag, inline: true },
      { name: 'Before', value: oldNick, inline: true },
      { name: 'After', value: nickname, inline: true });
    m.reply({ embeds: [e] }); sendLog(m.guild, NICKNAME_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};
commands.resetnick = { cat: 'Members', desc: 'Reset nickname', usage: 'resetnick <@user|userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canNickname) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Co-Owner+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('resetnick', '!resetnick <@user|userID>', ['!resetnick @User'])] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [helpE('Member Not Found', 'ما لقيتش هاد العضو.')] });
  const oldNick = target.nickname || target.user.username;
  try {
    await target.setNickname(null, `Reset by ${m.author.tag}`);
    m.reply({ embeds: [okE('↩️ Reset', `${oldNick} → ${target.user.username}`)] });
  } catch (err) { m.reply({ embeds: [errE('Failed', err.message)] }); }
}};

/* ---------- GIVEAWAY ---------- */
commands.giveaway = { cat: 'Fun', desc: 'Start a giveaway', usage: 'giveaway <time> <winners> <prize> [imageURL]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Moderator+**.')] });
  if (a.length < 3) return m.reply({ embeds: [usageE('giveaway', '!giveaway <time> <winners> <prize> [imageURL]', [
    '!giveaway 10m 1 Nitro',
    '!giveaway 1h 3 $50 Gift Card',
    '!giveaway 1d 1 Rank https://i.imgur.com/xxx.png'
  ])] });
  const durationMs = parseDuration(a[0]);
  if (!durationMs) return m.reply({ embeds: [helpE('Invalid Time', 'صيغة الوقت ماشي صحيحة.', [
    { name: '⏱️ Format', value: '`10s` (10 seconds)\n`5m` (5 minutes)\n`1h` (1 hour)\n`1d` (1 day)\n`1w` (1 week)' }
  ])] });
  const winners = parseInt(a[1], 10);
  if (isNaN(winners) || winners < 1 || winners > 50) return m.reply({ embeds: [helpE('Invalid Winners', 'عدد الفائزين خاصو يكون بين 1 و 50.')] });
  let rest = a.slice(2), imageURL = '';
  if (rest.length > 1 && /^https?:\/\/\S+/i.test(rest[rest.length - 1])) imageURL = rest.pop();
  if (!imageURL && m.attachments.size) imageURL = m.attachments.first().url;
  const prize = rest.join(' ').trim();
  if (!prize) return m.reply({ embeds: [helpE('Missing Prize', 'خاصك تكتب الجائزة.')] });
  const gw = { guildId: m.guild.id, channelId: m.channel.id, hostId: m.author.id, prize, winners, imageURL, endsAt: Date.now() + durationMs, ended: false, entries: [], winnerIds: [] };
  let msg;
  try { msg = await m.channel.send({ embeds: [buildGiveawayEmbed(gw, false)] }); await msg.react('🎉'); }
  catch (e) { return m.reply({ embeds: [errE('Failed', e.message)] }); }
  activeGiveaways[msg.id] = gw;
  saveJson(GIVEAWAY_CFG_FILE, activeGiveaways);
  giveawayTimers.set(msg.id, setTimeout(() => endGiveaway(msg.id).catch(()=>{}), durationMs));
  m.reply({ embeds: [okE('✅ Giveaway Started!', `**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends in:** ${fmtDur(durationMs)}\n**ID:** \`${msg.id}\``)] }).catch(()=>{});
}};
commands.gend = { cat: 'Fun', desc: 'End a giveaway', usage: 'gend <messageID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Moderator+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('gend', '!gend <messageID>', ['!gend 1234567890123456789'])] });
  const id = a[0].trim();
  const gw = activeGiveaways[id]; if (!gw) return m.reply({ embeds: [helpE('Not Found', 'ما لقيتش هاد الـ giveaway.')] });
  await endGiveaway(id);
  m.reply({ embeds: [okE('✅ Ended', `\`${id}\``)] }).catch(()=>{});
}};

/* ---------- MEMBERS / UTILITY ---------- */
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
    { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
    { name: 'Members', value: `${g.memberCount}`, inline: true },
    { name: 'Channels', value: `${g.channels.cache.size}`, inline: true },
    { name: 'Roles', value: `${g.roles.cache.size}`, inline: true },
    { name: 'ID', value: g.id })] });
}};
commands.avatar = { cat: 'Members', desc: 'Show avatar', usage: 'avatar [@user|userID]', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  m.reply({ embeds: [infoE(`🖼️ ${u.tag}`).setImage(u.displayAvatarURL({ size: 1024 }))] });
}};
commands.membercount = { cat: 'Members', desc: 'Member count', async run(m) { m.reply({ embeds: [infoE('👥', `${m.guild.memberCount}`)] }); }};
commands.roles = { cat: 'Members', desc: 'List all roles', async run(m) {
  m.reply({ embeds: [infoE('🏷️ Roles').setDescription(m.guild.roles.cache.sort((a,b)=>b.position-a.position).map(r => r.toString()).join(' ').slice(0, 4000))] });
}};
commands.afk = { cat: 'Members', desc: 'Set AFK', usage: 'afk [reason]', async run(m, a) {
  afks.set(m.author.id, a.join(' ') || 'AFK');
  m.reply({ embeds: [okE('💤 AFK', afks.get(m.author.id))] });
}};
commands.afklist = { cat: 'Members', desc: 'List AFK users', async run(m) {
  if (!afks.size) return m.reply({ embeds: [infoE('💤 AFK List', 'ما كاين حتى واحد AFK.')] });
  m.reply({ embeds: [infoE('💤 AFK List').setDescription([...afks.entries()].map(([id, r]) => `<@${id}> — ${r}`).join('\n'))] });
}};
commands.whois = commands.userinfo;

commands.help = { cat: 'Utility', desc: 'Commands list', usage: 'help [command]', async run(m, a) {
  if (a[0]) {
    const c = commands[a[0].toLowerCase()];
    if (!c) return m.reply({ embeds: [helpE('Command Not Found', `\`!${a[0]}\` ما لقيتوش.`, [
      { name: '💡 Tip', value: 'جرب `!help` باش تشوف اللائحة الكاملة' }
    ])] });
    return m.reply({ embeds: [infoE(`📖 ${PREFIX}${a[0]}`).addFields(
      { name: 'Category', value: c.cat, inline: true },
      { name: 'Usage', value: c.usage || `${PREFIX}${a[0]}`, inline: true },
      { name: 'Description', value: c.desc })] });
  }
  const cats = {};
  for (const [n, c] of Object.entries(commands)) (cats[c.cat] = cats[c.cat] || []).push(`\`${PREFIX}${n}\``);
  const e = infoE('📖 Commands');
  for (const [cat, list] of Object.entries(cats)) e.addFields({ name: cat, value: list.join(', ').slice(0, 1020) });
  m.reply({ embeds: [e] });
}};
commands.ping = { cat: 'Utility', desc: 'Show latency', async run(m) {
  const s = await m.reply('🏓...');
  s.edit({ content: null, embeds: [okE('🏓 Pong!', `Gateway: **${client.ws.ping}ms**\nRoundtrip: **${s.createdTimestamp - m.createdTimestamp}ms**`)] });
}};
commands.uptime = { cat: 'Utility', desc: 'Show uptime', async run(m) { m.reply({ embeds: [infoE('⏱️', fmtDur(client.uptime))] }); }};
commands.botinfo = { cat: 'Utility', desc: 'Bot info', async run(m) {
  m.reply({ embeds: [infoE('🤖 Bot').addFields(
    { name: 'Tag', value: client.user.tag, inline: true },
    { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
    { name: 'Uptime', value: fmtDur(client.uptime), inline: true },
    { name: 'Node', value: process.version, inline: true })] });
}};
commands.poll = { cat: 'Utility', desc: 'Create a poll', usage: 'poll Q? | a | b', async run(m, a) {
  const [q, ...opts] = a.join(' ').split('|').map(s => s.trim());
  if (!q || !opts.length) return m.reply({ embeds: [usageE('poll', '!poll Question? | opt1 | opt2', ['!poll Pizza? | Yes | No'])] });
  const nums = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const msg = await m.channel.send({ embeds: [infoE(`📊 ${q}`).setDescription(opts.map((o, i) => `${nums[i]} ${o}`).join('\n'))] });
  for (let i = 0; i < Math.min(opts.length, 10); i++) await msg.react(nums[i]);
}};
commands.calculate = { cat: 'Utility', desc: 'Calculate expression', usage: 'calculate 2+2', async run(m, a) {
  const e = a.join(' ').replace(/[^0-9+\-*/(). %]/g, '');
  if (!e) return m.reply({ embeds: [usageE('calculate', '!calculate <expression>', ['!calculate 2+2*3', '!calculate (10+5)/3'])] });
  try { m.reply({ embeds: [okE('🧮 Result', `\`${e}\` = **${Function(`"use strict"; return (${e});`)()}**`)] }); }
  catch { m.reply({ embeds: [helpE('Invalid Expression', 'الصيغة ماشي صحيحة.')] }); }
}};
commands.choose = { cat: 'Utility', desc: 'Choose random from list', usage: 'choose a b c', async run(m, a) {
  if (a.length < 2) return m.reply({ embeds: [usageE('choose', '!choose <option1> <option2> ...', ['!choose pizza burger tacos'])] });
  m.reply({ embeds: [okE('🎲 I choose...', a[Math.floor(Math.random()*a.length)])] });
}};
commands.coinflip = { cat: 'Utility', desc: 'Flip a coin', async run(m) { m.reply({ embeds: [okE('🪙 Coin', Math.random() < 0.5 ? 'Heads' : 'Tails')] }); }};
commands['8ball'] = { cat: 'Utility', desc: 'Ask the magic 8-ball', usage: '8ball <question>', async run(m, a) {
  const ans = ['Yes.','No.','Maybe.','Definitely.','Absolutely not.','Ask again.','I doubt it.','For sure!','Unlikely.'];
  m.reply({ embeds: [infoE('🎱 8-Ball', `❓ ${a.join(' ') || '...'}\n💬 **${ans[Math.floor(Math.random()*ans.length)]}**`)] });
}};

/* ---------- SMP ---------- */
commands.ip = { cat: 'SMP', desc: 'Show server IP', async run(m) { m.reply({ embeds: [infoE('🖥️ Server IP', `\`\`\`${MC_SERVER_IP}\`\`\``)] }); }};
commands.serverstatus = { cat: 'SMP', desc: 'MC server status', async run(m) {
  try {
    const r = await fetch(`https://api.mcsrvstat.us/3/${MC_SERVER_IP}`).then(x => x.json());
    if (!r.online) return m.reply({ embeds: [errE('Offline', 'السيرفر ماشي online دابا.')] });
    m.reply({ embeds: [infoE('🎮 Status').addFields({ name: 'Players', value: `${r.players?.online ?? 0}/${r.players?.max ?? 0}`, inline: true }, { name: 'Version', value: r.version || '?', inline: true })] });
  } catch { m.reply({ embeds: [errE('API Error', 'ما قدرتش نجيب المعلومات.')] }); }
}};
commands.rules = { cat: 'SMP', desc: 'Show SMP rules', async run(m) { m.reply({ embeds: [infoE('📜 Rules', '1. Be respectful.\n2. No hacks.\n3. No griefing.\n4. No spam.\n5. Follow staff instructions.')] }); }};
commands.store = { cat: 'SMP', desc: 'Show store link', async run(m) { m.reply({ embeds: [infoE('🛒 Store', MC_STORE_URL)] }); }};

/* ---------- VOICE ---------- */
commands.addvoice = { cat: 'Voice', desc: 'Join a voice channel 24/7', usage: 'addvoice <voiceChannelID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 7) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Co-Owner+**.')] });
  if (!a[0]) return m.reply({ embeds: [usageE('addvoice', '!addvoice <voiceChannelID>', ['!addvoice 123456789012345678'])] });
  const id = a[0].replace(/[<#>]/g, '').trim();
  if (!/^\d{17,20}$/.test(id)) return m.reply({ embeds: [helpE('Invalid ID', 'الـ ID ماشي صحيح.')] });
  const ch = m.guild.channels.cache.get(id) || await m.guild.channels.fetch(id).catch(()=>null);
  if (!ch) return m.reply({ embeds: [helpE('Channel Not Found', 'ما لقيتش هاد الروم.')] });
  if (ch.type !== ChannelType.GuildVoice && ch.type !== ChannelType.GuildStageVoice) return m.reply({ embeds: [helpE('Not Voice', 'هاد الروم ماشي voice channel.')] });
  try { await connectToVoice(m.guild, ch.id); voiceConfig[m.guild.id] = ch.id; saveJson(VOICE_CFG_FILE, voiceConfig); m.reply({ embeds: [okE('🔊 Connected', `${ch}`)] }); }
  catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.removevoice = { cat: 'Voice', desc: 'Disconnect from voice', async run(m) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 7) return m.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Co-Owner+**.')] });
  const conn = getVoiceConnection(m.guild.id);
  if (conn) { try { conn.destroy(); } catch {} }
  if (reconnectTimers.has(m.guild.id)) { clearTimeout(reconnectTimers.get(m.guild.id)); reconnectTimers.delete(m.guild.id); }
  delete voiceConfig[m.guild.id]; saveJson(VOICE_CFG_FILE, voiceConfig);
  m.reply({ embeds: [okE('🔇 Disconnected')] });
}};

/* ============================================================
 *  🎫 CREATE TICKET
 * ============================================================ */
async function createTicket(guild, user, typeKey) {
  const type = TICKET_TYPES[typeKey];
  if (!type) return { ok: false, reason: 'Invalid type' };

  for (const [chId, t] of Object.entries(ticketConfig.tickets)) {
    if (t.userId === user.id && t.type === typeKey && t.status === 'open') {
      const existingCh = guild.channels.cache.get(chId);
      if (existingCh) return { ok: false, reason: 'already_open', channel: existingCh };
      else { delete ticketConfig.tickets[chId]; saveJson(TICKET_CFG_FILE, ticketConfig); }
    }
  }

  let category = null;
  if (TICKET_CATEGORY_ID && /^\d{17,20}$/.test(String(TICKET_CATEGORY_ID).trim())) {
    category = guild.channels.cache.get(String(TICKET_CATEGORY_ID).trim());
    if (!category) category = await guild.channels.fetch(String(TICKET_CATEGORY_ID).trim()).catch(()=>null);
  }

  let newChannel;
  try {
    newChannel = await guild.channels.create({
      name: `ticket-${typeKey}-${user.username}`.slice(0, 100).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      type: ChannelType.GuildText,
      parent: category || undefined,
      topic: `Ticket by ${user.tag} • Type: ${type.title}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: TICKET_SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory] }
      ]
    });
  } catch (e) { return { ok: false, reason: `Failed: ${e.message}` }; }

  ticketConfig.tickets[newChannel.id] = {
    userId: user.id, username: user.tag, type: typeKey,
    typeLabel: type.label, createdAt: Date.now(), claimedBy: null, status: 'open'
  };
  saveJson(TICKET_CFG_FILE, ticketConfig);

  const welcome = new EmbedBuilder()
    .setColor(type.color).setTitle(`${type.emoji} ${type.title}`)
    .setDescription(
      `مرحبا <@${user.id}>! 👋\n\n` +
      `شكراً على تواصلك معنا. **الـ Staff** غادي يجاوبك قريباً.\n\n` +
      `**Type:** \`${type.title}\`\n` +
      `**Description:** ${type.desc}\n` +
      `**Opened:** <t:${Math.floor(Date.now()/1000)}:R>\n\n` +
      `> 🌸 Please describe your issue in detail so we can help you faster.`
    )
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Support System' }).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('📌').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );

  try {
    await newChannel.send({ content: `<@${user.id}> <@&${TICKET_SUPPORT_ROLE_ID}>`, embeds: [welcome], components: [row] });
  } catch (e) { console.error('[TICKET] welcome:', e.message); }

  if (TICKET_LOG_CHANNEL_ID) {
    sendLog(guild, TICKET_LOG_CHANNEL_ID,
      infoE('🎫 Ticket Opened').addFields(
        { name: 'User', value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
        { name: 'Type', value: `\`${type.label}\``, inline: true },
        { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
      ));
  }
  return { ok: true, channel: newChannel };
}

/* ============================================================
 *                     EVENT: READY
 * ============================================================ */
client.once('ready', async () => {
  console.log('==============================');
  console.log(`[READY] Logged in as ${client.user.tag}`);
  console.log(`[READY] Guilds: ${client.guilds.cache.size}`);
  console.log(`[READY] Staff roles: ${STAFF_ROLES.length}`);
  console.log(`[READY] Ticket Support Role: ${TICKET_SUPPORT_ROLE_ID}`);
  console.log(`[READY] Ticket Log: ${TICKET_LOG_CHANNEL_ID}`);
  console.log('==============================');
  client.user.setActivity('𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 🍞', { type: ActivityType.Watching });
  await restoreAllVoiceConnections();
  await restoreMutes();
  await restoreGiveaways();
});

/* ============================================================
 *  EVENT: MEMBER JOIN
 * ============================================================ */
client.on('guildMemberAdd', async member => {
  console.log(`[JOIN] ➕ ${member.user.tag} — Bot: ${member.user.bot}`);
  if (member.user.bot) {
    if (member.id === client.user.id) return;
    if (isBotWhitelisted(member.id)) { console.log(`[ANTI-BOT] Whitelisted: ${member.user.tag}`); return; }
    try {
      await member.ban({ reason: 'Unauthorized bot.', deleteMessageSeconds: 3600 });
      sendLog(member.guild, BAN_LOG_CHANNEL_ID, errE('🔨 Unauthorized Bot Banned').addFields(
        { name: 'Bot', value: `${member.user.tag} (\`${member.id}\`)`, inline: true }));
    } catch (err) { console.error('[ANTI-BOT] Failed:', err.message); }
    return;
  }
  if (UNVERIFIED_ROLE_ID) {
    try { await member.roles.add(UNVERIFIED_ROLE_ID, 'Auto role'); } catch (e) {}
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
      if (code !== BOT_WHITELIST_CODE) return interaction.reply({ embeds: [helpE('Invalid Code', 'الكود اللي دخلتي ماشي صحيح.')], ephemeral: true });
      const tier = getStaffTier(interaction.member);
      if (!tier || tier.rank < 3) return interaction.reply({ embeds: [helpE('Permission Required', 'خاصك تكون **Admin+**.')], ephemeral: true });
      const user = await client.users.fetch(targetId).catch(()=>null);
      if (!user || !user.bot) return interaction.reply({ embeds: [helpE('Not a Bot', 'هاد الحساب ماشي بوت.')], ephemeral: true });
      if (isBotWhitelisted(targetId)) return interaction.reply({ embeds: [infoE('Already Whitelisted')], ephemeral: true });
      botWhitelist.bots[targetId] = { addedBy: interaction.user.tag, addedById: interaction.user.id, addedAt: Date.now() };
      saveJson(BOTWL_CFG_FILE, botWhitelist);
      await interaction.reply({ embeds: [okE('✅ Bot Whitelisted', `<@${targetId}> added.`)], ephemeral: true });
      return;
    }
    return;
  }

  if (!interaction.isButton()) return;
  const btnId = interaction.customId;

  /* === TICKET CREATE === */
  if (btnId.startsWith('ticket_') && !['ticket_close', 'ticket_claim'].includes(btnId)) {
    const typeKey = btnId.replace('ticket_', '');
    if (!TICKET_TYPES[typeKey]) return interaction.reply({ embeds: [helpE('Invalid Type', 'نوع التيكت ماشي صحيح.')], ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    const result = await createTicket(interaction.guild, interaction.user, typeKey);

    if (!result.ok) {
      if (result.reason === 'already_open') {
        return interaction.editReply({ embeds: [helpE('Already Open', `عندك تيكت مفتوح ديجا: ${result.channel}`)] });
      }
      return interaction.editReply({ embeds: [errE('Failed', result.reason)] });
    }
    return interaction.editReply({ embeds: [okE('✅ Ticket Created', `Your ticket: ${result.channel}`)] });
  }

  if (btnId === 'ticket_close') {
    const ticket = ticketConfig.tickets[interaction.channel.id];
    if (!ticket) return interaction.reply({ embeds: [helpE('Not a Ticket', 'هاد الروم ماشي تيكت.')], ephemeral: true });
    const tier = getStaffTier(interaction.member);
    const isOwner = ticket.userId === interaction.user.id;
    const isTicketStaff = interaction.member.roles.cache.has(TICKET_SUPPORT_ROLE_ID);
    if (!isOwner && !tier && !isTicketStaff) return interaction.reply({ embeds: [helpE('Permission', 'غير صاحب التيكت ولا Staff.')], ephemeral: true });

    await interaction.reply({ embeds: [
      new EmbedBuilder().setColor(0xed4245).setTitle('🔒 Closing Ticket')
        .setDescription(`This ticket will be closed in **5 seconds** by ${interaction.user}.`)
        .setTimestamp()
    ] });

    if (TICKET_LOG_CHANNEL_ID) {
      sendLog(interaction.guild, TICKET_LOG_CHANNEL_ID,
        errE('🔒 Ticket Closed').addFields(
          { name: 'Ticket', value: `${interaction.channel.name}`, inline: true },
          { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
          { name: 'Closed by', value: `${interaction.user.tag}`, inline: true }
        ));
    }
    delete ticketConfig.tickets[interaction.channel.id];
    saveJson(TICKET_CFG_FILE, ticketConfig);
    setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
    return;
  }

  if (btnId === 'ticket_claim') {
    const ticket = ticketConfig.tickets[interaction.channel.id];
    if (!ticket) return interaction.reply({ embeds: [helpE('Not a Ticket', 'هاد الروم ماشي تيكت.')], ephemeral: true });
    const tier = getStaffTier(interaction.member);
    const isTicketStaff = interaction.member.roles.cache.has(TICKET_SUPPORT_ROLE_ID);
    if (!tier && !isTicketStaff) return interaction.reply({ embeds: [helpE('Staff Only', 'غير الـ Staff يقدر ياخذ التيكت.')], ephemeral: true });

    if (ticket.claimedBy) {
      return interaction.reply({ embeds: [infoE('Already Claimed', `هاد التيكت ماخوذ من طرف <@${ticket.claimedBy}>.`)], ephemeral: true });
    }

    ticket.claimedBy = interaction.user.id;
    saveJson(TICKET_CFG_FILE, ticketConfig);

    await interaction.reply({ embeds: [
      new EmbedBuilder().setColor(0x57f287).setTitle('📌 Ticket Claimed')
        .setDescription(`Claimed by ${interaction.user}.\n\n**Type:** \`${ticket.typeLabel}\`\n**User:** <@${ticket.userId}>`)
        .setTimestamp()
    ] });

    if (TICKET_LOG_CHANNEL_ID) {
      sendLog(interaction.guild, TICKET_LOG_CHANNEL_ID,
        okE('📌 Ticket Claimed').addFields(
          { name: 'Ticket', value: `${interaction.channel.name}`, inline: true },
          { name: 'Claimed by', value: `${interaction.user.tag}`, inline: true }
        ));
    }
    return;
  }

  /* === VERIFY === */
  if (btnId === 'verify_button') {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(VERIFIED_ROLE_ID)) return interaction.reply({ embeds: [infoE('Already Verified')], ephemeral: true });
      await member.roles.add(VERIFIED_ROLE_ID, 'Verified');
      if (UNVERIFIED_ROLE_ID && member.roles.cache.has(UNVERIFIED_ROLE_ID))
        await member.roles.remove(UNVERIFIED_ROLE_ID, 'Verified').catch(()=>{});
      await interaction.reply({ embeds: [okE('✅ Verified!')], ephemeral: true });
    } catch (e) { if (!interaction.replied) interaction.reply({ embeds: [errE('Error', e.message)], ephemeral: true }).catch(()=>{}); }
    return;
  }

  /* === APPLY === */
  if (btnId === 'apply_minecraft' || btnId === 'apply_discord') {
    const userId = interaction.user.id;
    const isMc = btnId === 'apply_minecraft';
    const type = isMc ? 'Minecraft Staff' : 'Discord Staff';
    if (dmApplications.has(userId)) return interaction.reply({ embeds: [infoE('Already Applying', 'عندك application مفتوحة.')], ephemeral: true });
    try {
      const dm = await interaction.user.createDM();
      dmApplications.set(userId, { type, step: 0, answers: {}, guildId: interaction.guild.id });
      await interaction.reply({ embeds: [okE('📩 DM Sent', 'تحقق من الـ DMs!')], ephemeral: true });
      await dm.send({ embeds: [
        new EmbedBuilder().setColor(C.info).setTitle(`📝 Application — ${type}`)
          .setDescription(`Welcome! **${APPLY_QUESTIONS.length}** questions.\nType \`cancel\` to abort.\n\n**Q1/${APPLY_QUESTIONS.length}:** ${APPLY_QUESTIONS[0].q}`)
          .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷' }).setTimestamp()
      ] });
    } catch (e) { dmApplications.delete(userId); return interaction.reply({ embeds: [helpE('Cannot DM', 'خاصك تفتح الـ DMs من إعدادات السيرفر.')], ephemeral: true }); }
    return;
  }

  if (btnId.startsWith('apply_accept_')) {
    const tier = getStaffTier(interaction.member);
    if (!tier || tier.rank < 3) return interaction.reply({ embeds: [helpE('Permission', 'خاصك تكون Admin+.')], ephemeral: true });
    const userId = btnId.replace('apply_accept_', '');
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (user) await user.send({ embeds: [okE('🎉 Congratulations!', 'Accepted!')] }).catch(()=>{});
      await interaction.reply({ embeds: [okE('✅ Accepted', `<@${userId}>`)] });
      try { await interaction.message.edit({ components: [] }); } catch {}
    } catch (e) {}
    return;
  }

  if (btnId.startsWith('apply_reject_')) {
    const tier = getStaffTier(interaction.member);
    if (!tier || tier.rank < 3) return interaction.reply({ embeds: [helpE('Permission', 'خاصك تكون Admin+.')], ephemeral: true });
    const userId = btnId.replace('apply_reject_', '');
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (user) await user.send({ embeds: [errE('❌ Rejected', 'Your application has been rejected.')] }).catch(()=>{});
      await interaction.reply({ embeds: [errE('❌ Rejected', `<@${userId}>`)] });
      try { await interaction.message.edit({ components: [] }); } catch {}
    } catch (e) {}
    return;
  }
});

/* ============================================================
 *             EVENT: GIVEAWAY REACTIONS
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
  } catch (e) {}
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
  } catch (e) {}
});

/* ============================================================
 *  🎯 EVENT: VOICE STATE UPDATE
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

  if (!newState.guild) return;
  if (!newState.member || newState.member.user.bot) return;

  /* Manual Move */
  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    setTimeout(async () => {
      try {
        const exec = await auditExec(newState.guild, AuditLogEvent.MemberMove, newState.id);
        if (exec && exec.id !== client.user.id) {
          const e = infoE('➡️ Member Moved (Manual)').addFields(
            { name: 'Member', value: `${newState.member.user.tag} (\`${newState.member.id}\`)`, inline: true },
            { name: 'By', value: `${exec.tag} (\`${exec.id}\`)`, inline: true },
            { name: 'From', value: oldState.channel ? `${oldState.channel}` : '*unknown*', inline: true },
            { name: 'To', value: newState.channel ? `${newState.channel}` : '*unknown*', inline: true }
          );
          sendLog(newState.guild, MANUAL_MOVE_LOG_CHANNEL_ID, e);
        }
      } catch (e) {}
    }, 1500);
  }

  /* Manual Mute */
  if (!oldState.serverMute && newState.serverMute) {
    setTimeout(async () => {
      try {
        const exec = await auditExec(newState.guild, AuditLogEvent.MemberUpdate, newState.id);
        if (exec && exec.id !== client.user.id) {
          const e = errE('🔇 Member Voice Muted (Manual)').addFields(
            { name: 'Member', value: `${newState.member.user.tag} (\`${newState.member.id}\`)`, inline: true },
            { name: 'By', value: `${exec.tag} (\`${exec.id}\`)`, inline: true },
            { name: 'Channel', value: newState.channel ? `${newState.channel}` : '*unknown*', inline: true }
          );
          sendLog(newState.guild, MANUAL_MUTE_LOG_CHANNEL_ID, e);
        }
      } catch (e) {}
    }, 1500);
  }

  /* Manual Unmute */
  if (oldState.serverMute && !newState.serverMute) {
    setTimeout(async () => {
      try {
        const exec = await auditExec(newState.guild, AuditLogEvent.MemberUpdate, newState.id);
        if (exec && exec.id !== client.user.id) {
          const e = okE('🔊 Member Voice Unmuted (Manual)').addFields(
            { name: 'Member', value: `${newState.member.user.tag}`, inline: true },
            { name: 'By', value: `${exec.tag}`, inline: true }
          );
          sendLog(newState.guild, MANUAL_MUTE_LOG_CHANNEL_ID, e);
        }
      } catch (e) {}
    }, 1500);
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
  const isManual = exec && exec.id !== client.user.id;
  const e = errE(isManual ? '🔨 Member Banned (Manual)' : '🔨 Member Banned').addFields(
    { name: 'User', value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
    { name: 'By', value: exec ? `${exec.tag} (\`${exec.id}\`)` : 'Unknown', inline: true },
    { name: 'Reason', value: ban.reason || 'None', inline: false }
  );
  const channel = isManual ? MANUAL_BAN_LOG_CHANNEL_ID : BAN_LOG_CHANNEL_ID;
  sendLog(ban.guild, channel, e);
});

/* ============================================================
 *             EVENT: MESSAGE CREATE
 * ============================================================ */
client.on('messageCreate', async message => {
  if (message.author.bot) return;

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
      if (!resultsCh || typeof resultsCh.isTextBased !== 'function' || !resultsCh.isTextBased()) return;
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
        .setDescription(nextQ.q).setFooter({ text: 'Type "cancel"' }).setTimestamp()
    ] }).catch(()=>{});
    return;
  }

  /* Anti-Link */
  if (!isLinkWhitelisted(message.author.id)) {
    const linkFound = containsAnyLink(message.content);
    if (linkFound) {
      await message.delete().catch(() => {});
      const warning = new EmbedBuilder()
        .setColor(0xff0000).setTitle('# ry7 t9wd lah yn3l tbon mok')
        .setDescription(
          `# ry7 t9wd lah yn3l tbon mok\n\n` +
          `## ${message.author} — الروابط ممنوعة فالسيرفر! 🚫\n\n` +
          `**Link detected:**\n\`\`\`${linkFound.slice(0, 100)}\`\`\``
        )
        .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
        .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Anti-Link' }).setTimestamp();
      message.channel.send({ content: `<@${message.author.id}>`, embeds: [warning] })
        .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 15000)).catch(() => {});
      return;
    }
  }

  if (afks.has(message.author.id) && !message.content.startsWith(PREFIX + 'afk')) {
    afks.delete(message.author.id);
    message.reply({ embeds: [okE('👋 Welcome back')] }).then(x => setTimeout(() => x.delete().catch(()=>{}), 5000)).catch(()=>{});
  }

  const usr = eco(message.author.id); usr.msgs += 1;

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const name = args.shift().toLowerCase();

  /* ⭐ Special: !roll all info */
  if (name === 'roll' && args[0]?.toLowerCase() === 'all' && args[1]?.toLowerCase() === 'info') {
    return commands.staffinfo.run(message, []);
  }
  if (name === 'role' && args[0]?.toLowerCase() === 'all' && args[1]?.toLowerCase() === 'info') {
    return commands.staffinfo.run(message, []);
  }

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
