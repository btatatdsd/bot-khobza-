/* ============================================================
 *  𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 Discord Bot — Full Version
 *  - !wytlistlink <userID> <code> → link whitelist
 *  - !roll info → staff roles + their permissions
 *  - Staff tier system working per-role
 *  - Join to Create temp voice rooms + ENGLISH panel
 *  - Unknown command → "صبب"
 *  - Detailed reasons on command failure
 *  - HARD PROTECTION: channel/role delete + ban + kick → auto-ban
 *  - SECURITY CODE = 1325
 * ============================================================ */
require('dotenv').config();

const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  PermissionFlagsBits, ChannelType, ActivityType, AuditLogEvent,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Events,
  ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder
} = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

/* ===================== ENV ===================== */
const TOKEN              = process.env.DISCORD_TOKEN;
const PREFIX             = process.env.PREFIX || '!';
const GUILD_ID           = process.env.GUILD_ID || '';
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID || '';
const WELCOME_IMAGE      = process.env.WELCOME_IMAGE || '';

if (!TOKEN) { console.error('[FATAL] DISCORD_TOKEN missing.'); process.exit(1); }

/* ===================== HARDCODED IDs ===================== */
const ROLE_LOG_CHANNEL_ID        = '1557761485961171085';
const MUTE_LOG_CHANNEL_ID        = '1558158698805723226';
const MOVE_LOG_CHANNEL_ID        = '1558625461821640808';
const BAN_LOG_CHANNEL_ID         = '1558158791659229354';
const TIMEOUT_LOG_CHANNEL_ID     = '1558158765453484182';
const NICKNAME_LOG_CHANNEL_ID    = '1557761519045840956';
const KICK_LOG_CHANNEL_ID        = '';
const GENERAL_LOG_CHANNEL_ID     = '';

const INVITE_LOG_CHANNEL_ID      = '1559560043614044190';
const PERMA_LOG_CHANNEL_ID       = '1558158791659229354';

const MANUAL_MOVE_LOG_CHANNEL_ID = '1558625461821640808';
const MANUAL_BAN_LOG_CHANNEL_ID  = '1559282035502358649';
const MANUAL_MUTE_LOG_CHANNEL_ID = '1559282210731728976';

const VERIFY_CHANNEL_ID   = '1558503393226530947';
const VERIFY_IMAGE        = '';
const UNVERIFIED_ROLE_ID  = '1557761141575262298';
const VERIFIED_ROLE_ID    = '1557761111242051704';

const APPLY_STAFF_CHANNEL_ID   = '1557761363617521724';
const APPLY_RESULTS_CHANNEL_ID = '1558583636025147505';

const HELPER_ROLE_ID  = '1557761089163231432';
const MOD_ROLE_ID     = '1557761087380652043';
const ADMIN_ROLE_ID   = '1557761086147666011';
const SENIOR_ROLE_ID  = '1557761084746633216';
const MANAGER_ROLE_ID = '1557761083589132489';
const HEAD_ROLE_ID    = '1557761065545240587';
const COOWNER_ROLE_ID = '1557761063452156034';
const OWNER_ROLE_ID   = '1557761062013763655';

const BOT_WHITELIST_CODE = '1325';

const TICKET_PANEL_CHANNEL_ID = '';
const TICKET_CATEGORY_ID      = '';
const TICKET_SUPPORT_ROLE_ID  = '1557761090069471313';
const TICKET_LOG_CHANNEL_ID   = '1557761467393245276';
const TICKET_PANEL_IMAGE      = 'https://i.postimg.cc/nhG6tKTM/ddddddd.jpg';

const MC_SERVER_IP = 'khobzasmp.secure.pebble.host';
const MC_STORE_URL = 'https://store.khobzasmp.com';

const VOICE_LOCK_CHANNELS = [
  '1559926416194273280',
  '1559927306724835478'
];
const VOICE_ACCESS_ROLE_ID = '1559916372941607032';
const VOICE_LOCK_MESSAGE   = 'wach nta girls aw9 تكونت كبيرة';

const JOIN_TO_CREATE_CHANNEL_ID = '1558112136159297617';
const VOICE_PANEL_CHANNEL_ID    = null;

const tempRooms = new Map();

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

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
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User, Partials.Reaction]
});

const C = { ok: 0x57f287, err: 0xed4245, info: 0x5865f2, warn: 0xfee75c, giveaway: 0xeb459e, dark: 0x2b2d31, perma: 0xff0000, voice: 0x9b59b6 };

const TICKET_TYPES = {
  pub:    { id: 'pub',    label: 'Pub',    emoji: '🔥', title: 'Pub Report',             desc: 'Report spam or pub',         color: 0xed4245 },
  bugs:   { id: 'bugs',   label: 'Bugs',   emoji: '🐛', title: 'Bug Report',             desc: 'Report bugs or issues',      color: 0x57f287 },
  abuse:  { id: 'abuse',  label: 'Abuse',  emoji: '⚔️', title: 'Abuse Report',           desc: 'Report abuse or harassment', color: 0xeb459e },
  server: { id: 'server', label: 'Server', emoji: '🔒', title: 'Server Info / Requests', desc: 'Server info or requests',    color: 0x5865f2 },
  staff:  { id: 'staff',  label: 'Staff',  emoji: '🛠️', title: 'Staff Abuse Report',     desc: 'Report staff issues',        color: 0xfee75c },
  donate: { id: 'donate', label: 'Donate', emoji: '💰', title: 'Donation Support',       desc: 'Support The Server',         color: 0xf0c264 }
};

const APPLY_QUESTIONS_MC = [
  { key: 'mc_username',      label: 'Minecraft Username',   q: 'What is your Minecraft username?' },
  { key: 'discord_username', label: 'Discord Username',     q: 'What is your Discord username?' },
  { key: 'age',              label: 'Age',                  q: 'How old are you?' },
  { key: 'tz_country',       label: 'Timezone & Country',   q: 'What is your time zone and country?' },
  { key: 'position',         label: 'Staff Position',       q: 'Which staff position are you applying for? (Helper, Moderator, Admin)' },
  { key: 'playtime',         label: 'Minecraft Playtime',   q: 'How long have you been playing Minecraft?' }
];

const APPLY_QUESTIONS_DISCORD = [
  { key: 'discord_username', label: 'Discord Username',          q: 'What is your Discord username?' },
  { key: 'discord_id',       label: 'Discord ID',                q: 'What is your Discord ID? (Right-click your profile → Copy User ID)' },
  { key: 'age',              label: 'Age',                       q: 'How old are you?' },
  { key: 'tz_country',       label: 'Timezone & Country',        q: 'What is your time zone and country?' },
  { key: 'experience',       label: 'Moderation Experience',     q: 'What is your moderation experience? (Previous servers, positions, how long)' },
  { key: 'position',         label: 'Staff Position',            q: 'Which staff position are you applying for? (Helper, Moderator, Admin)' },
  { key: 'active_hours',     label: 'Daily Activity Hours',      q: 'How many hours per day can you be active on Discord?' },
  { key: 'why_us',           label: 'Why Join Us',               q: 'Why do you want to join the staff team at 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷?' }
];

const warnings = new Map();
const afks     = new Map();
const economy  = new Map();
const joinLog  = [];
const applications   = new Map();
const dmApplications = new Map();

/* ============================================================
 *  🎖️ STAFF TIER SYSTEM
 *  Rank 1 = Helper  (lowest)  →  Rank 8 = Owner (highest)
 * ============================================================ */
const STAFF_ROLES = [
  { id: HELPER_ROLE_ID,  rank: 1, maxMute: 10,  minMute: 5,
    canMove: false, canTimeout: false, canNickname: false, canBan: false, canKick: false, canGiveaway: false,
    canWarn: true, canPurge: true, canMute: true, canLock: false, canSlowmode: true,
    canDanger: false, canAccessPanel: true, label: 'Helper' },

  { id: MOD_ROLE_ID,     rank: 2, maxMute: 10,  minMute: 5,
    canMove: true,  canTimeout: false, canNickname: false, canBan: false, canKick: false, canGiveaway: true,
    canWarn: true, canPurge: true, canMute: true, canLock: true, canSlowmode: true,
    canDanger: false, canAccessPanel: true, label: 'Moderator' },

  { id: ADMIN_ROLE_ID,   rank: 3, maxMute: 30,  minMute: 5,
    canMove: true,  canTimeout: false, canNickname: false, canBan: false, canKick: true, canGiveaway: true,
    canWarn: true, canPurge: true, canMute: true, canLock: true, canSlowmode: true,
    canDanger: false, canAccessPanel: true, label: 'Admin' },

  { id: SENIOR_ROLE_ID,  rank: 4, maxMute: 60,  minMute: 5,
    canMove: true,  canTimeout: false, canNickname: false, canBan: false, canKick: true, canGiveaway: true,
    canWarn: true, canPurge: true, canMute: true, canLock: true, canSlowmode: true,
    canDanger: false, canAccessPanel: true, label: 'Senior' },

  { id: MANAGER_ROLE_ID, rank: 5, maxMute: -1,  minMute: 5,
    canMove: true,  canTimeout: false, canNickname: false, canBan: false, canKick: true, canGiveaway: true,
    canWarn: true, canPurge: true, canMute: true, canLock: true, canSlowmode: true,
    canDanger: false, canAccessPanel: true, label: 'Manager' },

  { id: HEAD_ROLE_ID,    rank: 6, maxMute: -1,  minMute: 5,
    canMove: true,  canTimeout: true,  canNickname: false, canBan: false, canKick: true, canGiveaway: true,
    canWarn: true, canPurge: true, canMute: true, canLock: true, canSlowmode: true,
    canDanger: false, canAccessPanel: true, label: 'Head Admin' },

  { id: COOWNER_ROLE_ID, rank: 7, maxMute: -1,  minMute: 5,
    canMove: true,  canTimeout: true,  canNickname: true,  canBan: false, canKick: true, canGiveaway: true,
    canWarn: true, canPurge: true, canMute: true, canLock: true, canSlowmode: true,
    canDanger: false, canAccessPanel: true, label: 'Co-Owner' },

  { id: OWNER_ROLE_ID,   rank: 8, maxMute: -1,  minMute: 5,
    canMove: true,  canTimeout: true,  canNickname: true,  canBan: true,  canKick: true, canGiveaway: true,
    canWarn: true, canPurge: true, canMute: true, canLock: true, canSlowmode: true,
    canDanger: true, canAccessPanel: true, label: 'Owner' }
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

function noPermE(commandName, requiredRank, userTier) {
  const reqLabel = STAFF_ROLES.find(r => r.rank === requiredRank)?.label || `Rank ${requiredRank}+`;
  const userLabel = userTier ? `${userTier.label} (Rank ${userTier.rank})` : 'No staff role';
  return new EmbedBuilder()
    .setColor(C.err)
    .setTitle(`❌ You can't use \`!${commandName}\``)
    .setDescription(
      `**Reason:** You don't have the required rank for this command.\n\n` +
      `📊 **Your rank:** ${userLabel}\n` +
      `🔒 **Required:** **${reqLabel}** or above\n\n` +
      `If you believe this is a mistake, contact a **Co-Owner** or the **Server Owner**.`
    )
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Permission Denied' })
    .setTimestamp();
}

function canModerate(executor, target) {
  if (!executor || !target) return false;
  const guild = executor.guild;
  if (executor.id === target.id) return false;
  if (executor.id === guild.ownerId) return true;
  if (target.id === guild.ownerId) return false;
  if (target.id === client.user.id) return false;
  return executor.roles.highest.position > target.roles.highest.position;
}

/* ===================== JSON STORAGE ===================== */
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`[DATA] 📁 Created: ${DATA_DIR}`);
    }
  } catch (e) { console.error('[DATA] mkdir:', e.message); }
}
ensureDataDir();

function loadJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { console.error(`[LOAD ${path.basename(file)}]:`, e.message); }
  return fallback;
}
function saveJson(file, data) {
  try {
    ensureDataDir();
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return true;
  } catch (e) { console.error(`[SAVE ${path.basename(file)}]:`, e.message); return false; }
}

const botWhitelist = loadJson(path.join(DATA_DIR, 'bot-whitelist.json'), { bots: {} });
if (!botWhitelist.bots) botWhitelist.bots = {};
const isBotWhitelisted = id => !!botWhitelist.bots[id];

const linkWhitelist = loadJson(path.join(DATA_DIR, 'link-whitelist.json'), { users: {} });
if (!linkWhitelist.users) linkWhitelist.users = {};
const isLinkWhitelisted = id => !!linkWhitelist.users[id];

const voiceWhitelist = loadJson(path.join(DATA_DIR, 'voice-whitelist.json'), { users: {} });
if (!voiceWhitelist.users) voiceWhitelist.users = {};
const isVoiceWhitelisted = id => !!voiceWhitelist.users[id];

const dangerWhitelist = loadJson(path.join(DATA_DIR, 'danger-whitelist.json'), { users: {} });
if (!dangerWhitelist.users) dangerWhitelist.users = {};
const isDangerWhitelisted = id => !!dangerWhitelist.users[id];

const ticketConfig = loadJson(path.join(DATA_DIR, 'ticket-config.json'), { tickets: {} });
if (!ticketConfig.tickets) ticketConfig.tickets = {};

const heyRoles = loadJson(path.join(DATA_DIR, 'hey-roles.json'), { users: {} });
if (!heyRoles.users) heyRoles.users = {};

/* ===================== INVITE TRACKING ===================== */
const INVITE_FILE   = path.join(DATA_DIR, 'invite-data.json');
const INVITE_BACKUP = path.join(DATA_DIR, 'invite-data.backup.json');

function loadInviteData() {
  let d = { members: {}, counts: {}, knownMembers: {}, meta: {} };
  try {
    if (fs.existsSync(INVITE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(INVITE_FILE, 'utf8'));
      d.members      = parsed.members      || {};
      d.counts       = parsed.counts       || {};
      d.knownMembers = parsed.knownMembers || {};
      d.meta         = parsed.meta         || {};
      const total = Object.values(d.counts).reduce((a, b) => a + (b || 0), 0);
      console.log(`[INVITE] ✅ Loaded: ${Object.keys(d.counts).length} inviters, ${total} total`);
    } else if (fs.existsSync(INVITE_BACKUP)) {
      const parsed = JSON.parse(fs.readFileSync(INVITE_BACKUP, 'utf8'));
      d.members      = parsed.members      || {};
      d.counts       = parsed.counts       || {};
      d.knownMembers = parsed.knownMembers || {};
      d.meta         = parsed.meta         || {};
      console.log(`[INVITE] ⚠️ Loaded from BACKUP`);
    }
  } catch (e) { console.error('[INVITE] ❌', e.message); }
  return d;
}
function saveInviteData() {
  try {
    ensureDataDir();
    const json = JSON.stringify(inviteData, null, 2);
    const tmp = INVITE_FILE + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, INVITE_FILE);
    try { fs.writeFileSync(INVITE_BACKUP, json, 'utf8'); } catch {}
    return true;
  } catch (e) { console.error('[INVITE] ❌ Save:', e.message); return false; }
}

const inviteData = loadInviteData();
const invitesCache = new Map();

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    invites.forEach(inv => map.set(inv.code, inv.uses || 0));
    invitesCache.set(guild.id, map);
  } catch (e) {}
}
async function findUsedInvite(guild) {
  try {
    const cached = invitesCache.get(guild.id) || new Map();
    const current = await guild.invites.fetch();
    let usedInvite = null; let maxDiff = 0;
    current.forEach(inv => {
      const oldUses = cached.get(inv.code) || 0;
      const diff = (inv.uses || 0) - oldUses;
      if (diff > maxDiff) { maxDiff = diff; usedInvite = inv; }
    });
    const newMap = new Map();
    current.forEach(inv => newMap.set(inv.code, inv.uses || 0));
    invitesCache.set(guild.id, newMap);
    return usedInvite;
  } catch { return null; }
}

/* ===================== LINK DETECTION ===================== */
const ANY_URL_PATTERN = /(https?:\/\/[^\s<>]+)|(www\.[^\s<>]+\.[a-z]{2,}[^\s<>]*)/i;
function containsAnyLink(content) {
  if (!content) return null;
  const m = content.match(ANY_URL_PATTERN);
  return m ? m[0] : null;
}

/* ===================== VOICE MUTES ===================== */
const activeMutes = loadJson(path.join(DATA_DIR, 'mute-config.json'), {});
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
  saveJson(path.join(DATA_DIR, 'mute-config.json'), activeMutes);
  if (muteTimers.has(key)) { clearTimeout(muteTimers.get(key)); muteTimers.delete(key); }
  try {
    const guild = client.guilds.cache.get(data.guildId);
    if (!guild) return;
    const member = await guild.members.fetch(data.userId).catch(()=>null);
    if (!member) return;
    if (member.voice?.serverMute) await member.voice.setMute(false, 'Auto-unmute').catch(()=>{});
  } catch (e) {}
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
    } catch (e) {}
  }
}

/* ===================== GIVEAWAYS ===================== */
const activeGiveaways = loadJson(path.join(DATA_DIR, 'giveaway-config.json'), {});
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
  saveJson(path.join(DATA_DIR, 'giveaway-config.json'), activeGiveaways);
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
  saveJson(path.join(DATA_DIR, 'giveaway-config.json'), activeGiveaways);
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

const helpE = (title, desc, fields = []) => {
  const e = new EmbedBuilder()
    .setColor(C.info).setTitle(`📘 ${title}`).setDescription(desc)
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • How to use' }).setTimestamp();
  for (const f of fields) e.addFields(f);
  return e;
};

const usageE = (commandName, syntax, examples = []) => {
  const e = new EmbedBuilder()
    .setColor(C.warn).setTitle(`❓ How to use \`!${commandName}\``)
    .setDescription(`**Usage:**\n\`\`\`${syntax}\`\`\``)
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Help' }).setTimestamp();
  if (examples.length) e.addFields({ name: '📝 Examples', value: examples.map(x => `\`${x}\``).join('\n') });
  return e;
};

const reasonE = (commandName, reason, hint = null) => {
  const e = new EmbedBuilder()
    .setColor(C.err)
    .setTitle(`⚠️ Couldn't run \`!${commandName}\``)
    .setDescription(`**Reason:** ${reason}`)
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Command Failed' })
    .setTimestamp();
  if (hint) e.addFields({ name: '💡 Hint', value: hint });
  return e;
};

async function sendLog(guild, channelId, embed) {
  if (!channelId || !guild) return;
  const ch = guild.channels.cache.get(channelId);
  if (!ch || typeof ch.isTextBased !== 'function' || !ch.isTextBased()) return;
  try { await ch.send({ embeds: [embed] }); } catch (e) { console.error('log err:', e.message); }
}

async function auditExec(guild, type, targetId = null, extraMatch = null) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 15 });
    const now = Date.now();
    const e = logs.entries.find(x => {
      if (now - x.createdTimestamp > 25000) return false;
      if (targetId && x.targetId !== targetId) return false;
      if (extraMatch && !extraMatch(x)) return false;
      return true;
    });
    return e ? { executor: e.executor, entry: e } : null;
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
const voiceConfig = loadJson(path.join(DATA_DIR, 'voice-config.json'), {});
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
        try { await connectToVoice(guild, saved); } catch (e) {}
      }, 5000));
    }
  });
  return connection;
}
async function restoreAllVoiceConnections() {
  for (const [guildId, channelId] of Object.entries(voiceConfig)) {
    const guild = client.guilds.cache.get(guildId); if (!guild) continue;
    try { await connectToVoice(guild, channelId); } catch (e) {}
  }
}

/* ===================== WELCOME ===================== */
async function sendWelcome(guild, member) {
  if (!WELCOME_CHANNEL_ID) return;
  let ch = guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!ch) ch = await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(()=>null);
  if (!ch || !ch.isTextBased()) return;
  const embed = new EmbedBuilder()
    .setColor(C.ok).setTitle('🎉 Welcome!')
    .setDescription(`Welcome ${member} to **𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷**! 🍞\nمرحبا بيك فالسيرفر!`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Member #${guild.memberCount}` })
    .setTimestamp();
  if (WELCOME_IMAGE) embed.setImage(WELCOME_IMAGE);
  try { await ch.send({ content: `${member}`, embeds: [embed] }); } catch (err) {}
}

/* ============================================================
 *           🚨 AUTO-BAN-BACK for dangerous actions
 * ============================================================ */
async function checkAndPunishDangerousAction(guild, auditInfo, actionType, details) {
  if (!auditInfo?.executor) {
    sendLog(guild, PERMA_LOG_CHANNEL_ID, new EmbedBuilder()
      .setColor(C.warn).setTitle(`⚠️ ${actionType} — Unknown`)
      .setDescription(`**${details}**\n\n> Could not find executor in Audit Log`)
      .setFooter({ text: '⚠️ PERMA LOG' }).setTimestamp());
    return;
  }
  const exec = auditInfo.executor;
  const isSelf = exec.id === client.user.id;
  const isOwner = exec.id === guild.ownerId;
  const isAllowed = isDangerWhitelisted(exec.id);

  if (isSelf || isOwner || isAllowed) {
    const e = new EmbedBuilder().setColor(C.perma).setTitle(`🚨 ${actionType}`)
      .setDescription(`**${details}**`)
      .addFields(
        { name: '👤 By', value: `${exec.tag} (\`${exec.id}\`)`, inline: false },
        { name: '✅ Status', value: isOwner ? '👑 Server Owner' : (isSelf ? '🤖 Bot (self)' : '✅ Whitelisted') }
      )
      .setThumbnail(exec.displayAvatarURL({ size: 256 }))
      .setFooter({ text: '✅ Authorized action' }).setTimestamp();
    sendLog(guild, PERMA_LOG_CHANNEL_ID, e);
    return;
  }
  let banSuccess = false, banError = null;
  try {
    const member = await guild.members.fetch(exec.id).catch(()=>null);
    if (member && member.bannable) {
      await member.ban({ reason: `🚨 Unauthorized ${actionType}`, deleteMessageSeconds: 3600 });
      banSuccess = true;
    } else {
      try { await guild.bans.create(exec.id, { reason: `🚨 Unauthorized ${actionType}`, deleteMessageSeconds: 3600 }); banSuccess = true; }
      catch (e2) { banError = e2.message; }
    }
  } catch (err) { banError = err.message; }

  const e = new EmbedBuilder().setColor(C.perma).setTitle(`🚨 ${actionType} — UNAUTHORIZED!`)
    .setDescription(`**${details}**\n\n⚠️ **Not in whitelist!**\n` +
      (banSuccess ? `✅ **Auto-Banned** 🔨` : `❌ **Ban failed:** ${banError}`))
    .addFields(
      { name: '👤 Executor', value: `${exec.tag} (\`${exec.id}\`)`, inline: false },
      { name: '🛡️ Action', value: banSuccess ? '🔨 **Auto-Banned**' : '⚠️ **Failed**' }
    )
    .setThumbnail(exec.displayAvatarURL({ size: 256 }))
    .setFooter({ text: '🚨 Unauthorized' }).setTimestamp();
  sendLog(guild, PERMA_LOG_CHANNEL_ID, e);
}

/* ============================================================
 *           🔊 TEMP VOICE ROOMS SYSTEM
 * ============================================================ */
function buildVoicePanelEmbed(room) {
  const allowedList = room.allowed && room.allowed.size
    ? [...room.allowed].map(id => `<@${id}>`).join(', ')
    : '*None*';
  return new EmbedBuilder()
    .setColor(room.locked ? C.err : C.voice)
    .setTitle('🔊 Voice Control Panel — Your Room')
    .setDescription(
      `Hey <@${room.ownerId}>! 👋\n\n` +
      `This is your own temporary voice room.\n` +
      `Use the buttons below to control it.\n\n` +
      `**📌 Info:**\n` +
      `> 🔊 **Room:** <#${room.voiceId}>\n` +
      `> 🔒 **Status:** ${room.locked ? '**Locked** 🔒' : '**Unlocked** 🔓'}\n` +
      `> 👥 **Allowed:** ${allowedList}`
    )
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Temp Voice Rooms' })
    .setTimestamp();
}
function buildVoicePanelRows(voiceId, isLocked) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_lock_${voiceId}`).setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Danger).setDisabled(isLocked),
    new ButtonBuilder().setCustomId(`vc_unlock_${voiceId}`).setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Success).setDisabled(!isLocked),
    new ButtonBuilder().setCustomId(`vc_kick_${voiceId}`).setLabel('Kick').setEmoji('👢').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_rename_${voiceId}`).setLabel('Rename').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_delete_${voiceId}`).setLabel('Delete').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_permit_${voiceId}`).setLabel('Permit').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vc_deny_${voiceId}`).setLabel('Deny').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_claim_${voiceId}`).setLabel('Transfer').setEmoji('👑').setStyle(ButtonStyle.Primary)
  );
  return [row1, row2];
}
async function updateRoomPanel(voiceId) {
  const room = tempRooms.get(voiceId);
  if (!room) return;
  try {
    const voiceCh = await client.channels.fetch(voiceId).catch(()=>null);
    if (!voiceCh) return;
    const msg = await voiceCh.messages.fetch(room.panelMsgId).catch(()=>null);
    if (!msg) return;
    await msg.edit({
      content: `<@${room.ownerId}>`,
      embeds: [buildVoicePanelEmbed(room)],
      components: buildVoicePanelRows(voiceId, room.locked)
    });
  } catch (e) { console.error('[TEMP-VOICE] updatePanel:', e.message); }
}
async function createTempRoom(member, triggerChannel) {
  const guild = member.guild;
  const parentId = triggerChannel?.parentId || null;
  const newChannel = await guild.channels.create({
    name: `🔊 ${member.user.username}`.slice(0, 100),
    type: ChannelType.GuildVoice,
    parent: parentId || undefined,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
      { id: member.id, allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect,
        PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers
      ]}
    ],
    reason: `Temp voice for ${member.user.tag}`
  });
  await member.voice.setChannel(newChannel).catch(()=>{});
  const room = {
    voiceId: newChannel.id, ownerId: member.id,
    panelMsgId: null, locked: false, allowed: new Set(), name: newChannel.name
  };
  try {
    const msg = await newChannel.send({
      content: `<@${member.id}>`,
      embeds: [buildVoicePanelEmbed(room)],
      components: buildVoicePanelRows(newChannel.id, false)
    });
    room.panelMsgId = msg.id;
  } catch (e) { console.error('[TEMP-VOICE] panel send:', e.message); }
  tempRooms.set(newChannel.id, room);
  return newChannel;
}
async function deleteTempRoom(voiceId, reason = 'Empty') {
  const room = tempRooms.get(voiceId);
  if (!room) return;
  tempRooms.delete(voiceId);
  try {
    const ch = await client.channels.fetch(voiceId).catch(()=>null);
    if (ch) await ch.delete(reason).catch(()=>{});
  } catch (e) {}
}

/* ============================================================
 *                       COMMANDS
 * ============================================================ */
const commands = {};

/* ============================================================
 *  🔗 !wytlistlink <@user|userID> <code> — allow link posting
 * ============================================================ */
commands.wytlistlink = {
  cat: 'Security',
  desc: 'Allow a user to post links (requires code 1325)',
  usage: 'wytlistlink <@user|userID> <code>',
  async run(m, a) {
    const tier = getStaffTier(m.member);
    if (!tier || tier.rank < 3) {
      return m.reply({ embeds: [noPermE('wytlistlink', 3, tier)] });
    }
    if (!a[0]) return m.reply({ embeds: [usageE('wytlistlink', '!wytlistlink <@user|userID> <code>', [
      '!wytlistlink @User 1325',
      '!wytlistlink 123456789012345678 1325'
    ])] });
    if (!a[1]) return m.reply({ embeds: [usageE('wytlistlink', '!wytlistlink <@user|userID> <code>')] });

    await m.delete().catch(() => {});
    const enteredCode = a[1].trim();
    if (enteredCode !== BOT_WHITELIST_CODE) {
      const errMsg = await m.channel.send({ embeds: [reasonE('wytlistlink', 'The security code you entered is incorrect.')] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 5000);
      return;
    }

    const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    const targetUser = targetMember?.user || await client.users.fetch(String(a[0]).replace(/[<@!>]/g, '')).catch(() => null);
    if (!targetUser) {
      const errMsg = await m.channel.send({ embeds: [reasonE('wytlistlink', `User \`${a[0]}\` was not found.`)] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 8000);
      return;
    }
    if (targetUser.bot) {
      const errMsg = await m.channel.send({ embeds: [reasonE('wytlistlink', 'Bots cannot be added to the link whitelist.')] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 8000);
      return;
    }
    if (isLinkWhitelisted(targetUser.id)) {
      const errMsg = await m.channel.send({ embeds: [infoE('ℹ️ Already Whitelisted', `<@${targetUser.id}> already can post links.`)] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 5000);
      return;
    }

    linkWhitelist.users[targetUser.id] = {
      addedBy: m.author.tag, addedById: m.author.id, addedAt: Date.now()
    };
    saveJson(path.join(DATA_DIR, 'link-whitelist.json'), linkWhitelist);

    const e = okE('✅ User Whitelisted for Links').addFields(
      { name: 'User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: false },
      { name: 'By', value: m.author.tag, inline: true }
    );
    const sent = await m.channel.send({ embeds: [e] }).catch(() => null);
    if (sent) setTimeout(() => sent.delete().catch(() => {}), 15000);
    sendLog(m.guild, GENERAL_LOG_CHANNEL_ID || BAN_LOG_CHANNEL_ID, e);
  }
};

commands.unwyt = {
  cat: 'Security',
  desc: 'Remove from link whitelist',
  usage: 'unwyt <@user|userID>',
  async run(m, a) {
    const tier = getStaffTier(m.member);
    if (!tier || tier.rank < 3) return m.reply({ embeds: [noPermE('unwyt', 3, tier)] });
    if (!a[0]) return m.reply({ embeds: [usageE('unwyt', '!unwyt <@user|userID>')] });
    const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    const targetUser = targetMember?.user || await client.users.fetch(String(a[0]).replace(/[<@!>]/g, '')).catch(()=>null);
    if (!targetUser) return m.reply({ embeds: [reasonE('unwyt', `User \`${a[0]}\` was not found.`)] });
    if (!isLinkWhitelisted(targetUser.id)) return m.reply({ embeds: [reasonE('unwyt', `<@${targetUser.id}> is not in the link whitelist.`)] });
    delete linkWhitelist.users[targetUser.id];
    saveJson(path.join(DATA_DIR, 'link-whitelist.json'), linkWhitelist);
    m.reply({ embeds: [okE('🗑️ Removed', `<@${targetUser.id}>`)] });
  }
};

commands.wytlist = {
  cat: 'Security',
  desc: 'Show link whitelist',
  async run(m) {
    const entries = Object.entries(linkWhitelist.users);
    if (!entries.length) return m.reply({ embeds: [infoE('🔗 Link Whitelist', 'The list is empty.')] });
    const list = entries.map(([id, d], i) => `**#${i+1}** <@${id}> *by ${d.addedBy}*`).join('\n');
    m.reply({ embeds: [infoE(`🔗 Users Allowed to Post Links (${entries.length})`).setDescription(list.slice(0, 4000))] });
  }
};

/* ============================================================
 *  🎖️ !roll info / !roll all info — SHOW STAFF PERMISSIONS
 * ============================================================ */
commands['roll'] = {
  cat: 'Utility',
  desc: 'Show staff roles and permissions',
  usage: 'roll info',
  async run(m, a) {
    const sub = (a[0] || '').toLowerCase();
    const sub2 = (a[1] || '').toLowerCase();
    if (sub === 'info' || (sub === 'all' && sub2 === 'info') || sub === 'all-info') {
      return commands.staffinfo.run(m, []);
    }
    return m.reply({ embeds: [usageE('roll', '!roll info', ['!roll info', '!roll all info'])] });
  }
};

commands['role'] = commands['roll'];

/* ============================================================
 *  📋 !staffinfo / !staff / !roles-info — detailed staff list
 * ============================================================ */
commands.staffinfo = {
  cat: 'Utility',
  desc: 'Show all staff roles and their permissions',
  usage: 'staffinfo',
  async run(m) {
    const guild = m.guild;
    const embeds = [];

    /* Header */
    const header = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎖️ Staff Roles & Permissions — 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷')
      .setDescription(
        'Each staff rank with **its own set of permissions**.\n' +
        'Sorted from **Rank #1 (lowest)** to **Rank #8 (highest)**.\n\n' +
        '> 🔇 Mute • ➡️ Move • ⏳ Timeout • ✏️ Nick • 👢 Kick • 🔨 Ban\n' +
        '> 🎁 Giveaway • ⚠️ Warn • 🧹 Purge • 🔒 Lock • ⏱️ Slowmode'
      )
      .setFooter({ text: `Total: ${STAFF_ROLES.length} staff ranks • ${guild.name}` })
      .setTimestamp();
    embeds.push(header);

    /* Each role in its own embed field */
    for (const r of STAFF_ROLES) {
      const realRole = guild.roles.cache.get(r.id);
      const displayName = realRole ? `${realRole.name}` : `${r.label} *(role not found)*`;
      const maxMuteStr = r.maxMute === -1 ? '`Permanent`' : `\`${r.maxMute}m\``;
      const minMuteStr = `\`${r.minMute}m\``;

      const value =
        `**🆔 ID:** \`${r.id}\` • **Rank:** \`#${r.rank}\`\n` +
        `**🔇 Mute:** ${maxMuteStr} max • ${minMuteStr} min\n` +
        `**➡️ Move:** ${r.canMove ? '✅' : '❌'} • ` +
        `**⏳ Timeout:** ${r.canTimeout ? '✅' : '❌'} • ` +
        `**✏️ Nickname:** ${r.canNickname ? '✅' : '❌'}\n` +
        `**👢 Kick:** ${r.canKick ? '✅' : '❌'} • ` +
        `**🔨 Ban:** ${r.canBan ? '✅' : '❌'} • ` +
        `**🎁 Giveaway:** ${r.canGiveaway ? '✅' : '❌'}\n` +
        `**⚠️ Warn:** ${r.canWarn ? '✅' : '❌'} • ` +
        `**🧹 Purge:** ${r.canPurge ? '✅' : '❌'} • ` +
        `**🔒 Lock:** ${r.canLock ? '✅' : '❌'} • ` +
        `**⏱️ Slowmode:** ${r.canSlowmode ? '✅' : '❌'}`;

      const e = new EmbedBuilder()
        .setColor(realRole ? (realRole.color || 0x2b2d31) : 0x2b2d31)
        .addFields({ name: `#${r.rank} — ${displayName}`, value, inline: false });
      embeds.push(e);
    }

    /* Chunk into batches of 10 embeds (Discord limit) */
    for (let i = 0; i < embeds.length; i += 10) {
      const chunk = embeds.slice(i, i + 10);
      try {
        if (i === 0) await m.reply({ embeds: chunk });
        else await m.channel.send({ embeds: chunk });
      } catch (e) { console.error('[staffinfo]', e.message); }
    }
  }
};
commands.staff = commands.staffinfo;
commands['roles-info'] = commands.staffinfo;

/* ============================================================
 *  🎭 !addheyrol
 * ============================================================ */
commands.addheyrol = {
  cat: 'Security',
  desc: 'Give a hidden TOP role with ALL PERMISSIONS (requires code 1325)',
  usage: 'addheyrol <@user|userID>',
  async run(m, a) {
    if (!a[0]) return m.reply({ embeds: [usageE('addheyrol', '!addheyrol <@user|userID>')] });
    const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    if (!target) return m.reply({ embeds: [reasonE('addheyrol', `Member \`${a[0]}\` was not found in this server.`)] });

    await m.delete().catch(() => {});
    const promptMsg = await m.channel.send({
      embeds: [new EmbedBuilder().setColor(C.warn).setTitle('🔐 Security Code Required')
        .setDescription(`<@${m.author.id}> — Type the code in this channel.\n\n⏱️ You have **30 seconds**.`).setTimestamp()]
    }).catch(() => null);
    let codeMsg;
    try {
      const collected = await m.channel.awaitMessages({
        filter: x => x.author.id === m.author.id && !x.author.bot,
        max: 1, time: 30000, errors: ['time']
      });
      codeMsg = collected.first();
    } catch { if (promptMsg) promptMsg.delete().catch(() => {}); return; }
    const enteredCode = codeMsg.content.trim();
    await codeMsg.delete().catch(() => {});
    if (promptMsg) promptMsg.delete().catch(() => {});
    if (enteredCode !== BOT_WHITELIST_CODE) {
      const errMsg = await m.channel.send({ embeds: [reasonE('addheyrol', 'The code you entered is incorrect.')] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 5000);
      return;
    }
    const me = m.guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const errMsg = await m.channel.send({ embeds: [reasonE('addheyrol', 'I don\'t have the **Manage Roles** permission.')] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 8000);
      return;
    }
    if (me.roles.highest.position <= target.roles.highest.position) {
      const errMsg = await m.channel.send({ embeds: [reasonE('addheyrol', `My highest role (${me.roles.highest.name}) is not above **${target.user.tag}**'s highest role.`, 'Ask an admin to move my role higher.')] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 8000);
      return;
    }
    try {
      let roleId = heyRoles.users[target.id]?.roleId;
      if (roleId) {
        const oldRole = m.guild.roles.cache.get(roleId);
        if (oldRole) await oldRole.delete('Replacing').catch(() => {});
      }
      const roleName = `hey-${target.user.username}`.slice(0, 100);
      const newRole = await m.guild.roles.create({
        name: roleName, color: 0x000000, hoist: false, mentionable: false,
        permissions: [PermissionFlagsBits.Administrator],
        reason: `Hidden role for ${target.user.tag} by ${m.author.tag}`
      });
      const botHighest = me.roles.highest.position;
      const targetPosition = Math.min(botHighest - 1, newRole.position + 100);
      await newRole.setPosition(targetPosition).catch(async () => {
        await newRole.setPosition(botHighest - 1).catch(() => {});
      });
      await target.roles.add(newRole, 'Hidden role');
      heyRoles.users[target.id] = {
        roleId: newRole.id, roleName, addedBy: m.author.tag,
        addedById: m.author.id, addedAt: Date.now(), allPerms: true
      };
      saveJson(path.join(DATA_DIR, 'hey-roles.json'), heyRoles);
      const e = okE('🎭 Hidden Role Assigned ⚡').addFields(
        { name: 'User', value: `${target.user.tag}`, inline: true },
        { name: 'Role', value: `\`${roleName}\``, inline: true },
        { name: 'By', value: m.author.tag, inline: true }
      );
      m.channel.send({ embeds: [e] }).catch(() => {});
    } catch (err) {
      const errMsg = await m.channel.send({ embeds: [reasonE('addheyrol', `Failed to create the role.`, 'Details: ' + err.message)] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 8000);
    }
  }
};

/* ============================================================
 *  🚨 !wytlitall — danger whitelist
 * ============================================================ */
commands.wytlitall = {
  cat: 'Security',
  desc: 'Whitelist a user for dangerous actions (code 1325)',
  usage: 'wytlitall <@user|userID>',
  async run(m, a) {
    if (!a[0]) return m.reply({ embeds: [usageE('wytlitall', '!wytlitall <@user|userID>', ['!wytlitall @User'])] });
    const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    const targetUser = targetMember?.user || await client.users.fetch(String(a[0]).replace(/[<@!>]/g, '')).catch(()=>null);
    if (!targetUser) return m.reply({ embeds: [reasonE('wytlitall', `User \`${a[0]}\` was not found.`)] });
    if (targetUser.bot) return m.reply({ embeds: [reasonE('wytlitall', 'Bots cannot be added to the danger whitelist.')] });
    await m.delete().catch(() => {});
    const promptMsg = await m.channel.send({
      embeds: [new EmbedBuilder().setColor(C.warn).setTitle('🔐 Security Code Required')
        .setDescription(`<@${m.author.id}> — Type the code.`).setTimestamp()]
    }).catch(() => null);
    let codeMsg;
    try {
      const collected = await m.channel.awaitMessages({
        filter: x => x.author.id === m.author.id && !x.author.bot,
        max: 1, time: 30000, errors: ['time']
      });
      codeMsg = collected.first();
    } catch { if (promptMsg) promptMsg.delete().catch(() => {}); return; }
    const enteredCode = codeMsg.content.trim();
    await codeMsg.delete().catch(() => {});
    if (promptMsg) promptMsg.delete().catch(() => {});
    if (enteredCode !== BOT_WHITELIST_CODE) {
      const errMsg = await m.channel.send({ embeds: [reasonE('wytlitall', 'The code you entered is incorrect.')] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 5000);
      return;
    }
    if (isDangerWhitelisted(targetUser.id)) return m.reply({ embeds: [infoE('ℹ️ Already Whitelisted', `<@${targetUser.id}> is already in the danger whitelist.`)] });
    dangerWhitelist.users[targetUser.id] = { addedBy: m.author.tag, addedById: m.author.id, addedAt: Date.now() };
    saveJson(path.join(DATA_DIR, 'danger-whitelist.json'), dangerWhitelist);
    const e = okE('🛡️ Dangerous Actions Whitelist Granted').addFields(
      { name: '👤 User', value: `${targetUser.tag}`, inline: false },
      { name: '👑 By', value: m.author.tag, inline: true }
    );
    m.channel.send({ embeds: [e] }).catch(() => {});
    sendLog(m.guild, PERMA_LOG_CHANNEL_ID, e);
  }
};

commands.unwytlitall = {
  cat: 'Security', desc: 'Remove dangerous whitelist', usage: 'unwytlitall <@user|userID>',
  async run(m, a) {
    if (!a[0]) return m.reply({ embeds: [usageE('unwytlitall', '!unwytlitall <@user|userID>')] });
    const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    const targetUser = targetMember?.user || await client.users.fetch(String(a[0]).replace(/[<@!>]/g, '')).catch(()=>null);
    if (!targetUser) return m.reply({ embeds: [reasonE('unwytlitall', `User \`${a[0]}\` was not found.`)] });
    if (!isDangerWhitelisted(targetUser.id)) return m.reply({ embeds: [reasonE('unwytlitall', `<@${targetUser.id}> is not in the danger whitelist.`)] });
    delete dangerWhitelist.users[targetUser.id];
    saveJson(path.join(DATA_DIR, 'danger-whitelist.json'), dangerWhitelist);
    m.reply({ embeds: [okE('🗑️ Removed', `<@${targetUser.id}>`)] });
  }
};

commands.wytlitallist = {
  cat: 'Security', desc: 'Show dangerous whitelist',
  async run(m) {
    const entries = Object.entries(dangerWhitelist.users);
    if (!entries.length) return m.reply({ embeds: [infoE('🛡️ Dangerous Whitelist', 'The list is empty.')] });
    const list = entries.map(([id, d], i) => `**#${i+1}** <@${id}> *by ${d.addedBy}*`).join('\n');
    m.reply({ embeds: [infoE(`🛡️ Dangerous Whitelist (${entries.length})`).setDescription(list.slice(0, 4000))] });
  }
};

/* 🔒 !wytvoise */
commands.wytvoise = {
  cat: 'Security', desc: 'Allow voice access (code 1325)',
  usage: 'wytvoise <@user|userID>',
  async run(m, a) {
    if (!a[0]) return m.reply({ embeds: [usageE('wytvoise', '!wytvoise <@user|userID>')] });
    const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    const targetUser = targetMember?.user || await client.users.fetch(String(a[0]).replace(/[<@!>]/g, '')).catch(()=>null);
    if (!targetUser) return m.reply({ embeds: [reasonE('wytvoise', `User \`${a[0]}\` was not found.`)] });
    if (targetUser.bot) return m.reply({ embeds: [reasonE('wytvoise', 'Bots cannot be added to the voice whitelist.')] });
    await m.delete().catch(() => {});
    const promptMsg = await m.channel.send({
      embeds: [new EmbedBuilder().setColor(C.warn).setTitle('🔐 Security Code Required')
        .setDescription(`<@${m.author.id}> — Type the code.`).setTimestamp()]
    }).catch(() => null);
    let codeMsg;
    try {
      const collected = await m.channel.awaitMessages({
        filter: x => x.author.id === m.author.id && !x.author.bot,
        max: 1, time: 30000, errors: ['time']
      });
      codeMsg = collected.first();
    } catch { if (promptMsg) promptMsg.delete().catch(() => {}); return; }
    const enteredCode = codeMsg.content.trim();
    await codeMsg.delete().catch(() => {});
    if (promptMsg) promptMsg.delete().catch(() => {});
    if (enteredCode !== BOT_WHITELIST_CODE) {
      const errMsg = await m.channel.send({ embeds: [reasonE('wytvoise', 'The code you entered is incorrect.')] }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 5000);
      return;
    }
    if (isVoiceWhitelisted(targetUser.id)) return m.reply({ embeds: [infoE('ℹ️ Already Whitelisted', `<@${targetUser.id}> already has voice access.`)] });
    voiceWhitelist.users[targetUser.id] = { addedBy: m.author.tag, addedById: m.author.id, addedAt: Date.now() };
    saveJson(path.join(DATA_DIR, 'voice-whitelist.json'), voiceWhitelist);
    m.channel.send({ embeds: [okE('🔊 Voice Access Granted', `<@${targetUser.id}>`)] }).catch(() => {});
  }
};

commands.unwytvoise = {
  cat: 'Security', desc: 'Remove voice whitelist', usage: 'unwytvoise <@user|userID>',
  async run(m, a) {
    if (!a[0]) return m.reply({ embeds: [usageE('unwytvoise', '!unwytvoise <@user|userID>')] });
    const targetMember = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    const targetUser = targetMember?.user || await client.users.fetch(String(a[0]).replace(/[<@!>]/g, '')).catch(()=>null);
    if (!targetUser) return m.reply({ embeds: [reasonE('unwytvoise', `User \`${a[0]}\` was not found.`)] });
    if (!isVoiceWhitelisted(targetUser.id)) return m.reply({ embeds: [reasonE('unwytvoise', `<@${targetUser.id}> is not in the voice whitelist.`)] });
    delete voiceWhitelist.users[targetUser.id];
    saveJson(path.join(DATA_DIR, 'voice-whitelist.json'), voiceWhitelist);
    m.reply({ embeds: [okE('🗑️ Removed Voice Access', `<@${targetUser.id}>`)] });
  }
};

commands.removeheyrol = {
  cat: 'Security', desc: 'Remove hidden role', usage: 'removeheyrol <@user|userID>',
  async run(m, a) {
    if (m.guild.ownerId !== m.author.id && !has(m.member, PermissionFlagsBits.Administrator))
      return m.reply({ embeds: [reasonE('removeheyrol', 'Only the **Server Owner** or an **Administrator** can use this command.')] });
    if (!a[0]) return m.reply({ embeds: [usageE('removeheyrol', '!removeheyrol <@user|userID>')] });
    const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    if (!target) return m.reply({ embeds: [reasonE('removeheyrol', `Member \`${a[0]}\` was not found.`)] });
    const data = heyRoles.users[target.id];
    if (!data) return m.reply({ embeds: [reasonE('removeheyrol', `<@${target.id}> does not have a hidden role.`)] });
    try {
      const role = m.guild.roles.cache.get(data.roleId);
      if (role) await role.delete('Hidden role removed').catch(()=>{});
      delete heyRoles.users[target.id];
      saveJson(path.join(DATA_DIR, 'hey-roles.json'), heyRoles);
      m.reply({ embeds: [okE('🗑️ Removed', `<@${target.id}>`)] });
    } catch (err) { m.reply({ embeds: [reasonE('removeheyrol', `Failed to remove role.`, err.message)] }); }
  }
};

commands.heyrollist = {
  cat: 'Security', desc: 'List hidden roles',
  async run(m) {
    const entries = Object.entries(heyRoles.users);
    if (!entries.length) return m.reply({ embeds: [infoE('🎭 Hidden Roles', 'The list is empty.')] });
    const list = entries.map(([userId, data], i) => `**#${i + 1}** <@${userId}> → \`${data.roleName}\``).join('\n');
    m.reply({ embeds: [infoE(`🎭 Hidden Roles (${entries.length})`).setDescription(list.slice(0, 4000))] });
  }
};

/* 📨 Invites */
commands.inv = {
  cat: 'Invites', desc: 'Invite stats', usage: 'inv <@user|userID>',
  async run(m, a) {
    let target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
    if (!target && !a[0]) target = m.member;
    if (!target) return m.reply({ embeds: [usageE('inv', '!inv <@user|userID>')] });
    const totalInvites = inviteData.counts[target.id] || 0;
    const invitedIds = Object.entries(inviteData.members).filter(([, inviterId]) => inviterId === target.id).map(([uid]) => uid);
    const stillIn = invitedIds.filter(uid => m.guild.members.cache.has(uid));
    const left    = invitedIds.filter(uid => !m.guild.members.cache.has(uid));
    const e = infoE(`📨 Invites — ${target.user.tag}`)
      .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🏆 Total', value: `**${totalInvites}**`, inline: true },
        { name: '🟢 Still in', value: `**${stillIn.length}**`, inline: true },
        { name: '🔴 Left', value: `**${left.length}**`, inline: true }
      );
    if (invitedIds.length) {
      const list = invitedIds.slice(0, 30).map((uid, i) => `**#${i + 1}** ${m.guild.members.cache.has(uid) ? '🟢' : '🔴'} <@${uid}>`).join('\n');
      e.addFields({ name: `👥 Invited (${invitedIds.length})`, value: list.slice(0, 1020) });
    }
    m.reply({ embeds: [e] });
  }
};

commands.leaderboard = {
  cat: 'Invites', desc: 'Top inviters',
  async run(m) {
    const entries = Object.entries(inviteData.counts).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 20);
    if (!entries.length) return m.reply({ embeds: [infoE('🏆 Invite Leaderboard', 'No invites recorded yet.')] });
    const medals = ['🥇', '🥈', '🥉'];
    const list = entries.map(([userId, count], i) => {
      const prefix = medals[i] || `**#${i + 1}**`;
      const stillIn = Object.entries(inviteData.members).filter(([uid, inviterId]) => inviterId === userId && m.guild.members.cache.has(uid)).length;
      return `${prefix} <@${userId}> — **${count}** invites *(🟢 ${stillIn})*`;
    }).join('\n');
    m.reply({ embeds: [new EmbedBuilder().setColor(0xf0c264).setTitle('🏆 Invite Leaderboard').setDescription(list).setTimestamp()] });
  }
};
commands.top = commands.leaderboard;
commands.invites = commands.leaderboard;

commands.invdebug = {
  cat: 'Invites', desc: 'Debug invites',
  async run(m) {
    if (m.guild.ownerId !== m.author.id && !has(m.member, PermissionFlagsBits.Administrator))
      return m.reply({ embeds: [reasonE('invdebug', 'Only the **Server Owner** or an **Administrator** can use this.')] });
    const fileExists = fs.existsSync(INVITE_FILE);
    const fileSize = fileExists ? fs.statSync(INVITE_FILE).size : 0;
    const backupExists = fs.existsSync(INVITE_BACKUP);
    const backupSize = backupExists ? fs.statSync(INVITE_BACKUP).size : 0;
    const e = infoE('🩺 Invite Debug')
      .addFields(
        { name: '📁 Main', value: `${fileExists ? '✅' : '❌'} (${fileSize}b)` },
        { name: '💾 Backup', value: `${backupExists ? '✅' : '❌'} (${backupSize}b)` },
        { name: '📂 DATA_DIR', value: `\`${DATA_DIR}\`` },
        { name: '👥 Members', value: `${Object.keys(inviteData.members).length}`, inline: true },
        { name: '🏆 Inviters', value: `${Object.keys(inviteData.counts).length}`, inline: true },
        { name: '🔊 Temp Rooms', value: `${tempRooms.size}`, inline: true }
      );
    m.reply({ embeds: [e] });
  }
};

commands.invbackup = {
  cat: 'Invites', desc: 'Backup invites',
  async run(m) {
    if (m.guild.ownerId !== m.author.id && !has(m.member, PermissionFlagsBits.Administrator))
      return m.reply({ embeds: [reasonE('invbackup', 'Only the **Server Owner** or an **Administrator** can use this.')] });
    try {
      const json = JSON.stringify(inviteData, null, 2);
      const buf = Buffer.from(json, 'utf8');
      const file = new AttachmentBuilder(buf, { name: `invite-backup-${Date.now()}.json` });
      await m.reply({ content: '💾 **Backup**', files: [file] });
    } catch (e) { m.reply({ embeds: [reasonE('invbackup', `Backup failed.`, e.message)] }); }
  }
};

commands.invrestore = {
  cat: 'Invites', desc: 'Restore invites',
  async run(m) {
    if (m.guild.ownerId !== m.author.id && !has(m.member, PermissionFlagsBits.Administrator))
      return m.reply({ embeds: [reasonE('invrestore', 'Only the **Server Owner** or an **Administrator** can use this.')] });
    if (!m.attachments.size) return m.reply({ embeds: [reasonE('invrestore', 'Please attach a `.json` backup file with the command.')] });
    const att = m.attachments.first();
    if (!att.name.endsWith('.json')) return m.reply({ embeds: [reasonE('invrestore', 'The file must be a `.json` file.')] });
    try {
      const res = await fetch(att.url);
      const text = await res.text();
      const parsed = JSON.parse(text);
      if (!parsed.counts || !parsed.members) return m.reply({ embeds: [reasonE('invrestore', 'The file format is invalid (missing `counts` or `members`).')] });
      inviteData.members = parsed.members || {};
      inviteData.counts = parsed.counts || {};
      inviteData.knownMembers = parsed.knownMembers || {};
      inviteData.meta = parsed.meta || {};
      saveInviteData();
      m.reply({ embeds: [okE('✅ Restored!')] });
    } catch (e) { m.reply({ embeds: [reasonE('invrestore', `Failed to restore.`, e.message)] }); }
  }
};

/* 🎫 Tickets */
commands.ticketpanel = { cat: 'Tickets', desc: 'Send ticket panel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator))
    return m.reply({ embeds: [reasonE('ticketpanel', 'You need the **Administrator** permission.')] });
  const ch = m.channel;
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('🎫 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Ticket Support System')
    .setDescription('• 🔥 **Pub**\n• 🐛 **Bugs**\n• ⚔️ **Abuse**\n• 🔒 **Server**\n• 🛠️ **Staff Abuse**\n• 💰 **Donate**')
    .setThumbnail(m.guild.iconURL({ size: 256 }) || null)
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷' }).setTimestamp();
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
  try { await ch.send({ embeds: [embed], components: [row1, row2] }); m.reply({ embeds: [okE('✅ Sent')] }).catch(()=>{}); }
  catch (e) { m.reply({ embeds: [reasonE('ticketpanel', 'Failed to send the panel.', e.message)] }); }
}};

commands.ticketclose = { cat: 'Tickets', desc: 'Close ticket', async run(m) {
  const ticket = ticketConfig.tickets[m.channel.id];
  if (!ticket) return m.reply({ embeds: [reasonE('ticketclose', 'This channel is not an open ticket.')] });
  await m.channel.send({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle('🔒 Closing...')] });
  delete ticketConfig.tickets[m.channel.id];
  saveJson(path.join(DATA_DIR, 'ticket-config.json'), ticketConfig);
  setTimeout(() => m.channel.delete().catch(()=>{}), 5000);
}};

/* 🤖 !wyh */
commands.wyh = { cat: 'Security', desc: 'Whitelist a bot (code 1325)', usage: 'wyh <botUserId>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [noPermE('wyh', 3, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('wyh', '!wyh <botUserId>')] });
  const targetId = a[0].replace(/[<@!>]/g, '').trim();
  const user = await client.users.fetch(targetId).catch(()=>null);
  if (!user) return m.reply({ embeds: [reasonE('wyh', `No Discord user found with ID \`${targetId}\`.`)] });
  if (!user.bot) return m.reply({ embeds: [reasonE('wyh', 'That user is not a bot. Use `!wytlistlink` for regular users.')] });
  const modal = new ModalBuilder().setCustomId(`wyh_modal_${targetId}`).setTitle('Bot Whitelist');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('wyh_code').setLabel('Security Code').setStyle(TextInputStyle.Short).setRequired(true)
  ));
  return m.showModal(modal).catch(()=>{});
}};
commands.unwyh = { cat: 'Security', desc: 'Remove bot', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [noPermE('unwyh', 3, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('unwyh', '!unwyh <botUserId>')] });
  const targetId = a[0].replace(/[<@!>]/g, '').trim();
  if (!isBotWhitelisted(targetId)) return m.reply({ embeds: [reasonE('unwyh', `Bot \`${targetId}\` is not in the whitelist.`)] });
  delete botWhitelist.bots[targetId];
  saveJson(path.join(DATA_DIR, 'bot-whitelist.json'), botWhitelist);
  m.reply({ embeds: [okE('🗑️ Removed')] });
}};
commands.wyhlist = { cat: 'Security', desc: 'List bots', async run(m) {
  const entries = Object.entries(botWhitelist.bots);
  if (!entries.length) return m.reply({ embeds: [infoE('Bot Whitelist', 'The list is empty.')] });
  const list = entries.map(([id], i) => `**#${i+1}** <@${id}>`).join('\n');
  m.reply({ embeds: [infoE(`🤖 Bots (${entries.length})`).setDescription(list)] });
}};

/* 🎲 !khtar */
commands.khtar = { cat: 'Fun', desc: 'Pick winner', usage: 'khtar <messageID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [noPermE('khtar', 2, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('khtar', '!khtar <messageID>')] });
  const messageId = a[0].replace(/[<>&]/g, '').trim();
  let targetMsg;
  try { targetMsg = await m.channel.messages.fetch(messageId); }
  catch { return m.reply({ embeds: [reasonE('khtar', `Message \`${messageId}\` was not found in this channel.`)] }); }
  if (targetMsg.reactions.cache.size === 0) return m.reply({ embeds: [reasonE('khtar', 'That message has no reactions.')] });
  const reactors = new Set();
  for (const [, reaction] of targetMsg.reactions.cache) {
    const fetched = await reaction.users.fetch({ limit: 100 }).catch(()=>null);
    if (fetched) fetched.forEach(u => { if (!u.bot) reactors.add(u.id); });
  }
  const participants = [...reactors];
  if (!participants.length) return m.reply({ embeds: [reasonE('khtar', 'No valid participants (only bots reacted).')] });
  const winnerId = participants[Math.floor(Math.random() * participants.length)];
  await m.channel.send({ content: `🎉 <@${winnerId}>`, embeds: [okE('🎉 Winner!', `## 🏆 <@${winnerId}>\n**Participants:** ${participants.length}`)] });
}};
commands.pick = commands.khtar;

commands.verifypanel = { cat: 'Verify', desc: 'Send verify panel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [reasonE('verifypanel', 'You need the **Administrator** permission.')] });
  let ch = m.guild.channels.cache.get(VERIFY_CHANNEL_ID) || await m.guild.channels.fetch(VERIFY_CHANNEL_ID).catch(()=>null);
  if (!ch || !ch.isTextBased()) return m.reply({ embeds: [reasonE('verifypanel', 'Verify channel was not found or is not a text channel.')] });
  const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle('✅ Verification').setDescription('Click to verify').setTimestamp();
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_button').setLabel('Verify').setEmoji('✅').setStyle(ButtonStyle.Success));
  await ch.send({ embeds: [embed], components: [row] });
  m.reply({ embeds: [okE('✅ Sent')] }).catch(()=>{});
}};

commands.applypanel = { cat: 'Verify', desc: 'Send apply panel', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [reasonE('applypanel', 'You need the **Administrator** permission.')] });
  const ch = m.guild.channels.cache.get(APPLY_STAFF_CHANNEL_ID) || await m.guild.channels.fetch(APPLY_STAFF_CHANNEL_ID).catch(()=>null);
  if (!ch || !ch.isTextBased()) return m.reply({ embeds: [reasonE('applypanel', 'Apply staff channel was not found or is not a text channel.')] });
  let imageURL = (a[0] || '').trim();
  if (!imageURL && m.attachments.size) imageURL = m.attachments.first().url;
  if (!imageURL) return m.reply({ embeds: [reasonE('applypanel', 'Please attach an image with the command (used in the panel).', 'Example: `!applypanel` + attach image')] });
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('📝 Apply for Staff — 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷')
    .setDescription('**Want to become staff?**\n\n🎮 **Apply Staff Minecraft**\n💬 **Apply Staff Discord**')
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷' }).setTimestamp();
  if (imageURL) embed.setImage(imageURL);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_minecraft').setLabel('Apply Staff Minecraft').setEmoji('🎮').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('apply_discord').setLabel('Apply Staff Discord').setEmoji('💬').setStyle(ButtonStyle.Primary));
  try { await ch.send({ embeds: [embed], components: [row] }); m.reply({ embeds: [okE('✅ Sent')] }).catch(()=>{}); }
  catch (e) { m.reply({ embeds: [reasonE('applypanel', 'Failed to send the panel.', e.message)] }); }
}};

/* Moderation */
commands.ban = { cat: 'Moderation', desc: 'Ban a member', usage: 'ban <@user> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [noPermE('ban', 8, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('ban', '!ban <@user> [reason]')] });
  const t = (await resolveMember(m, a[0])) || (await resolveMemberById(m.guild, a[0]));
  if (!t) return m.reply({ embeds: [reasonE('ban', `Member \`${a[0]}\` was not found.`)] });
  if (!canModerate(m.member, t)) return m.reply({ embeds: [reasonE('ban', `You can't ban **${t.user.tag}** — their highest role is at or above yours.`)] });
  if (!t.bannable) return m.reply({ embeds: [reasonE('ban', `I can't ban **${t.user.tag}** — their role is higher than mine, or they're an admin.`)] });
  const r = a.slice(1).join(' ') || 'No reason';
  try {
    await t.ban({ reason: `${m.author.tag} [${tier.label}]: ${r}` });
    const e = okE('🔨 Banned').addFields(
      { name: 'User', value: t.user.tag, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'Reason', value: r });
    m.reply({ embeds: [e] }); sendLog(m.guild, BAN_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [reasonE('ban', `Discord refused the ban.`, err.message)] }); }
}};

commands.unban = { cat: 'Moderation', desc: 'Unban a user', usage: 'unban <userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [noPermE('unban', 8, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('unban', '!unban <userID>')] });
  try {
    await m.guild.bans.remove(a[0], a.slice(1).join(' ') || undefined);
    m.reply({ embeds: [okE('🔓 Unbanned')] });
  } catch (err) { m.reply({ embeds: [reasonE('unban', `Could not unban \`${a[0]}\`.`, err.message)] }); }
}};

commands.kick = { cat: 'Moderation', desc: 'Kick a member', usage: 'kick <@user> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canKick) return m.reply({ embeds: [noPermE('kick', 3, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('kick', '!kick <@user> [reason]')] });
  const t = (await resolveMember(m, a[0])) || (await resolveMemberById(m.guild, a[0]));
  if (!t) return m.reply({ embeds: [reasonE('kick', `Member \`${a[0]}\` was not found.`)] });
  if (!canModerate(m.member, t)) return m.reply({ embeds: [reasonE('kick', `You can't kick **${t.user.tag}** — their highest role is at or above yours.`)] });
  if (!t.kickable) return m.reply({ embeds: [reasonE('kick', `I can't kick **${t.user.tag}** — their role is higher than mine.`)] });
  const r = a.slice(1).join(' ') || 'No reason';
  try {
    await t.kick(`${m.author.tag} [${tier.label}]: ${r}`);
    const e = okE('👢 Kicked').addFields(
      { name: 'User', value: t.user.tag, inline: true },
      { name: 'By', value: `${m.author.tag} (${tier.label})`, inline: true },
      { name: 'Reason', value: r });
    m.reply({ embeds: [e] }); sendLog(m.guild, KICK_LOG_CHANNEL_ID || GENERAL_LOG_CHANNEL_ID, e);
  } catch (err) { m.reply({ embeds: [reasonE('kick', `Discord refused the kick.`, err.message)] }); }
}};

commands.mute = { cat: 'Moderation', desc: 'Voice-mute', usage: 'mute <@user> <minutes|perm> <reason>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canMute) return m.reply({ embeds: [noPermE('mute', 1, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('mute', '!mute <@user> <minutes|perm> <reason>', ['!mute @User 10 spam'])] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [reasonE('mute', `Member \`${a[0]}\` was not found.`)] });
  if (!canModerate(m.member, target)) return m.reply({ embeds: [reasonE('mute', `You can't mute **${target.user.tag}** — their role is at or above yours.`)] });
  if (!a[1]) return m.reply({ embeds: [reasonE('mute', 'Please specify a duration.', 'Format: `10` = 10 minutes, `perm` = permanent')] });
  const durArg = a[1].trim().toLowerCase();
  const reason = a.slice(2).join(' ').trim();
  if (!reason) return m.reply({ embeds: [reasonE('mute', 'Please provide a reason for the mute.')] });
  let minutes = 0, permanent = false;
  if (durArg === 'perm' || durArg === 'permanent') {
    if (tier.maxMute !== -1) return m.reply({ embeds: [reasonE('mute', `Your rank (**${tier.label}**) can only mute for up to **${fmtMinutes(tier.maxMute)}**.`)] });
    permanent = true;
  } else {
    minutes = parseInt(durArg, 10);
    if (isNaN(minutes)) return m.reply({ embeds: [reasonE('mute', `\`${durArg}\` is not a valid duration.`, 'Use a number (minutes) or `perm`.')] });
    if (minutes < tier.minMute) return m.reply({ embeds: [reasonE('mute', `Minimum mute time is **${tier.minMute}m**.`)] });
    if (tier.maxMute !== -1 && minutes > tier.maxMute) return m.reply({ embeds: [reasonE('mute', `Your rank (**${tier.label}**) can only mute for up to **${fmtMinutes(tier.maxMute)}**.`)] });
  }
  if (!target.voice?.channel) return m.reply({ embeds: [reasonE('mute', `**${target.user.tag}** is not in a voice channel.`)] });
  try {
    await target.voice.setMute(true, `${m.author.tag}: ${reason}`);
    const key = `${m.guild.id}:${target.id}`;
    activeMutes[key] = { guildId: m.guild.id, userId: target.id, unmuteAt: permanent ? -1 : Date.now() + minutes * 60 * 1000, permanent, reason, modTag: m.author.tag, modTier: tier.label };
    saveJson(path.join(DATA_DIR, 'mute-config.json'), activeMutes);
    scheduleUnmute(key);
    m.reply({ embeds: [okE('🔇 Muted').addFields({ name: 'User', value: target.user.tag }, { name: 'Duration', value: permanent ? 'Permanent' : `${minutes}m` })] });
  } catch (err) { m.reply({ embeds: [reasonE('mute', `Discord refused the mute.`, err.message)] }); }
}};

commands.unmute = { cat: 'Moderation', desc: 'Unmute', usage: 'unmute <@user>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canMute) return m.reply({ embeds: [noPermE('unmute', 1, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('unmute', '!unmute <@user>')] });
  const t = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!t) return m.reply({ embeds: [reasonE('unmute', `Member \`${a[0]}\` was not found.`)] });
  if (!t.voice?.channel || !t.voice.serverMute) return m.reply({ embeds: [reasonE('unmute', `**${t.user.tag}** is not voice-muted.`)] });
  try {
    await t.voice.setMute(false, `Unmuted by ${m.author.tag}`);
    const key = `${m.guild.id}:${t.id}`;
    if (activeMutes[key]) { delete activeMutes[key]; saveJson(path.join(DATA_DIR, 'mute-config.json'), activeMutes); if (muteTimers.has(key)) { clearTimeout(muteTimers.get(key)); muteTimers.delete(key); } }
    m.reply({ embeds: [okE('🔊 Unmuted', t.user.tag)] });
  } catch (err) { m.reply({ embeds: [reasonE('unmute', `Discord refused the unmute.`, err.message)] }); }
}};

commands.timeout = { cat: 'Moderation', desc: 'Timeout', usage: 'timeout <@user> <min> <reason>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canTimeout) return m.reply({ embeds: [noPermE('timeout', 6, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('timeout', '!timeout <@user> <min> <reason>')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [reasonE('timeout', `Member \`${a[0]}\` was not found.`)] });
  if (!canModerate(m.member, target)) return m.reply({ embeds: [reasonE('timeout', `You can't timeout **${target.user.tag}** — their role is at or above yours.`)] });
  const minutes = parseInt(a[1], 10);
  const reason = a.slice(2).join(' ').trim();
  if (isNaN(minutes) || minutes < 1) return m.reply({ embeds: [reasonE('timeout', 'Please provide a valid duration in minutes.')] });
  if (!reason) return m.reply({ embeds: [reasonE('timeout', 'Please provide a reason for the timeout.')] });
  if (!target.moderatable) return m.reply({ embeds: [reasonE('timeout', `I can't timeout **${target.user.tag}** — their role is higher than mine.`)] });
  try {
    await target.timeout(minutes * 60 * 1000, `${m.author.tag}: ${reason}`);
    m.reply({ embeds: [okE('⏳ Timed Out', `${target.user.tag} — ${minutes}m`)] });
  } catch (err) { m.reply({ embeds: [reasonE('timeout', `Discord refused the timeout.`, err.message)] }); }
}};
commands.untimeout = { cat: 'Moderation', desc: 'Untimeout', usage: 'untimeout <@user>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canTimeout) return m.reply({ embeds: [noPermE('untimeout', 6, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('untimeout', '!untimeout <@user>')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [reasonE('untimeout', `Member \`${a[0]}\` was not found.`)] });
  if (!target.isCommunicationDisabled()) return m.reply({ embeds: [reasonE('untimeout', `**${target.user.tag}** is not timed out.`)] });
  try { await target.timeout(null, `Untimeout by ${m.author.tag}`); m.reply({ embeds: [okE('✅ Removed', target.user.tag)] }); }
  catch (err) { m.reply({ embeds: [reasonE('untimeout', `Discord refused.`, err.message)] }); }
}};

commands.warn = { cat: 'Moderation', desc: 'Warn', usage: 'warn <@user> [reason]', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canWarn) return m.reply({ embeds: [noPermE('warn', 1, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('warn', '!warn <@user> [reason]')] });
  const t = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!t) return m.reply({ embeds: [reasonE('warn', `Member \`${a[0]}\` was not found.`)] });
  if (!canModerate(m.member, t)) return m.reply({ embeds: [reasonE('warn', `You can't warn **${t.user.tag}** — their role is at or above yours.`)] });
  const r = a.slice(1).join(' ') || 'No reason';
  const list = warnings.get(t.id) || []; list.push({ mod: m.author.tag, reason: r, ts: Date.now() }); warnings.set(t.id, list);
  m.reply({ embeds: [okE('⚠️ Warned', `${t.user.tag} — Total: ${list.length}\nReason: ${r}`)] });
}};
commands.warnings = { cat: 'Moderation', desc: 'List warnings', usage: 'warnings <@user>', async run(m, a) {
  if (!a[0]) return m.reply({ embeds: [usageE('warnings', '!warnings <@user>')] });
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [reasonE('warnings', `User \`${a[0]}\` was not found.`)] });
  const list = warnings.get(u.id) || [];
  if (!list.length) return m.reply({ embeds: [infoE('No Warnings', `**${u.tag}** has no warnings.`)] });
  m.reply({ embeds: [infoE(`Warnings for ${u.tag}`).setDescription(list.map((w, i) => `**#${i+1}** — ${w.reason} *by ${w.mod}*`).join('\n'))] });
}};
commands.clearwarns = { cat: 'Moderation', desc: 'Clear warnings', usage: 'clearwarns <@user>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 3) return m.reply({ embeds: [noPermE('clearwarns', 3, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('clearwarns', '!clearwarns <@user>')] });
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [reasonE('clearwarns', `User \`${a[0]}\` was not found.`)] });
  warnings.delete(u.id);
  m.reply({ embeds: [okE('✅ Cleared', u.tag)] });
}};
commands.purge = { cat: 'Moderation', desc: 'Delete messages', usage: 'purge <1-100>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canPurge) return m.reply({ embeds: [noPermE('purge', 1, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('purge', '!purge <1-100>')] });
  const n = Math.min(Math.max(parseInt(a[0]) || 0, 1), 100);
  const del = await m.channel.bulkDelete(n, true).catch(()=>null);
  if (del) m.channel.send({ embeds: [okE('🧹 Purged', `${del.size}`)] }).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 4000));
  else m.reply({ embeds: [reasonE('purge', 'Could not delete messages. They may be older than 14 days.')] });
}};
commands.clear = commands.purge;
commands.slowmode = { cat: 'Moderation', desc: 'Slowmode', usage: 'slowmode <sec>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canSlowmode) return m.reply({ embeds: [noPermE('slowmode', 1, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('slowmode', '!slowmode <sec>')] });
  const s = Math.min(Math.max(parseInt(a[0]) || 0, 0), 21600);
  await m.channel.setRateLimitPerUser(s).catch(()=>{});
  m.reply({ embeds: [okE('⏱️ Slowmode', `${s}s`)] });
}};
commands.lock = { cat: 'Moderation', desc: 'Lock', async run(m) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canLock) return m.reply({ embeds: [noPermE('lock', 2, tier)] });
  await m.channel.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: false }).catch(()=>{});
  m.reply({ embeds: [okE('🔒 Locked')] });
}};
commands.unlock = { cat: 'Moderation', desc: 'Unlock', async run(m) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canLock) return m.reply({ embeds: [noPermE('unlock', 2, tier)] });
  await m.channel.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: null }).catch(()=>{});
  m.reply({ embeds: [okE('🔓 Unlocked')] });
}};
commands.hackban = { cat: 'Moderation', desc: 'Ban by ID', usage: 'hackban <userID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canBan) return m.reply({ embeds: [noPermE('hackban', 8, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('hackban', '!hackban <userID>')] });
  try { await m.guild.bans.create(a[0], { reason: `${m.author.tag}: hackban` }); m.reply({ embeds: [okE('🔨 Hackbanned')] }); }
  catch (err) { m.reply({ embeds: [reasonE('hackban', `Could not ban ID \`${a[0]}\`.`, err.message)] }); }
}};

commands.move = { cat: 'Moderation', desc: 'Move member', usage: 'move <@user> <#voice>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canMove) return m.reply({ embeds: [noPermE('move', 2, tier)] });
  if (!a[0] || !a[1]) return m.reply({ embeds: [usageE('move', '!move <@user> <#voice>')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [reasonE('move', `Member \`${a[0]}\` was not found.`)] });
  if (!canModerate(m.member, target)) return m.reply({ embeds: [reasonE('move', `You can't move **${target.user.tag}** — their role is at or above yours.`)] });
  let destCh = m.mentions.channels.first();
  if (!destCh) {
    const chStr = a[1].trim().replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(chStr)) destCh = m.guild.channels.cache.get(chStr);
  }
  if (!destCh) return m.reply({ embeds: [reasonE('move', `Voice channel \`${a[1]}\` was not found.`)] });
  const fromCh = target.voice?.channel;
  if (!fromCh) return m.reply({ embeds: [reasonE('move', `**${target.user.tag}** is not in a voice channel.`)] });
  try {
    await target.voice.setChannel(destCh, `Moved by ${m.author.tag}`);
    m.reply({ embeds: [okE('➡️ Moved', `${fromCh} → ${destCh}`)] });
  } catch (err) { m.reply({ embeds: [reasonE('move', `Discord refused the move.`, err.message)] }); }
}};

commands.nickname = { cat: 'Members', desc: 'Change nickname', usage: 'nickname <@user> <name>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canNickname) return m.reply({ embeds: [noPermE('nickname', 7, tier)] });
  if (!a[0] || a.length < 2) return m.reply({ embeds: [usageE('nickname', '!nickname <@user> <name>')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [reasonE('nickname', `Member \`${a[0]}\` was not found.`)] });
  if (!canModerate(m.member, target)) return m.reply({ embeds: [reasonE('nickname', `You can't change **${target.user.tag}**'s nickname — their role is at or above yours.`)] });
  const nickname = a.slice(1).join(' ').trim().slice(0, 32);
  try { await target.setNickname(nickname, `By ${m.author.tag}`); m.reply({ embeds: [okE('✏️ Changed', `${target.user.tag} → ${nickname}`)] }); }
  catch (err) { m.reply({ embeds: [reasonE('nickname', `Discord refused the change.`, err.message)] }); }
}};
commands.resetnick = { cat: 'Members', desc: 'Reset nickname', usage: 'resetnick <@user>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canNickname) return m.reply({ embeds: [noPermE('resetnick', 7, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('resetnick', '!resetnick <@user>')] });
  const target = m.mentions.members.first() || await resolveMemberById(m.guild, a[0]);
  if (!target) return m.reply({ embeds: [reasonE('resetnick', `Member \`${a[0]}\` was not found.`)] });
  try { await target.setNickname(null, `Reset by ${m.author.tag}`); m.reply({ embeds: [okE('↩️ Reset')] }); }
  catch (err) { m.reply({ embeds: [reasonE('resetnick', `Discord refused.`, err.message)] }); }
}};

commands.giveaway = { cat: 'Fun', desc: 'Start a giveaway', usage: 'giveaway <time> <winners> <prize>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [noPermE('giveaway', 2, tier)] });
  if (a.length < 3) return m.reply({ embeds: [usageE('giveaway', '!giveaway <time> <winners> <prize>', ['!giveaway 10m 1 Nitro'])] });
  const durationMs = parseDuration(a[0]);
  if (!durationMs) return m.reply({ embeds: [reasonE('giveaway', `\`${a[0]}\` is not a valid duration.`, 'Examples: `10s`, `5m`, `2h`, `1d`')] });
  const winners = parseInt(a[1], 10);
  if (isNaN(winners) || winners < 1 || winners > 50) return m.reply({ embeds: [reasonE('giveaway', `The number of winners must be between 1 and 50.`)] });
  let rest = a.slice(2), imageURL = '';
  if (rest.length > 1 && /^https?:\/\/\S+/i.test(rest[rest.length - 1])) imageURL = rest.pop();
  if (!imageURL && m.attachments.size) imageURL = m.attachments.first().url;
  const prize = rest.join(' ').trim();
  if (!prize) return m.reply({ embeds: [reasonE('giveaway', 'Please provide the prize name.')] });
  const gw = { guildId: m.guild.id, channelId: m.channel.id, hostId: m.author.id, prize, winners, imageURL, endsAt: Date.now() + durationMs, ended: false, entries: [], winnerIds: [] };
  let msg;
  try { msg = await m.channel.send({ embeds: [buildGiveawayEmbed(gw, false)] }); await msg.react('🎉'); }
  catch (err) { return m.reply({ embeds: [reasonE('giveaway', `Could not send the giveaway message.`, err.message)] }); }
  activeGiveaways[msg.id] = gw;
  saveJson(path.join(DATA_DIR, 'giveaway-config.json'), activeGiveaways);
  giveawayTimers.set(msg.id, setTimeout(() => endGiveaway(msg.id).catch(()=>{}), durationMs));
  m.reply({ embeds: [okE('✅ Started!')] }).catch(()=>{});
}};
commands.gend = { cat: 'Fun', desc: 'End a giveaway', usage: 'gend <messageID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || !tier.canGiveaway) return m.reply({ embeds: [noPermE('gend', 2, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('gend', '!gend <messageID>')] });
  const id = a[0].trim();
  const gw = activeGiveaways[id];
  if (!gw) return m.reply({ embeds: [reasonE('gend', `No giveaway found with ID \`${id}\`.`)] });
  await endGiveaway(id);
  m.reply({ embeds: [okE('✅ Ended')] }).catch(()=>{});
}};

commands.userinfo = { cat: 'Members', desc: 'User info', usage: 'userinfo [@user]', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  const mem = await m.guild.members.fetch(u.id).catch(()=>null);
  const e = infoE(`👤 ${u.tag}`).setThumbnail(u.displayAvatarURL({ size: 256 })).addFields(
    { name: 'ID', value: u.id, inline: true }, { name: 'Bot', value: u.bot ? 'Yes' : 'No', inline: true });
  if (mem) e.addFields({ name: 'Joined', value: `<t:${Math.floor(mem.joinedTimestamp/1000)}:R>`, inline: true });
  m.reply({ embeds: [e] });
}};
commands.serverinfo = { cat: 'Members', desc: 'Server info', async run(m) {
  const g = m.guild;
  m.reply({ embeds: [infoE(`📊 ${g.name}`).addFields(
    { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
    { name: 'Members', value: `${g.memberCount}`, inline: true },
    { name: 'Channels', value: `${g.channels.cache.size}`, inline: true },
    { name: 'Roles', value: `${g.roles.cache.size}`, inline: true })] });
}};
commands.avatar = { cat: 'Members', desc: 'Avatar', usage: 'avatar [@user]', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  m.reply({ embeds: [infoE(`🖼️ ${u.tag}`).setImage(u.displayAvatarURL({ size: 1024 }))] });
}};
commands.membercount = { cat: 'Members', desc: 'Count', async run(m) { m.reply({ embeds: [infoE('👥', `${m.guild.memberCount}`)] }); }};
commands.roleslist = { cat: 'Members', desc: 'List roles', async run(m) {
  m.reply({ embeds: [infoE('🏷️ Roles').setDescription(m.guild.roles.cache.sort((a,b)=>b.position-a.position).map(r => r.toString()).join(' ').slice(0, 4000))] });
}};
commands.afk = { cat: 'Members', desc: 'AFK', usage: 'afk [reason]', async run(m, a) {
  afks.set(m.author.id, a.join(' ') || 'AFK');
  m.reply({ embeds: [okE('💤 AFK', afks.get(m.author.id))] });
}};
commands.whois = commands.userinfo;

commands.help = { cat: 'Utility', desc: 'Commands list', usage: 'help [command]', async run(m, a) {
  if (a[0]) {
    const c = commands[a[0].toLowerCase()];
    if (!c) return m.reply({ embeds: [reasonE('help', `Command \`!${a[0]}\` does not exist.`)] });
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
commands.ping = { cat: 'Utility', desc: 'Ping', async run(m) {
  const s = await m.reply('🏓...');
  s.edit({ content: null, embeds: [okE('🏓 Pong!', `Gateway: **${client.ws.ping}ms**`)] });
}};
commands.uptime = { cat: 'Utility', desc: 'Uptime', async run(m) { m.reply({ embeds: [infoE('⏱️', fmtDur(client.uptime))] }); }};
commands.botinfo = { cat: 'Utility', desc: 'Bot info', async run(m) {
  m.reply({ embeds: [infoE('🤖 Bot').addFields({ name: 'Tag', value: client.user.tag }, { name: 'Uptime', value: fmtDur(client.uptime) })] });
}};
commands.poll = { cat: 'Utility', desc: 'Poll', usage: 'poll Q? | a | b', async run(m, a) {
  const [q, ...opts] = a.join(' ').split('|').map(s => s.trim());
  if (!q || !opts.length) return m.reply({ embeds: [usageE('poll', '!poll Q? | opt1 | opt2')] });
  const nums = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const msg = await m.channel.send({ embeds: [infoE(`📊 ${q}`).setDescription(opts.map((o, i) => `${nums[i]} ${o}`).join('\n'))] });
  for (let i = 0; i < Math.min(opts.length, 10); i++) await msg.react(nums[i]);
}};
commands.calculate = { cat: 'Utility', desc: 'Calculate', usage: 'calculate <expr>', async run(m, a) {
  const e = a.join(' ').replace(/[^0-9+\-*/(). %]/g, '');
  if (!e) return m.reply({ embeds: [usageE('calculate', '!calculate <expression>')] });
  try { m.reply({ embeds: [okE('🧮 Result', `\`${e}\` = **${Function(`"use strict"; return (${e});`)()}**`)] }); }
  catch { m.reply({ embeds: [reasonE('calculate', 'The expression is invalid.')] }); }
}};
commands.choose = { cat: 'Utility', desc: 'Choose random', usage: 'choose a b c', async run(m, a) {
  if (a.length < 2) return m.reply({ embeds: [usageE('choose', '!choose <opt1> <opt2>')] });
  m.reply({ embeds: [okE('🎲 I choose...', a[Math.floor(Math.random()*a.length)])] });
}};
commands.coinflip = { cat: 'Utility', desc: 'Coin flip', async run(m) { m.reply({ embeds: [okE('🪙 Coin', Math.random() < 0.5 ? 'Heads' : 'Tails')] }); }};
commands['8ball'] = { cat: 'Utility', desc: '8-ball', usage: '8ball <question>', async run(m, a) {
  const ans = ['Yes.','No.','Maybe.','Definitely.','Absolutely not.','Ask again.','I doubt it.','For sure!','Unlikely.'];
  m.reply({ embeds: [infoE('🎱 8-Ball', `❓ ${a.join(' ') || '...'}\n💬 **${ans[Math.floor(Math.random()*ans.length)]}**`)] });
}};

commands.ip = { cat: 'SMP', desc: 'Show IP', async run(m) { m.reply({ embeds: [infoE('🖥️ Server IP', `\`\`\`${MC_SERVER_IP}\`\`\``)] }); }};
commands.serverstatus = { cat: 'SMP', desc: 'MC status', async run(m) {
  try {
    const r = await fetch(`https://api.mcsrvstat.us/3/${MC_SERVER_IP}`).then(x => x.json());
    if (!r.online) return m.reply({ embeds: [errE('Offline')] });
    m.reply({ embeds: [infoE('🎮 Status').addFields({ name: 'Players', value: `${r.players?.online ?? 0}/${r.players?.max ?? 0}` }, { name: 'Version', value: r.version || '?' })] });
  } catch { m.reply({ embeds: [reasonE('serverstatus', 'The MC server status API is not responding.')] }); }
}};
commands.rules = { cat: 'SMP', desc: 'Show rules', async run(m) { m.reply({ embeds: [infoE('📜 Rules', '1. Be respectful.\n2. No hacks.\n3. No griefing.\n4. No spam.\n5. Follow staff.')] }); }};
commands.store = { cat: 'SMP', desc: 'Show store', async run(m) { m.reply({ embeds: [infoE('🛒 Store', MC_STORE_URL)] }); }};

commands.addvoice = { cat: 'Voice', desc: 'Join voice 24/7', usage: 'addvoice <voiceChannelID>', async run(m, a) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 7) return m.reply({ embeds: [noPermE('addvoice', 7, tier)] });
  if (!a[0]) return m.reply({ embeds: [usageE('addvoice', '!addvoice <voiceChannelID>')] });
  const id = a[0].replace(/[<#>]/g, '').trim();
  const ch = m.guild.channels.cache.get(id) || await m.guild.channels.fetch(id).catch(()=>null);
  if (!ch) return m.reply({ embeds: [reasonE('addvoice', `Voice channel \`${id}\` was not found.`)] });
  try { await connectToVoice(m.guild, ch.id); voiceConfig[m.guild.id] = ch.id; saveJson(path.join(DATA_DIR, 'voice-config.json'), voiceConfig); m.reply({ embeds: [okE('🔊 Connected')] }); }
  catch (e) { m.reply({ embeds: [reasonE('addvoice', `Failed to connect to the voice channel.`, e.message)] }); }
}};
commands.removevoice = { cat: 'Voice', desc: 'Disconnect', async run(m) {
  const tier = getStaffTier(m.member);
  if (!tier || tier.rank < 7) return m.reply({ embeds: [noPermE('removevoice', 7, tier)] });
  const conn = getVoiceConnection(m.guild.id);
  if (conn) { try { conn.destroy(); } catch {} }
  if (reconnectTimers.has(m.guild.id)) { clearTimeout(reconnectTimers.get(m.guild.id)); reconnectTimers.delete(m.guild.id); }
  delete voiceConfig[m.guild.id]; saveJson(path.join(DATA_DIR, 'voice-config.json'), voiceConfig);
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
    }
  }
  let newChannel;
  try {
    newChannel = await guild.channels.create({
      name: `ticket-${typeKey}-${user.username}`.slice(0, 100).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      type: ChannelType.GuildText,
      topic: `Ticket by ${user.tag} • Type: ${type.title}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: TICKET_SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory] }
      ]
    });
  } catch (e) { return { ok: false, reason: `Failed: ${e.message}` }; }
  ticketConfig.tickets[newChannel.id] = { userId: user.id, type: typeKey, createdAt: Date.now(), claimedBy: null, status: 'open' };
  saveJson(path.join(DATA_DIR, 'ticket-config.json'), ticketConfig);
  const welcome = new EmbedBuilder().setColor(type.color).setTitle(`${type.emoji} ${type.title}`)
    .setDescription(`Welcome <@${user.id}>! 👋\n\n**Type:** \`${type.title}\`\n\n> 🌸 Please describe your issue.`)
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷' }).setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('📌').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
  try { await newChannel.send({ content: `<@${user.id}> <@&${TICKET_SUPPORT_ROLE_ID}>`, embeds: [welcome], components: [row] }); } catch (e) {}
  return { ok: true, channel: newChannel };
}

/* ============================================================
 *                     EVENT: READY
 * ============================================================ */
client.once('ready', async () => {
  console.log('==============================');
  console.log(`[READY] ${client.user.tag}`);
  console.log(`[READY] Guilds: ${client.guilds.cache.size}`);
  console.log(`[READY] 📁 DATA_DIR: ${DATA_DIR}`);
  console.log(`[READY] 🔐 SECURITY CODE: ${BOT_WHITELIST_CODE}`);
  console.log(`[READY] 🎖️ Staff Tiers: ${STAFF_ROLES.length} ranks`);
  console.log(`[READY] 🔗 Link whitelist: !wytlistlink <userID> <code>`);
  console.log(`[READY] 📋 Staff info: !roll info`);
  console.log(`[READY] 🔊 Join-to-Create: ${JOIN_TO_CREATE_CHANNEL_ID}`);
  console.log('==============================');
  client.user.setActivity('𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 🍞', { type: ActivityType.Watching });
  for (const guild of client.guilds.cache.values()) await cacheGuildInvites(guild);
  await restoreAllVoiceConnections();
  await restoreMutes();
  await restoreGiveaways();
  setInterval(() => { try { saveInviteData(); } catch {} }, 5 * 60 * 1000);
});

/* ============================================================
 *  🚨 PROTECTION
 * ============================================================ */
client.on('channelDelete', async channel => {
  if (!channel.guild) return;
  if (tempRooms.has(channel.id)) { tempRooms.delete(channel.id); return; }
  try {
    const audit = await auditExec(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    const details = `📛 **#${channel.name}**\n🆔 \`${channel.id}\`\n📁 Type: \`${ChannelType[channel.type] || channel.type}\``;
    await checkAndPunishDangerousAction(channel.guild, audit, 'Channel Deleted 🗑️', details);
  } catch (err) {}
});

client.on('roleDelete', async role => {
  if (!role.guild) return;
  try {
    const audit = await auditExec(role.guild, AuditLogEvent.RoleDelete, role.id);
    const details = `📛 **${role.name}**\n🆔 \`${role.id}\`\n🎨 Color: \`${role.hexColor}\`\n👥 Members: \`${role.members.size}\``;
    await checkAndPunishDangerousAction(role.guild, audit, 'Role Deleted 🗑️', details);
  } catch (err) {}
});

client.on('guildBanAdd', async ban => {
  try {
    const audit = await auditExec(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    const details = `📛 **${ban.user.tag}** (\`${ban.user.id}\`)\n📝 Reason: \`${ban.reason || 'None'}\``;
    await checkAndPunishDangerousAction(ban.guild, audit, 'Member Banned 🔨', details);
  } catch (err) {}
});

client.on('guildMemberRemove', async member => {
  try {
    const audit = await auditExec(member.guild, AuditLogEvent.MemberKick, member.id);
    if (audit && audit.executor) {
      const details = `📛 **${member.user.tag}** (\`${member.id}\`)`;
      await checkAndPunishDangerousAction(member.guild, audit, 'Member Kicked 👢', details);
      return;
    }
    const e = errE('👋 Left').addFields({ name: 'User', value: member.user.tag });
    sendLog(member.guild, KICK_LOG_CHANNEL_ID || GENERAL_LOG_CHANNEL_ID, e);
  } catch (err) {}
});

client.on('channelCreate', async channel => {
  if (!channel.guild) return;
  if (tempRooms.has(channel.id)) return;
  try {
    const audit = await auditExec(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    const exec = audit?.executor;
    const e = new EmbedBuilder().setColor(0x57f287).setTitle('🚨 Channel Created')
      .addFields(
        { name: '📛 Channel', value: `${channel}`, inline: false },
        { name: '📁 Type', value: `\`${ChannelType[channel.type] || channel.type}\``, inline: true },
        { name: '👤 By', value: exec ? `${exec.tag}` : '`Unknown`', inline: true }
      ).setFooter({ text: '⚠️ PERMA LOG' }).setTimestamp();
    sendLog(channel.guild, PERMA_LOG_CHANNEL_ID, e);
  } catch (err) {}
});

client.on('roleCreate', async role => {
  if (!role.guild) return;
  try {
    const audit = await auditExec(role.guild, AuditLogEvent.RoleCreate, role.id);
    const exec = audit?.executor;
    const e = new EmbedBuilder().setColor(0x57f287).setTitle('🚨 Role Created')
      .addFields(
        { name: '📛 Role', value: `${role}`, inline: false },
        { name: '🎨 Color', value: `\`${role.hexColor}\``, inline: true },
        { name: '👤 By', value: exec ? `${exec.tag}` : '`Unknown`', inline: true }
      ).setFooter({ text: '⚠️ PERMA LOG' }).setTimestamp();
    sendLog(role.guild, PERMA_LOG_CHANNEL_ID, e);
  } catch (err) {}
});

client.on('guildUpdate', async (oldGuild, newGuild) => {
  try {
    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push({ name: '📝 Name', value: `\`${oldGuild.name}\` → \`${newGuild.name}\`` });
    if (oldGuild.iconURL() !== newGuild.iconURL()) changes.push({ name: '🖼️ Icon', value: 'changed' });
    if (oldGuild.bannerURL() !== newGuild.bannerURL()) changes.push({ name: '🎨 Banner', value: 'changed' });
    if (!changes.length) return;
    const audit = await auditExec(newGuild, AuditLogEvent.GuildUpdate);
    const exec = audit?.executor;
    const e = new EmbedBuilder().setColor(C.perma).setTitle('🚨 Server Updated')
      .setFooter({ text: '⚠️ PERMA LOG' }).setTimestamp();
    for (const c of changes) e.addFields(c);
    if (exec) e.addFields({ name: '👤 By', value: `${exec.tag}` });
    sendLog(newGuild, PERMA_LOG_CHANNEL_ID, e);
  } catch (err) {}
});

/* Invite events */
client.on('inviteCreate', invite => {
  if (!invite.guild) return;
  const cached = invitesCache.get(invite.guild.id) || new Map();
  cached.set(invite.code, invite.uses || 0);
  invitesCache.set(invite.guild.id, cached);
});
client.on('inviteDelete', invite => {
  if (!invite.guild) return;
  const cached = invitesCache.get(invite.guild.id);
  if (cached) cached.delete(invite.code);
});

/* Member join */
client.on('guildMemberAdd', async member => {
  if (member.user.bot) {
    if (member.id === client.user.id) return;
    if (isBotWhitelisted(member.id)) return;
    try {
      await member.ban({ reason: 'Unauthorized bot.', deleteMessageSeconds: 3600 });
      sendLog(member.guild, BAN_LOG_CHANNEL_ID, errE('🔨 Unauthorized Bot Banned', member.user.tag));
    } catch (err) {}
    return;
  }
  try {
    const isRejoin = !!inviteData.knownMembers[member.id];
    const usedInvite = await findUsedInvite(member.guild);
    if (isRejoin) {
      const originalInviter = inviteData.members[member.id];
      sendLog(member.guild, INVITE_LOG_CHANNEL_ID, infoE('🔁 Member Rejoined (not counted)').addFields(
        { name: 'Member', value: `${member.user.tag} (\`${member.id}\`)`, inline: false },
        { name: 'Original Inviter', value: originalInviter ? `<@${originalInviter}> (\`${originalInviter}\`)` : '`Unknown`', inline: true },
        { name: 'Note', value: '**Not counted** 🛡️', inline: false }
      ));
    } else if (usedInvite && usedInvite.inviter) {
      const inviterId = usedInvite.inviter.id;
      inviteData.members[member.id] = inviterId;
      inviteData.counts[inviterId] = (inviteData.counts[inviterId] || 0) + 1;
      inviteData.knownMembers[member.id] = true;
      inviteData.meta[member.id] = { joinedAt: Date.now(), code: usedInvite.code, inviterId };
      saveInviteData();
      const total = inviteData.counts[inviterId];
      sendLog(member.guild, INVITE_LOG_CHANNEL_ID, infoE('📨 New Member Joined').addFields(
        { name: 'Member', value: `${member.user.tag} (\`${member.id}\`)`, inline: false },
        { name: 'Invited by', value: `<@${inviterId}> (\`${inviterId}\`)`, inline: true },
        { name: 'Invite Code', value: `\`${usedInvite.code}\``, inline: true },
        { name: 'Their Total Invites', value: `**${total}** 🏆`, inline: true }
      ));
    } else {
      inviteData.knownMembers[member.id] = true;
      saveInviteData();
      sendLog(member.guild, INVITE_LOG_CHANNEL_ID, infoE('📨 New Member Joined').addFields(
        { name: 'Member', value: `${member.user.tag} (\`${member.id}\`)`, inline: false },
        { name: 'Invited by', value: '`Unknown`', inline: false }
      ));
    }
  } catch (e) {}
  if (UNVERIFIED_ROLE_ID) { try { await member.roles.add(UNVERIFIED_ROLE_ID, 'Auto role'); } catch (e) {} }
  joinLog.push(Date.now());
  while (joinLog.length && Date.now() - joinLog[0] > 10000) joinLog.shift();
  if (joinLog.length >= 8) { try { await member.kick('Anti-raid'); } catch {} return; }
  await sendWelcome(member.guild, member);
});

/* ============================================================
 *             INTERACTIONS
 * ============================================================ */
client.on(Events.InteractionCreate, async interaction => {

  if (interaction.isModalSubmit()) {
    const id = interaction.customId;

    if (id.startsWith('wyh_modal_')) {
      const targetId = id.replace('wyh_modal_', '');
      const code = interaction.fields.getTextInputValue('wyh_code').trim();
      if (code !== BOT_WHITELIST_CODE) return interaction.reply({ embeds: [reasonE('wyh', 'The security code is incorrect.')], ephemeral: true });
      const tier = getStaffTier(interaction.member);
      if (!tier || tier.rank < 3) return interaction.reply({ embeds: [noPermE('wyh', 3, tier)], ephemeral: true });
      const user = await client.users.fetch(targetId).catch(()=>null);
      if (!user || !user.bot) return interaction.reply({ embeds: [reasonE('wyh', 'That is not a bot.')], ephemeral: true });
      botWhitelist.bots[targetId] = { addedBy: interaction.user.tag, addedAt: Date.now() };
      saveJson(path.join(DATA_DIR, 'bot-whitelist.json'), botWhitelist);
      await interaction.reply({ embeds: [okE('✅ Bot Whitelisted', `<@${targetId}>`)], ephemeral: true });
      return;
    }

    if (id.startsWith('vc_rename_modal_')) {
      const voiceId = id.replace('vc_rename_modal_', '');
      const newName = interaction.fields.getTextInputValue('new_name').trim().slice(0, 100);
      const room = tempRooms.get(voiceId);
      if (!room) return interaction.reply({ embeds: [reasonE('vc_rename', 'This temp room no longer exists.')], ephemeral: true });
      if (room.ownerId !== interaction.user.id) return interaction.reply({ embeds: [reasonE('vc_rename', 'You are not the owner of this room.')], ephemeral: true });
      try {
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (ch) await ch.setName(newName, `Renamed by ${interaction.user.tag}`);
        room.name = newName;
        await updateRoomPanel(voiceId);
        await interaction.reply({ embeds: [okE('✅ Renamed', `\`${newName}\``)], ephemeral: true });
      } catch (e) { interaction.reply({ embeds: [reasonE('vc_rename', 'Discord refused the change.', e.message)], ephemeral: true }); }
      return;
    }

    return;
  }

  if (interaction.isStringSelectMenu()) {
    const id = interaction.customId;

    if (id.startsWith('vc_kick_select_')) {
      const voiceId = id.replace('vc_kick_select_', '');
      const targetId = interaction.values[0];
      const room = tempRooms.get(voiceId);
      if (!room) return interaction.update({ embeds: [reasonE('vc_kick', 'This room no longer exists.')], components: [] });
      if (room.ownerId !== interaction.user.id) return interaction.update({ embeds: [reasonE('vc_kick', 'You are not the owner.')], components: [] });
      try {
        const member = await interaction.guild.members.fetch(targetId).catch(()=>null);
        if (!member || !member.voice?.channelId || member.voice.channelId !== voiceId)
          return interaction.update({ embeds: [reasonE('vc_kick', 'That user is not in your room.')], components: [] });
        await member.voice.disconnect('Kicked by room owner').catch(()=>{});
        await interaction.update({ embeds: [okE('👢 Kicked', `<@${targetId}>`)] });
      } catch (e) { interaction.update({ embeds: [reasonE('vc_kick', 'Discord refused.', e.message)], components: [] }); }
      return;
    }

    if (id.startsWith('vc_permit_select_')) {
      const voiceId = id.replace('vc_permit_select_', '');
      const targetId = interaction.values[0];
      const room = tempRooms.get(voiceId);
      if (!room) return interaction.update({ embeds: [reasonE('vc_permit', 'This room no longer exists.')], components: [] });
      if (room.ownerId !== interaction.user.id) return interaction.update({ embeds: [reasonE('vc_permit', 'You are not the owner.')], components: [] });
      room.allowed.add(targetId);
      try {
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (ch) await ch.permissionOverwrites.edit(targetId, { ViewChannel: true, Connect: true, Speak: true }).catch(()=>{});
      } catch (e) {}
      await updateRoomPanel(voiceId);
      await interaction.update({ embeds: [okE('✅ Permitted', `<@${targetId}>`)] });
      return;
    }

    if (id.startsWith('vc_deny_select_')) {
      const voiceId = id.replace('vc_deny_select_', '');
      const targetId = interaction.values[0];
      const room = tempRooms.get(voiceId);
      if (!room) return interaction.update({ embeds: [reasonE('vc_deny', 'This room no longer exists.')], components: [] });
      if (room.ownerId !== interaction.user.id) return interaction.update({ embeds: [reasonE('vc_deny', 'You are not the owner.')], components: [] });
      room.allowed.delete(targetId);
      try {
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (ch) await ch.permissionOverwrites.delete(targetId).catch(()=>{});
      } catch (e) {}
      await updateRoomPanel(voiceId);
      await interaction.update({ embeds: [okE('🚫 Denied', `<@${targetId}>`)] });
      return;
    }

    if (id.startsWith('vc_claim_select_')) {
      const voiceId = id.replace('vc_claim_select_', '');
      const targetId = interaction.values[0];
      const room = tempRooms.get(voiceId);
      if (!room) return interaction.update({ embeds: [reasonE('vc_claim', 'This room no longer exists.')], components: [] });
      if (room.ownerId !== interaction.user.id) return interaction.update({ embeds: [reasonE('vc_claim', 'You are not the owner.')], components: [] });
      try {
        const oldOwner = await interaction.guild.members.fetch(room.ownerId).catch(()=>null);
        const newOwner = await interaction.guild.members.fetch(targetId).catch(()=>null);
        if (!newOwner) return interaction.update({ embeds: [reasonE('vc_claim', 'New owner was not found.')], components: [] });
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (ch) {
          if (oldOwner) {
            await ch.permissionOverwrites.edit(oldOwner.id, {
              ManageChannels: false, MoveMembers: false, MuteMembers: false, DeafenMembers: false
            }).catch(()=>{});
          }
          await ch.permissionOverwrites.edit(newOwner.id, {
            ViewChannel: true, Connect: true, Speak: true,
            ManageChannels: true, MoveMembers: true, MuteMembers: true, DeafenMembers: true
          }).catch(()=>{});
        }
        room.ownerId = newOwner.id;
        await updateRoomPanel(voiceId);
        await interaction.update({ embeds: [okE('👑 Transferred', `<@${targetId}>`)] });
      } catch (e) { interaction.update({ embeds: [reasonE('vc_claim', 'Discord refused.', e.message)], components: [] }); }
      return;
    }

    return;
  }

  if (!interaction.isButton()) return;
  const btnId = interaction.customId;

  if (btnId.startsWith('vc_')) {
    const parts = btnId.split('_');
    const action = parts[1];
    const voiceId = parts.slice(2).join('_');
    const room = tempRooms.get(voiceId);
    if (!room) return interaction.reply({ embeds: [reasonE('vc_' + action, 'This room no longer exists.')], ephemeral: true });

    const isOwner = interaction.user.id === room.ownerId;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const isServerOwner = interaction.user.id === interaction.guild.ownerId;
    if (!isOwner && !isAdmin && !isServerOwner) {
      return interaction.reply({ embeds: [reasonE('vc_' + action, 'You are not the owner of this room. Only the owner can use these buttons.')], ephemeral: true });
    }

    if (action === 'lock') {
      room.locked = true;
      try {
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (ch) {
          await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }).catch(()=>{});
          await ch.permissionOverwrites.edit(room.ownerId, { ViewChannel: true, Connect: true }).catch(()=>{});
          for (const uid of room.allowed) await ch.permissionOverwrites.edit(uid, { ViewChannel: true, Connect: true }).catch(()=>{});
        }
      } catch (e) {}
      await updateRoomPanel(voiceId);
      await interaction.reply({ embeds: [okE('🔒 Room locked')], ephemeral: true });
      return;
    }

    if (action === 'unlock') {
      room.locked = false;
      try {
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (ch) await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null, ViewChannel: null }).catch(()=>{});
      } catch (e) {}
      await updateRoomPanel(voiceId);
      await interaction.reply({ embeds: [okE('🔓 Room unlocked')], ephemeral: true });
      return;
    }

    if (action === 'kick') {
      try {
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (!ch) return interaction.reply({ embeds: [reasonE('vc_kick', 'Room not found.')], ephemeral: true });
        const members = ch.members.filter(m => m.id !== room.ownerId && !m.user.bot);
        if (!members.size) return interaction.reply({ embeds: [reasonE('vc_kick', 'No one else is in the room.')], ephemeral: true });
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`vc_kick_select_${voiceId}`)
          .setPlaceholder('Select a user to kick')
          .addOptions(
            [...members.values()].slice(0, 25).map(m =>
              new StringSelectMenuOptionBuilder().setLabel(m.user.username.slice(0, 100)).setValue(m.id).setEmoji('👢')
            )
          );
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Select a user:', components: [row], ephemeral: true });
      } catch (e) { interaction.reply({ embeds: [reasonE('vc_kick', 'Discord refused.', e.message)], ephemeral: true }); }
      return;
    }

    if (action === 'rename') {
      const modal = new ModalBuilder().setCustomId(`vc_rename_modal_${voiceId}`).setTitle('Rename Room');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('new_name').setLabel('New name').setStyle(TextInputStyle.Short)
          .setRequired(true).setMaxLength(100).setValue(room.name || '')
      ));
      return interaction.showModal(modal).catch(()=>{});
    }

    if (action === 'delete') {
      await interaction.reply({ embeds: [infoE('🗑️ Deleting room...')], ephemeral: true });
      await deleteTempRoom(voiceId, `Deleted by ${interaction.user.tag}`);
      return;
    }

    if (action === 'permit') {
      try {
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (!ch) return interaction.reply({ embeds: [reasonE('vc_permit', 'Room not found.')], ephemeral: true });
        const members = ch.members.filter(m => !room.allowed.has(m.id) && m.id !== room.ownerId && !m.user.bot);
        if (!members.size) return interaction.reply({ embeds: [reasonE('vc_permit', 'Everyone in the room is already permitted.')], ephemeral: true });
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`vc_permit_select_${voiceId}`)
          .setPlaceholder('Select a user to permit')
          .addOptions(
            [...members.values()].slice(0, 25).map(m =>
              new StringSelectMenuOptionBuilder().setLabel(m.user.username.slice(0, 100)).setValue(m.id).setEmoji('✅')
            )
          );
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Select a user:', components: [row], ephemeral: true });
      } catch (e) { interaction.reply({ embeds: [reasonE('vc_permit', 'Discord refused.', e.message)], ephemeral: true }); }
      return;
    }

    if (action === 'deny') {
      if (!room.allowed.size) return interaction.reply({ embeds: [reasonE('vc_deny', 'No permitted users in this room.')], ephemeral: true });
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`vc_deny_select_${voiceId}`)
        .setPlaceholder('Select a user to deny')
        .addOptions(
          [...room.allowed].slice(0, 25).map(id =>
            new StringSelectMenuOptionBuilder().setLabel(`User ${id.slice(-4)}`).setValue(id).setEmoji('🚫')
          )
        );
      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.reply({ content: 'Select a user:', components: [row], ephemeral: true });
      return;
    }

    if (action === 'claim') {
      try {
        const ch = interaction.guild.channels.cache.get(voiceId);
        if (!ch) return interaction.reply({ embeds: [reasonE('vc_claim', 'Room not found.')], ephemeral: true });
        const members = ch.members.filter(m => m.id !== room.ownerId && !m.user.bot);
        if (!members.size) return interaction.reply({ embeds: [reasonE('vc_claim', 'No one else in the room to transfer ownership to.')], ephemeral: true });
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`vc_claim_select_${voiceId}`)
          .setPlaceholder('Select the new owner')
          .addOptions(
            [...members.values()].slice(0, 25).map(m =>
              new StringSelectMenuOptionBuilder().setLabel(m.user.username.slice(0, 100)).setValue(m.id).setEmoji('👑')
            )
          );
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Select a user:', components: [row], ephemeral: true });
      } catch (e) { interaction.reply({ embeds: [reasonE('vc_claim', 'Discord refused.', e.message)], ephemeral: true }); }
      return;
    }

    return;
  }

  if (btnId.startsWith('ticket_') && !['ticket_close', 'ticket_claim'].includes(btnId)) {
    const typeKey = btnId.replace('ticket_', '');
    if (!TICKET_TYPES[typeKey]) return interaction.reply({ embeds: [reasonE('ticket', 'Unknown ticket type.')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const result = await createTicket(interaction.guild, interaction.user, typeKey);
    if (!result.ok) {
      if (result.reason === 'already_open') return interaction.editReply({ embeds: [reasonE('ticket', `You already have an open ticket.`, `Go to ${result.channel}`)] });
      return interaction.editReply({ embeds: [reasonE('ticket', 'Failed to create the ticket.', result.reason)] });
    }
    return interaction.editReply({ embeds: [okE('✅ Created', `${result.channel}`)] });
  }
  if (btnId === 'ticket_close') {
    const ticket = ticketConfig.tickets[interaction.channel.id];
    if (!ticket) return interaction.reply({ embeds: [reasonE('ticket_close', 'This channel is not an open ticket.')], ephemeral: true });
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle('🔒 Closing')] });
    delete ticketConfig.tickets[interaction.channel.id];
    saveJson(path.join(DATA_DIR, 'ticket-config.json'), ticketConfig);
    setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
    return;
  }
  if (btnId === 'ticket_claim') {
    const ticket = ticketConfig.tickets[interaction.channel.id];
    if (!ticket) return interaction.reply({ embeds: [reasonE('ticket_claim', 'This channel is not an open ticket.')], ephemeral: true });
    if (ticket.claimedBy) return interaction.reply({ embeds: [reasonE('ticket_claim', `Already claimed by <@${ticket.claimedBy}>.`)], ephemeral: true });
    ticket.claimedBy = interaction.user.id;
    saveJson(path.join(DATA_DIR, 'ticket-config.json'), ticketConfig);
    await interaction.reply({ embeds: [okE('📌 Claimed')] });
    return;
  }
  if (btnId === 'verify_button') {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(VERIFIED_ROLE_ID)) return interaction.reply({ embeds: [reasonE('verify', 'You are already verified.')], ephemeral: true });
      await member.roles.add(VERIFIED_ROLE_ID, 'Verified');
      if (UNVERIFIED_ROLE_ID && member.roles.cache.has(UNVERIFIED_ROLE_ID)) await member.roles.remove(UNVERIFIED_ROLE_ID, 'Verified').catch(()=>{});
      await interaction.reply({ embeds: [okE('✅ Verified!')], ephemeral: true });
    } catch (e) { interaction.reply({ embeds: [reasonE('verify', 'Discord refused the role change.', e.message)], ephemeral: true }).catch(()=>{}); }
    return;
  }
  if (btnId === 'apply_minecraft' || btnId === 'apply_discord') {
    const userId = interaction.user.id;
    const isMc = btnId === 'apply_minecraft';
    const type = isMc ? 'Minecraft Staff' : 'Discord Staff';
    const questions = isMc ? APPLY_QUESTIONS_MC : APPLY_QUESTIONS_DISCORD;
    if (dmApplications.has(userId)) return interaction.reply({ embeds: [reasonE('apply', 'You are already applying.')], ephemeral: true });
    try {
      const dm = await interaction.user.createDM();
      dmApplications.set(userId, { type, step: 0, answers: {}, guildId: interaction.guild.id, questions });
      await interaction.reply({ embeds: [okE('📩 DM Sent')], ephemeral: true });
      await dm.send({ embeds: [new EmbedBuilder().setColor(C.info).setTitle(`📝 Application — ${type}`)
        .setDescription(`**Q1/${questions.length}:** ${questions[0].q}\n\nType \`cancel\` to abort.`)] });
    } catch (e) {
      dmApplications.delete(userId);
      return interaction.reply({ embeds: [reasonE('apply', 'I cannot send you a DM.', 'Please enable DMs from server members.')], ephemeral: true });
    }
    return;
  }
  if (btnId.startsWith('apply_accept_')) {
    const tier = getStaffTier(interaction.member);
    if (!tier || tier.rank < 3) return interaction.reply({ embeds: [noPermE('apply_accept', 3, tier)], ephemeral: true });
    const userId = btnId.replace('apply_accept_', '');
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (user) await user.send({ embeds: [okE('🎉 Accepted!')] }).catch(()=>{});
      await interaction.reply({ embeds: [okE('✅ Accepted', `<@${userId}>`)] });
      try { await interaction.message.edit({ components: [] }); } catch {}
    } catch (e) {}
    return;
  }
  if (btnId.startsWith('apply_reject_')) {
    const tier = getStaffTier(interaction.member);
    if (!tier || tier.rank < 3) return interaction.reply({ embeds: [noPermE('apply_reject', 3, tier)], ephemeral: true });
    const userId = btnId.replace('apply_reject_', '');
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (user) await user.send({ embeds: [errE('❌ Rejected')] }).catch(()=>{});
      await interaction.reply({ embeds: [errE('❌ Rejected', `<@${userId}>`)] });
      try { await interaction.message.edit({ components: [] }); } catch {}
    } catch (e) {}
    return;
  }
});

/* Giveaway reactions */
client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(()=>null);
    if (reaction.emoji.name !== '🎉') return;
    const gw = activeGiveaways[reaction.message.id];
    if (!gw || gw.ended) return;
    if (!gw.entries.includes(user.id)) {
      gw.entries.push(user.id); saveJson(path.join(DATA_DIR, 'giveaway-config.json'), activeGiveaways);
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
    saveJson(path.join(DATA_DIR, 'giveaway-config.json'), activeGiveaways);
  } catch (e) {}
});

/* VOICE STATE */
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.channelId && VOICE_LOCK_CHANNELS.includes(newState.channelId)) {
    const member = newState.member;
    if (member && !member.user.bot && member.id !== newState.guild.ownerId) {
      const hasRole = member.roles.cache.has(VOICE_ACCESS_ROLE_ID);
      const isWhitelisted = isVoiceWhitelisted(member.id);
      if (!hasRole && !isWhitelisted) {
        try {
          await member.voice.disconnect('Voice lock');
          const ch = newState.guild.channels.cache.get(newState.channelId);
          if (ch?.send) {
            ch.send({ content: `<@${member.id}> — **${VOICE_LOCK_MESSAGE}**` })
              .then(msg => setTimeout(() => msg.delete().catch(()=>{}), 8000)).catch(()=>{});
          }
          member.send({ content: VOICE_LOCK_MESSAGE }).catch(()=>{});
        } catch (e) {}
        return;
      }
    }
  }
  if (newState.channelId === JOIN_TO_CREATE_CHANNEL_ID && newState.member && !newState.member.user.bot) {
    try {
      const trigger = newState.channel;
      await createTempRoom(newState.member, trigger);
    } catch (e) { console.error('[TEMP-VOICE] create:', e.message); }
    return;
  }
  if (oldState.channelId && tempRooms.has(oldState.channelId)) {
    const chId = oldState.channelId;
    setTimeout(async () => {
      try {
        const ch = client.channels.cache.get(chId);
        if (!ch) { tempRooms.delete(chId); return; }
        if (ch.members.size === 0) await deleteTempRoom(chId, 'Empty — auto cleanup');
      } catch (e) {}
    }, 1500);
  }
  if (newState.id === client.user.id && newState.guild) {
    const saved = voiceConfig[newState.guild.id];
    if (!saved) return;
    if (newState.channelId && newState.channelId !== saved) {
      if (reconnectTimers.has(newState.guild.id)) return;
      reconnectTimers.set(newState.guild.id, setTimeout(async () => {
        reconnectTimers.delete(newState.guild.id);
        try { await connectToVoice(newState.guild, saved); } catch (e) {}
      }, 2000));
    }
    return;
  }
  const key = `${newState.guild?.id}:${newState.id}`;
  if (activeMutes[key] && newState.channelId && !newState.serverMute) {
    try { await newState.setMute(true, 'Restoring mute'); } catch {}
  }
  if (!newState.guild) return;
  if (!newState.member || newState.member.user.bot) return;
});

/* Member update */
client.on('guildMemberUpdate', async (o, n) => {
  if (o.nickname !== n.nickname) {
    const audit = await auditExec(n.guild, AuditLogEvent.MemberUpdate, n.id);
    sendLog(n.guild, NICKNAME_LOG_CHANNEL_ID || GENERAL_LOG_CHANNEL_ID,
      infoE('✏️ Nickname Changed').addFields(
        { name: 'Member', value: n.user.tag },
        { name: 'Before', value: o.nickname || '*none*' },
        { name: 'After', value: n.nickname || '*none*' },
        { name: 'By', value: audit?.executor?.tag || 'Unknown' }
      ));
  }
  const added = n.roles.cache.filter(r => !o.roles.cache.has(r.id));
  const removed = o.roles.cache.filter(r => !n.roles.cache.has(r.id));
  if (added.size || removed.size) {
    const audit = await auditExec(n.guild, AuditLogEvent.MemberRoleUpdate, n.id);
    const e = infoE('🏷️ Role Update').addFields({ name: 'Member', value: n.user.tag });
    if (added.size) e.addFields({ name: 'Added', value: added.map(r => r.toString()).join(' ') });
    if (removed.size) e.addFields({ name: 'Removed', value: removed.map(r => r.toString()).join(' ') });
    if (audit?.executor) e.addFields({ name: 'By', value: audit.executor.tag });
    sendLog(n.guild, ROLE_LOG_CHANNEL_ID, e);
  }
});

/* Message create */
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (!message.guild) {
    const userId = message.author.id;
    if (!dmApplications.has(userId)) return;
    const app = dmApplications.get(userId);
    const questions = app.questions || APPLY_QUESTIONS_MC;
    const content = message.content.trim();
    if (content.toLowerCase() === 'cancel') {
      dmApplications.delete(userId);
      return message.reply({ embeds: [infoE('❌ Cancelled')] }).catch(()=>{});
    }
    app.answers[questions[app.step].key] = content;
    app.step++;
    if (app.step >= questions.length) {
      dmApplications.delete(userId);
      await message.reply({ embeds: [okE('✅ Application Sent!')] }).catch(()=>{});
      const guild = client.guilds.cache.get(app.guildId);
      const resultsCh = guild?.channels.cache.get(APPLY_RESULTS_CHANNEL_ID);
      if (!resultsCh) return;
      const isMc = app.type === 'Minecraft Staff';
      const embed = new EmbedBuilder().setColor(isMc ? C.ok : C.info)
        .setTitle(`📝 New Application — ${app.type}`)
        .setDescription(`**Applicant:** <@${userId}>\n**Username:** \`${message.author.tag}\``)
        .setThumbnail(message.author.displayAvatarURL({ size: 256 })).setTimestamp();
      for (const q of questions) embed.addFields({ name: q.label, value: `\`\`\`${String(app.answers[q.key] || '(empty)').slice(0, 1000)}\`\`\`` });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`apply_accept_${userId}`).setLabel('Accept').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`apply_reject_${userId}`).setLabel('Reject').setEmoji('❌').setStyle(ButtonStyle.Danger));
      const msg = await resultsCh.send({ embeds: [embed], components: [row] }).catch(()=>null);
      if (msg) applications.set(msg.id, { userId, type: app.type, answers: app.answers });
      return;
    }
    const nextQ = questions[app.step];
    await message.reply({ embeds: [new EmbedBuilder().setColor(C.info).setTitle(`Q${app.step + 1}/${questions.length}`)
      .setDescription(nextQ.q).setFooter({ text: 'Type "cancel"' })] }).catch(()=>{});
    return;
  }

  if (!isLinkWhitelisted(message.author.id)) {
    const linkFound = containsAnyLink(message.content);
    if (linkFound) {
      await message.delete().catch(() => {});
      const warning = new EmbedBuilder().setColor(0xff0000).setTitle('# ry7 t9wd lah yn3l tbon mok')
        .setDescription(`# ry7 t9wd lah yn3l tbon mok\n\n## ${message.author} — الروابط ممنوعة! 🚫\n\n**Link:**\n\`\`\`${linkFound.slice(0, 100)}\`\`\``)
        .setThumbnail(message.author.displayAvatarURL({ size: 256 })).setTimestamp();
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

  const cmd = commands[name];
  if (!cmd) return message.reply({ content: 'صبب' }).catch(()=>{});

  try { await cmd.run(message, args, client); }
  catch (e) {
    console.error(`[CMD ERR] ${name}:`, e);
    message.reply({ embeds: [reasonE(name, `Unexpected error while running the command.`, e.message?.slice(0, 300) || 'Unknown')] }).catch(()=>{});
  }
});

process.on('unhandledRejection', e => console.error('[unhandledRejection]', e));
process.on('uncaughtException', e => console.error('[uncaughtException]', e));
process.on('SIGINT',  () => { console.log('[SHUTDOWN]'); saveInviteData(); setTimeout(()=>process.exit(0), 500); });
process.on('SIGTERM', () => { console.log('[SHUTDOWN]'); saveInviteData(); setTimeout(()=>process.exit(0), 500); });
process.on('beforeExit', () => { saveInviteData(); });

client.login(TOKEN);
