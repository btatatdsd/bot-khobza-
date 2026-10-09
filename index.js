/* ============================================================
 *  𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 Discord Bot — single file
 * ============================================================ */
require('dotenv').config();

const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  PermissionFlagsBits, ChannelType, ActivityType, AuditLogEvent
} = require('discord.js');

const {
  joinVoiceChannel, getVoiceConnection,
  VoiceConnectionStatus, entersState
} = require('@discordjs/voice');

const fs   = require('fs');
const path = require('path');

/* ===================== CONFIG ===================== */
const TOKEN                  = process.env.DISCORD_TOKEN;
const PREFIX                 = process.env.PREFIX || '!';
const WELCOME_CHANNEL_ID     = process.env.WELCOME_CHANNEL_ID || '1558168781677924383';
const WELCOME_IMAGE          = process.env.WELCOME_IMAGE || '';
const ROLE_LOG_CHANNEL_ID    = process.env.ROLE_LOG_CHANNEL_ID || '1557761485961171085';
const MUTE_LOG_CHANNEL_ID    = process.env.MUTE_LOG_CHANNEL_ID || '1558158698805723226';
const BAN_LOG_CHANNEL_ID     = process.env.BAN_LOG_CHANNEL_ID || '1558158791659229354';
const KICK_LOG_CHANNEL_ID    = process.env.KICK_LOG_CHANNEL_ID || '';
const GENERAL_LOG_CHANNEL_ID = process.env.GENERAL_LOG_CHANNEL_ID || '';
const MC_SERVER_IP           = process.env.MC_SERVER_IP || 'play.khobzasmp.com';
const MC_STORE_URL           = process.env.MC_STORE_URL || 'https://store.khobzasmp.com';
const DATA_DIR               = process.env.DATA_DIR || __dirname;
const VOICE_CFG_FILE         = path.join(DATA_DIR, 'voice-config.json');
const RECONNECT_DELAY        = 5000;

if (!TOKEN) { console.error('[FATAL] DISCORD_TOKEN missing in env.'); process.exit(1); }

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

/* ===================== COLORS ===================== */
const C = { ok: 0x57f287, err: 0xed4245, info: 0x5865f2 };

/* ===================== STORES ===================== */
const warnings = new Map();
const afks     = new Map();
const economy  = new Map();
const settings = { antispam: false, antiinvite: false, antiraid: false, antimention: false, automod: false, logs: '' };
const spamMap  = new Map();
const joinLog  = [];

/* ===================== HELPERS ===================== */
const em = (color, title, desc) => {
  const e = new EmbedBuilder().setColor(color).setTimestamp();
  if (title) e.setTitle(title);
  if (desc) e.setDescription(desc);
  return e;
};
const okE   = (t, d) => em(C.ok, t, d);
const errE  = (t, d) => em(C.err, t, d);
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
function parseDur(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d+)(s|m|h|d)$/i);
  if (!m) return null;
  const mult = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2].toLowerCase()];
  return parseInt(m[1]) * mult;
}
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
  try {
    if (fs.existsSync(VOICE_CFG_FILE))
      return JSON.parse(fs.readFileSync(VOICE_CFG_FILE, 'utf8'));
  } catch (e) { console.error('[VOICE CFG] load:', e.message); }
  return {};
}
function saveVoiceConfig(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(VOICE_CFG_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('[VOICE CFG] save:', e.message); }
}

const voiceConfig     = loadVoiceConfig();
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
    channelId: channel.id,
    guildId:   guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: true
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log(`[VOICE] ✅ Ready in ${guild.name} → #${channel.name}`);
  });

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
        const saved = voiceConfig[guild.id];
        if (!saved) return;
        try {
          await connectToVoice(guild, saved);
          console.log(`[VOICE] 🔄 Reconnected in ${guild.name}`);
        } catch (e) { console.error(`[VOICE] reconnect:`, e.message); }
      }, RECONNECT_DELAY);
      reconnectTimers.set(guild.id, t);
    }
  });

  return connection;
}

async function restoreAllVoiceConnections() {
  for (const [guildId, channelId] of Object.entries(voiceConfig)) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) { console.warn(`[VOICE] Guild ${guildId} not found.`); continue; }
    try { await connectToVoice(guild, channelId); }
    catch (e) { console.error(`[VOICE] restore ${guildId}:`, e.message); }
  }
}

/* ============================================================
 *                       COMMANDS
 * ============================================================ */
const commands = {};

/* ---------- MODERATION ---------- */
commands.ban = { cat: 'Moderation', desc: 'Ban a member', usage: 'ban <@user> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ You need **Ban Members**.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Member not found.')] });
  if (!t.bannable) return m.reply({ embeds: [errE('Role hierarchy prevents ban.')] });
  const r = a.slice(1).join(' ') || 'No reason provided';
  await t.ban({ reason: `${m.author.tag}: ${r}` }).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('🔨 Member Banned').addFields({ name: 'User', value: `${t.user.tag} (${t.id})`, inline: true }, { name: 'Moderator', value: m.author.tag, inline: true }, { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, BAN_LOG_CHANNEL_ID, e);
}};
commands.unban = { cat: 'Moderation', desc: 'Unban a user by ID', usage: 'unban <id> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  if (!a[0]) return m.reply({ embeds: [errE('Provide a user ID.')] });
  try { await m.guild.bans.remove(a[0], a.slice(1).join(' ') || undefined);
    const e = okE('🔓 Unbanned', `\`${a[0]}\` unbanned by ${m.author}`); m.reply({ embeds: [e] }); sendLog(m.guild, BAN_LOG_CHANNEL_ID, e);
  } catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.kick = { cat: 'Moderation', desc: 'Kick a member', usage: 'kick <@user> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.KickMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Member not found.')] });
  if (!t.kickable) return m.reply({ embeds: [errE('Hierarchy prevents kick.')] });
  const r = a.slice(1).join(' ') || 'No reason provided';
  await t.kick(`${m.author.tag}: ${r}`).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('👢 Member Kicked').addFields({ name: 'User', value: `${t.user.tag}`, inline: true }, { name: 'Moderator', value: m.author.tag, inline: true }, { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, KICK_LOG_CHANNEL_ID, e);
}};
commands.mute = { cat: 'Moderation', desc: 'Timeout a member', usage: 'mute <@user> <10m> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ModerateMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Member not found.')] });
  const dur = parseDur(a[1]); if (!dur) return m.reply({ embeds: [errE('Invalid duration. Ex: 10m, 1h, 1d')] });
  if (!t.moderatable) return m.reply({ embeds: [errE('Hierarchy prevents timeout.')] });
  const r = a.slice(2).join(' ') || 'No reason provided';
  await t.timeout(dur, `${m.author.tag}: ${r}`).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('🔇 Member Muted').addFields({ name: 'User', value: `${t.user.tag}`, inline: true }, { name: 'Duration', value: fmtDur(dur), inline: true }, { name: 'Moderator', value: m.author.tag, inline: true }, { name: 'Reason', value: r });
  m.reply({ embeds: [e] }); sendLog(m.guild, MUTE_LOG_CHANNEL_ID, e);
}};
commands.unmute = { cat: 'Moderation', desc: 'Remove timeout', usage: 'unmute <@user>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ModerateMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Member not found.')] });
  await t.timeout(null, `unmute by ${m.author.tag}`).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  const e = okE('🔊 Member Unmuted', `${t.user.tag} has been unmuted by ${m.author}.`);
  m.reply({ embeds: [e] }); sendLog(m.guild, MUTE_LOG_CHANNEL_ID, e);
}};
commands.timeout = commands.mute;
commands.untimeout = commands.unmute;
commands.warn = { cat: 'Moderation', desc: 'Warn a member', usage: 'warn <@user> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ModerateMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Member not found.')] });
  const r = a.slice(1).join(' ') || 'No reason';
  const list = warnings.get(t.id) || []; list.push({ mod: m.author.tag, reason: r, ts: Date.now() }); warnings.set(t.id, list);
  m.reply({ embeds: [okE('⚠️ Warned').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'Moderator', value: m.author.tag, inline: true }, { name: 'Total', value: `${list.length}`, inline: true }, { name: 'Reason', value: r })] });
}};
commands.warnings = { cat: 'Moderation', desc: 'List warnings', usage: 'warnings <@user>', async run(m, a) {
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [errE('User not found.')] });
  const list = warnings.get(u.id) || [];
  if (!list.length) return m.reply({ embeds: [infoE('No Warnings', `${u.tag} has no warnings.`)] });
  m.reply({ embeds: [infoE(`Warnings for ${u.tag}`).setDescription(list.map((w, i) => `**#${i+1}** — ${w.reason} *by ${w.mod}*`).join('\n'))] });
}};
commands.clearwarns = { cat: 'Moderation', desc: 'Clear warnings', usage: 'clearwarns <@user>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ModerateMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const u = await resolveUser(m, a[0]); if (!u) return m.reply({ embeds: [errE('User not found.')] });
  warnings.delete(u.id);
  m.reply({ embeds: [okE('✅ Cleared', `Warnings for ${u.tag} were cleared.`)] });
}};
commands.purge = { cat: 'Moderation', desc: 'Delete N messages', usage: 'purge <1-100>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const n = Math.min(Math.max(parseInt(a[0]) || 0, 1), 100);
  const del = await m.channel.bulkDelete(n, true).catch(e => { m.reply({ embeds: [errE('Failed', e.message)] }); return null; });
  if (del) m.channel.send({ embeds: [okE('🧹 Purged', `Deleted **${del.size}** messages.`)] }).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 4000));
}};
commands.clear = commands.purge;
commands.slowmode = { cat: 'Moderation', desc: 'Set slowmode', usage: 'slowmode <seconds>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const s = Math.min(Math.max(parseInt(a[0]) || 0, 0), 21600);
  await m.channel.setRateLimitPerUser(s).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  m.reply({ embeds: [okE('⏱️ Slowmode', `Set to **${s}s**.`)] });
}};
commands.lock = { cat: 'Moderation', desc: 'Lock a channel', usage: 'lock [#channel]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: false }).catch(()=>{});
  m.reply({ embeds: [okE('🔒 Locked', `${ch} locked.`)] });
}};
commands.unlock = { cat: 'Moderation', desc: 'Unlock a channel', usage: 'unlock [#channel]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: null }).catch(()=>{});
  m.reply({ embeds: [okE('🔓 Unlocked', `${ch} unlocked.`)] });
}};
commands.lockall = { cat: 'Moderation', desc: 'Lock all text channels', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  let n = 0;
  for (const [, ch] of m.guild.channels.cache) if (ch.isTextBased()) { await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: false }).catch(()=>{}); n++; }
  m.reply({ embeds: [okE('🔒 Locked', `${n} channels.`)] });
}};
commands.unlockall = { cat: 'Moderation', desc: 'Unlock all text channels', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  let n = 0;
  for (const [, ch] of m.guild.channels.cache) if (ch.isTextBased()) { await ch.permissionOverwrites.edit(m.guild.roles.everyone, { SendMessages: null }).catch(()=>{}); n++; }
  m.reply({ embeds: [okE('🔓 Unlocked', `${n} channels.`)] });
}};
commands.softban = { cat: 'Moderation', desc: 'Ban+unban (deletes msgs)', usage: 'softban <@user> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Member not found.')] });
  const r = a.slice(1).join(' ') || 'Softban';
  try { await m.guild.bans.create(t.id, { reason: r, deleteMessageSeconds: 604800 }); await m.guild.bans.remove(t.id); m.reply({ embeds: [okE('🧹 Softbanned', t.user.tag)] }); }
  catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.hackban = { cat: 'Moderation', desc: 'Ban a user by ID', usage: 'hackban <id> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  if (!a[0]) return m.reply({ embeds: [errE('Provide user ID.')] });
  try { await m.guild.bans.create(a[0], { reason: a.slice(1).join(' ') || 'Hackban' }); m.reply({ embeds: [okE('🔨 Hackbanned', `\`${a[0]}\``)] }); }
  catch (e) { m.reply({ embeds: [errE('Failed', e.message)] }); }
}};
commands.massban = { cat: 'Moderation', desc: 'Ban multiple users', usage: 'massban <id1,id2> [reason]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.BanMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ids = (a[0] || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!ids.length) return m.reply({ embeds: [errE('Provide comma-separated IDs.')] });
  let ok = 0, fail = 0;
  for (const id of ids) { try { await m.guild.bans.create(id, { reason: a.slice(1).join(' ') || 'Massban' }); ok++; } catch { fail++; } }
  m.reply({ embeds: [okE('Massban done', `✅ ${ok} • ❌ ${fail}`)] });
}};

/* ---------- MEMBERS ---------- */
commands.userinfo = { cat: 'Members', desc: 'Show user info', usage: 'userinfo [@user]', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  const mem = await m.guild.members.fetch(u.id).catch(()=>null);
  const e = infoE(`👤 ${u.tag}`).setThumbnail(u.displayAvatarURL({ size: 256 })).addFields(
    { name: 'ID', value: u.id, inline: true }, { name: 'Bot', value: u.bot ? 'Yes' : 'No', inline: true },
    { name: 'Created', value: `<t:${Math.floor(u.createdTimestamp/1000)}:R>`, inline: true });
  if (mem) e.addFields({ name: 'Joined', value: `<t:${Math.floor(mem.joinedTimestamp/1000)}:R>`, inline: true },
    { name: 'Roles', value: mem.roles.cache.filter(r => r.id !== m.guild.id).map(r => r.toString()).join(', ').slice(0, 1000) || 'None' });
  m.reply({ embeds: [e] });
}};
commands.serverinfo = { cat: 'Members', desc: 'Show server info', async run(m) {
  const g = m.guild;
  m.reply({ embeds: [infoE(`📊 ${g.name}`).setThumbnail(g.iconURL({ size: 256 }) || null).addFields(
    { name: 'Owner', value: `<@${g.ownerId}>`, inline: true }, { name: 'Members', value: `${g.memberCount}`, inline: true },
    { name: 'Channels', value: `${g.channels.cache.size}`, inline: true }, { name: 'Roles', value: `${g.roles.cache.size}`, inline: true },
    { name: 'Boosts', value: `${g.premiumSubscriptionCount || 0}`, inline: true }, { name: 'ID', value: g.id })] });
}};
commands.avatar = { cat: 'Members', desc: 'Show avatar', usage: 'avatar [@user]', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  m.reply({ embeds: [infoE(`🖼️ ${u.tag}`).setImage(u.displayAvatarURL({ size: 1024 }))] });
}};
commands.banner = { cat: 'Members', desc: 'Show banner', usage: 'banner [@user]', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  const full = await client.users.fetch(u.id, { force: true });
  if (!full.banner) return m.reply({ embeds: [errE('No banner.')] });
  m.reply({ embeds: [infoE(`🖼️ ${u.tag}`).setImage(full.bannerURL({ size: 1024 }))] });
}};
commands.membercount = { cat: 'Members', desc: 'Show member count', async run(m) { m.reply({ embeds: [infoE('👥 Members', `${m.guild.memberCount}`)] }); }};
commands.roleinfo = { cat: 'Members', desc: 'Show role info', usage: 'roleinfo <@role>', async run(m, a) {
  const r = m.mentions.roles.first() || m.guild.roles.cache.get(a[0]) || m.guild.roles.cache.find(x => x.name.toLowerCase() === (a[0]||'').toLowerCase());
  if (!r) return m.reply({ embeds: [errE('Role not found.')] });
  m.reply({ embeds: [infoE(`🏷️ ${r.name}`).addFields(
    { name: 'ID', value: r.id, inline: true }, { name: 'Color', value: r.hexColor, inline: true },
    { name: 'Members', value: `${r.members.size}`, inline: true }, { name: 'Position', value: `${r.position}`, inline: true })] });
}};
commands.roles = { cat: 'Members', desc: 'List roles', async run(m) {
  m.reply({ embeds: [infoE('🏷️ Roles').setDescription(m.guild.roles.cache.sort((a,b)=>b.position-a.position).map(r => r.toString()).join(' ').slice(0, 4000))] });
}};
commands.nickname = { cat: 'Members', desc: 'Change nickname', usage: 'nickname <@user> <name>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageNicknames)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Member not found.')] });
  const nn = a.slice(1).join(' ').slice(0, 32) || null;
  await t.setNickname(nn, `by ${m.author.tag}`).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  m.reply({ embeds: [okE('✏️ Nickname updated')] });
}};
commands.resetnick = { cat: 'Members', desc: 'Reset nickname', usage: 'resetnick <@user>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageNicknames)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); if (!t) return m.reply({ embeds: [errE('Not found.')] });
  await t.setNickname(null).catch(()=>{});
  m.reply({ embeds: [okE('↩️ Nickname reset')] });
}};
commands.addrole = { cat: 'Members', desc: 'Add role to member', usage: 'addrole <@user> <@role>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageRoles)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); const r = m.mentions.roles.first();
  if (!t || !r) return m.reply({ embeds: [errE('Usage: addrole @user @role')] });
  await t.roles.add(r).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  m.reply({ embeds: [okE('✅ Role added', `${r} → ${t.user.tag}`)] });
}};
commands.removerole = { cat: 'Members', desc: 'Remove role', usage: 'removerole <@user> <@role>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageRoles)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); const r = m.mentions.roles.first();
  if (!t || !r) return m.reply({ embeds: [errE('Usage: removerole @user @role')] });
  await t.roles.remove(r).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  m.reply({ embeds: [okE('✅ Role removed', `${r} ✖ ${t.user.tag}`)] });
}};
commands.createrole = { cat: 'Members', desc: 'Create a role', usage: 'createrole <name>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageRoles)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const name = a.join(' '); if (!name) return m.reply({ embeds: [errE('Provide a name.')] });
  const r = await m.guild.roles.create({ name }).catch(e => { m.reply({ embeds: [errE('Failed', e.message)] }); return null; });
  if (r) m.reply({ embeds: [okE('✅ Role created', r.toString())] });
}};
commands.deleterole = { cat: 'Members', desc: 'Delete a role', usage: 'deleterole <@role>', async run(m) {
  if (!has(m.member, PermissionFlagsBits.ManageRoles)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const r = m.mentions.roles.first(); if (!r) return m.reply({ embeds: [errE('Mention a role.')] });
  await r.delete().catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  m.reply({ embeds: [okE('🗑️ Role deleted')] });
}};
commands.roleall = { cat: 'Members', desc: 'Give role to all members', usage: 'roleall <@role>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const r = m.mentions.roles.first(); if (!r) return m.reply({ embeds: [errE('Mention a role.')] });
  const members = await m.guild.members.fetch(); let n = 0;
  for (const [, mem] of members) if (!mem.user.bot) { await mem.roles.add(r).catch(()=>{}); n++; }
  m.reply({ embeds: [okE('✅ Done', `${n} members got ${r}.`)] });
}};
commands.rolehumans = commands.roleall;
commands.rolebots = { cat: 'Members', desc: 'Give role to all bots', usage: 'rolebots <@role>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const r = m.mentions.roles.first(); if (!r) return m.reply({ embeds: [errE('Mention a role.')] });
  const members = await m.guild.members.fetch(); let n = 0;
  for (const [, mem] of members) if (mem.user.bot) { await mem.roles.add(r).catch(()=>{}); n++; }
  m.reply({ embeds: [okE('✅ Done', `${n} bots got ${r}.`)] });
}};
commands.move = { cat: 'Members', desc: 'Move member to voice', usage: 'move <@user> <#voice>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.MoveMembers)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = await resolveMember(m, a[0]); const ch = m.mentions.channels.first();
  if (!t || !ch) return m.reply({ embeds: [errE('Usage: move @user #voice')] });
  await t.voice.setChannel(ch).catch(e => m.reply({ embeds: [errE('Failed', e.message)] }));
  m.reply({ embeds: [okE('➡️ Moved', `${t.user.tag} → ${ch}`)] });
}};
commands.afk = { cat: 'Members', desc: 'Set AFK', usage: 'afk [reason]', async run(m, a) {
  afks.set(m.author.id, a.join(' ') || 'AFK');
  m.reply({ embeds: [okE('💤 AFK set', `Reason: **${afks.get(m.author.id)}**`)] });
}};
commands.afklist = { cat: 'Members', desc: 'List AFK users', async run(m) {
  if (!afks.size) return m.reply({ embeds: [infoE('No one is AFK.')] });
  m.reply({ embeds: [infoE('💤 AFK List').setDescription([...afks.entries()].map(([id, r]) => `<@${id}> — ${r}`).join('\n'))] });
}};
commands.whois = commands.userinfo;

/* ---------- SECURITY ---------- */
commands.logs = { cat: 'Security', desc: 'Show log config', async run(m) {
  m.reply({ embeds: [infoE('📜 Logs Config').addFields(
    { name: 'Role', value: ROLE_LOG_CHANNEL_ID ? `<#${ROLE_LOG_CHANNEL_ID}>` : 'Not set' },
    { name: 'Mute', value: MUTE_LOG_CHANNEL_ID ? `<#${MUTE_LOG_CHANNEL_ID}>` : 'Not set' },
    { name: 'Ban', value: BAN_LOG_CHANNEL_ID ? `<#${BAN_LOG_CHANNEL_ID}>` : 'Not set' },
    { name: 'Kick', value: KICK_LOG_CHANNEL_ID ? `<#${KICK_LOG_CHANNEL_ID}>` : 'Not set' })] });
}};
commands.setlogs = { cat: 'Security', desc: 'Set general log channel', usage: 'setlogs #channel', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const ch = m.mentions.channels.first(); if (!ch) return m.reply({ embeds: [errE('Mention a channel.')] });
  settings.logs = ch.id;
  m.reply({ embeds: [okE('✅ Logs channel set', `${ch}`)] });
}};
commands.audit = { cat: 'Security', desc: 'Show recent audit logs', async run(m) {
  if (!has(m.member, PermissionFlagsBits.ViewAuditLog)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const logs = await m.guild.fetchAuditLogs({ limit: 10 }).catch(()=>null);
  if (!logs) return m.reply({ embeds: [errE('Failed.')] });
  m.reply({ embeds: [infoE('📋 Recent Audit').setDescription(logs.entries.map(e => `**${e.action}** — ${e.executor?.tag || '?'} → ${e.target?.tag || e.targetId || ''}`).join('\n') || 'Empty')] });
}};
commands.modlogs = commands.audit;
const toggle = (key, name) => ({ cat: 'Security', desc: `Toggle ${name}`, async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  settings[key] = !settings[key];
  m.reply({ embeds: [okE(`🛡️ ${name}`, `Now: **${settings[key] ? 'ON' : 'OFF'}**`)] });
}});
commands.antispam = toggle('antispam', 'Anti-spam');
commands.antiinvite = toggle('antiinvite', 'Anti-invite');
commands.antiraid = toggle('antiraid', 'Anti-raid');
commands.antimention = toggle('antimention', 'Anti-mention');
commands.automod = toggle('automod', 'Automod');
commands.security = { cat: 'Security', desc: 'Security status', async run(m) {
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
    if (!c) return m.reply({ embeds: [errE('Command not found.')] });
    return m.reply({ embeds: [infoE(`📖 ${PREFIX}${a[0]}`).addFields({ name: 'Category', value: c.cat, inline: true }, { name: 'Usage', value: c.usage || `${PREFIX}${a[0]}`, inline: true }, { name: 'Description', value: c.desc })] });
  }
  const cats = {};
  for (const [n, c] of Object.entries(commands)) (cats[c.cat] = cats[c.cat] || []).push(`\`${PREFIX}${n}\``);
  const e = infoE('📖 Commands');
  for (const [cat, list] of Object.entries(cats)) e.addFields({ name: cat, value: list.join(', ').slice(0, 1020) });
  m.reply({ embeds: [e] });
}};
commands.ping = { cat: 'Utility', desc: 'Show latency', async run(m) {
  const sent = await m.reply('🏓 Pinging...');
  sent.edit({ content: null, embeds: [okE('🏓 Pong!', `Gateway: **${client.ws.ping}ms**\nRoundtrip: **${sent.createdTimestamp - m.createdTimestamp}ms**`)] });
}};
commands.uptime = { cat: 'Utility', desc: 'Bot uptime', async run(m) { m.reply({ embeds: [infoE('⏱️ Uptime', fmtDur(client.uptime))] }); }};
commands.botinfo = { cat: 'Utility', desc: 'Bot info', async run(m) {
  m.reply({ embeds: [infoE('🤖 Bot').addFields(
    { name: 'Tag', value: client.user.tag, inline: true }, { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
    { name: 'Uptime', value: fmtDur(client.uptime), inline: true }, { name: 'Node', value: process.version, inline: true })] });
}};
commands.invite = { cat: 'Utility', desc: 'Invite link', async run(m) {
  m.reply({ embeds: [infoE('🔗 Invite', `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)] });
}};
commands.poll = { cat: 'Utility', desc: 'Create a poll', usage: 'poll Q? | a | b', async run(m, a) {
  const [q, ...opts] = a.join(' ').split('|').map(s => s.trim());
  if (!q || !opts.length) return m.reply({ embeds: [errE('Usage: poll Q? | opt1 | opt2')] });
  const nums = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const msg = await m.channel.send({ embeds: [infoE(`📊 ${q}`).setDescription(opts.map((o, i) => `${nums[i]} ${o}`).join('\n'))] });
  for (let i = 0; i < Math.min(opts.length, 10); i++) await msg.react(nums[i]);
}};
commands.say = { cat: 'Utility', desc: 'Say as bot', usage: 'say <text>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = a.join(' '); if (!t) return;
  m.delete().catch(()=>{}); m.channel.send(t);
}};
commands.embed = { cat: 'Utility', desc: 'Send embed', usage: 'embed Title | Desc', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const [title, ...rest] = a.join(' ').split('|');
  m.channel.send({ embeds: [infoE((title||'').trim(), rest.join('|').trim())] });
}};
commands.msg = { cat: 'Utility', desc: 'Create & send message', usage: 'msg create <name>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  if (a[0] !== 'create' || !a[1]) return m.reply({ embeds: [errE('Usage: msg create <name>')] });
  const name = a[1];
  await m.reply({ embeds: [infoE('✍️ Send content', 'Type `cancel` to abort (60s).')] });
  const filter = x => x.author.id === m.author.id && x.channel.id === m.channel.id;
  let content;
  try { const c = await m.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }); content = c.first().content; }
  catch { return m.reply({ embeds: [errE('⏰ Timed out.')] }); }
  if (content.toLowerCase() === 'cancel') return m.reply({ embeds: [infoE('❌ Cancelled.')] });
  await m.reply({ embeds: [infoE('📍 Where?', '`channel` / `#mention` / `dm`')] });
  let where;
  try { const c = await m.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }); where = c.first(); }
  catch { return m.reply({ embeds: [errE('⏰ Timed out.')] }); }
  const t = where.content.trim();
  if (t === 'channel') { await m.channel.send(content); return m.reply({ embeds: [okE('✅ Sent', name)] }); }
  if (t === 'dm') {
    await m.reply({ embeds: [infoE('👥 Who?', '`all` / `humans` / `bots` / mention users')] });
    let tgt;
    try { const c = await m.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }); tgt = c.first(); }
    catch { return m.reply({ embeds: [errE('⏰ Timed out.')] }); }
    let list = [];
    if (['all','humans','bots'].includes(tgt.content)) {
      const all = await m.guild.members.fetch();
      list = [...all.values()].filter(x => x.id !== client.user.id && (tgt.content === 'all' || (tgt.content === 'humans' && !x.user.bot) || (tgt.content === 'bots' && x.user.bot)));
    } else { list = [...tgt.mentions.members.values()]; }
    if (!list.length) return m.reply({ embeds: [errE('No recipients.')] });
    const conf = await m.channel.send({ embeds: [infoE('⚠️ Confirm', `Send DM to **${list.length}** users? React ✅ (30s).`)] });
    await conf.react('✅');
    const r = await conf.awaitReactions({ filter: (re, u) => re.emoji.name === '✅' && u.id === m.author.id, max: 1, time: 30000 }).catch(()=>null);
    if (!r || !r.size) return m.reply({ embeds: [errE('Cancelled.')] });
    let ok = 0, fail = 0;
    for (const mem of list) { try { await mem.send(content); ok++; } catch { fail++; } await new Promise(r => setTimeout(r, 1200)); }
    return m.reply({ embeds: [okE('✅ Done', `Sent: **${ok}** • Failed: **${fail}**`)] });
  }
  const ch = m.mentions.channels.first();
  if (ch) { await ch.send(content); return m.reply({ embeds: [okE('✅ Sent', `${ch}`)] }); }
  m.reply({ embeds: [errE('Unknown target.')] });
}};
commands.announce = { cat: 'Utility', desc: 'Announcement embed', usage: 'announce <text>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const t = a.join(' '); if (!t) return;
  m.channel.send({ embeds: [infoE('📢 Announcement', t)] });
}};
commands.remind = { cat: 'Utility', desc: 'Set a reminder', usage: 'remind <10m> <text>', async run(m, a) {
  const d = parseDur(a[0]); if (!d) return m.reply({ embeds: [errE('Usage: remind 10m text')] });
  const text = a.slice(1).join(' ') || 'Reminder!';
  m.reply({ embeds: [okE('⏰ Set', `In **${fmtDur(d)}**`)] });
  setTimeout(() => m.author.send({ embeds: [infoE('⏰ Reminder', `${text}\nFrom ${m.guild.name}`)] }).catch(()=>{}), d);
}};
commands.translate = { cat: 'Utility', desc: 'Translate text', usage: 'translate <lang> <text>', async run(m, a) {
  const lang = a[0]; const text = a.slice(1).join(' ');
  if (!lang || !text) return m.reply({ embeds: [errE('Usage: translate es Hello')] });
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
    const data = await fetch(url).then(x => x.json());
    m.reply({ embeds: [infoE('🌐 Translation').addFields({ name: 'In', value: text }, { name: 'Out', value: data[0].map(x => x[0]).join('') })] });
  } catch { m.reply({ embeds: [errE('Failed.')] }); }
}};
commands.calculate = { cat: 'Utility', desc: 'Calculate expression', usage: 'calculate 2+2', async run(m, a) {
  const expr = a.join(' ').replace(/[^0-9+\-*/(). %]/g, '');
  if (!expr) return m.reply({ embeds: [errE('Usage: calculate 2+2')] });
  try { const r = Function(`"use strict"; return (${expr});`)(); m.reply({ embeds: [okE('🧮 Result', `\`${expr}\` = **${r}**`)] }); }
  catch { m.reply({ embeds: [errE('Invalid.')] }); }
}};
commands.choose = { cat: 'Utility', desc: 'Choose random', usage: 'choose a b c', async run(m, a) {
  if (a.length < 2) return m.reply({ embeds: [errE('At least 2 options.')] });
  m.reply({ embeds: [okE('🎲 I choose...', a[Math.floor(Math.random()*a.length)])] });
}};
commands.coinflip = { cat: 'Utility', desc: 'Flip a coin', async run(m) { m.reply({ embeds: [okE('🪙 Coin', Math.random() < 0.5 ? 'Heads' : 'Tails')] }); }};
commands.roll = { cat: 'Utility', desc: 'Roll dice', usage: 'roll [NdN]', async run(m, a) {
  const r = a[0] && a[0].match(/^(\d+)d(\d+)$/i);
  if (r) { const n = parseInt(r[1]), s = parseInt(r[2]); let tot = 0, rolls = [];
    for (let i = 0; i < Math.min(n, 20); i++) { const v = Math.ceil(Math.random()*s); rolls.push(v); tot += v; }
    return m.reply({ embeds: [okE('🎲 Roll', `${rolls.join(', ')}\nTotal: **${tot}**`)] }); }
  m.reply({ embeds: [okE('🎲 Roll', `**${Math.ceil(Math.random()*100)}**`)] });
}};
commands['8ball'] = { cat: 'Utility', desc: 'Magic 8-ball', usage: '8ball question', async run(m, a) {
  const ans = ['Yes.','No.','Maybe.','Definitely.','Absolutely not.','Ask again later.','I doubt it.','For sure!','Very unlikely.','Signs point to yes.'];
  m.reply({ embeds: [infoE('🎱 8-Ball', `❓ ${a.join(' ') || '...'}\n💬 **${ans[Math.floor(Math.random()*ans.length)]}**`)] });
}};
commands.suggest = { cat: 'Utility', desc: 'Send suggestion', usage: 'suggest <idea>', async run(m, a) {
  const t = a.join(' '); if (!t) return m.reply({ embeds: [errE('Provide a suggestion.')] });
  const ch = settings.logs ? m.guild.channels.cache.get(settings.logs) : null;
  const target = ch || m.channel;
  const msg = await target.send({ embeds: [infoE('💡 Suggestion').setDescription(t).setFooter({ text: `By ${m.author.tag}` })] });
  await msg.react('👍'); await msg.react('👎');
  if (target.id !== m.channel.id) m.reply({ embeds: [okE('✅ Sent', `${target}`)] });
}};
commands.report = { cat: 'Utility', desc: 'Report a user', usage: 'report <@user> <reason>', async run(m, a) {
  const t = await resolveUser(m, a[0]); const r = a.slice(1).join(' ');
  if (!t || !r) return m.reply({ embeds: [errE('Usage: report @user reason')] });
  const ch = settings.logs ? m.guild.channels.cache.get(settings.logs) : null;
  if (ch) ch.send({ embeds: [errE('🚨 Report').addFields({ name: 'Reported', value: `${t.tag} (${t.id})` }, { name: 'By', value: `${m.author.tag}` }, { name: 'Reason', value: r })] });
  m.reply({ embeds: [okE('✅ Reported')] });
}};
commands.servericon = { cat: 'Utility', desc: 'Server icon', async run(m) {
  if (!m.guild.iconURL()) return m.reply({ embeds: [errE('No icon.')] });
  m.reply({ embeds: [infoE('🖼️ Icon').setImage(m.guild.iconURL({ size: 1024 }))] });
}};

/* ---------- CHANNELS ---------- */
commands.createchannel = { cat: 'Channels', desc: 'Create text channel', usage: 'createchannel <name>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const name = a.join('-').toLowerCase(); if (!name) return m.reply({ embeds: [errE('Provide a name.')] });
  const ch = await m.guild.channels.create({ name, type: ChannelType.GuildText }).catch(()=>null);
  if (ch) m.reply({ embeds: [okE('✅ Created', ch.toString())] });
}};
commands.deletechannel = { cat: 'Channels', desc: 'Delete a channel', usage: 'deletechannel [#ch]', async run(m) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ch = m.mentions.channels.first() || m.channel;
  await ch.delete().catch(()=>{});
}};
commands.renamechannel = { cat: 'Channels', desc: 'Rename channel', usage: 'renamechannel [#ch] <name>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ch = m.mentions.channels.first() || m.channel;
  const name = a.filter(x => !x.startsWith('<#')).join('-').toLowerCase();
  if (!name) return m.reply({ embeds: [errE('Provide a name.')] });
  await ch.setName(name).catch(()=>{});
  m.reply({ embeds: [okE('✏️ Renamed', ch.toString())] });
}};
commands.topic = { cat: 'Channels', desc: 'Set topic', usage: 'topic <text>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  await m.channel.setTopic(a.join(' ').slice(0, 1024)).catch(()=>{});
  m.reply({ embeds: [okE('📝 Topic updated')] });
}};
commands.hide = { cat: 'Channels', desc: 'Hide channel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  await m.channel.permissionOverwrites.edit(m.guild.roles.everyone, { ViewChannel: false }).catch(()=>{});
  m.reply({ embeds: [okE('🙈 Hidden')] });
}};
commands.unhide = { cat: 'Channels', desc: 'Unhide channel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  await m.channel.permissionOverwrites.edit(m.guild.roles.everyone, { ViewChannel: null }).catch(()=>{});
  m.reply({ embeds: [okE('👁️ Unhidden')] });
}};
commands.clonechannel = { cat: 'Channels', desc: 'Clone a channel', usage: 'clonechannel [#ch]', async run(m) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const ch = m.mentions.channels.first() || m.channel;
  const c = await ch.clone().catch(()=>null);
  if (c) m.reply({ embeds: [okE('✅ Cloned', c.toString())] });
}};
commands.channelinfo = { cat: 'Channels', desc: 'Channel info', async run(m) {
  const ch = m.mentions.channels.first() || m.channel;
  m.reply({ embeds: [infoE(`📁 #${ch.name}`).addFields(
    { name: 'ID', value: ch.id, inline: true }, { name: 'Type', value: `${ch.type}`, inline: true },
    { name: 'Created', value: `<t:${Math.floor(ch.createdTimestamp/1000)}:R>`, inline: true },
    { name: 'Topic', value: ch.topic || '*None*' })] });
}};
commands.listchannels = { cat: 'Channels', desc: 'List channels', async run(m) {
  const list = m.guild.channels.cache.map(c => `${c.type === ChannelType.GuildVoice ? '🔊' : '#'} ${c.name}`).join('\n').slice(0, 4000);
  m.reply({ embeds: [infoE('📋 Channels').setDescription(list || 'None')] });
}};
commands.nuke = { cat: 'Channels', desc: 'Nuke a channel', async run(m) {
  if (!has(m.member, PermissionFlagsBits.ManageChannels)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const pos = m.channel.position;
  const clone = await m.channel.clone().catch(()=>null);
  if (clone) { await m.channel.delete().catch(()=>{}); clone.setPosition(pos).catch(()=>{}); clone.send({ embeds: [okE('💥 Nuked')] }); }
}};

/* ---------- FUN ---------- */
commands.meme = { cat: 'Fun', desc: 'Random meme', async run(m) {
  try { const r = await fetch('https://meme-api.com/gimme').then(x => x.json());
    m.reply({ embeds: [infoE(r.title).setImage(r.url).setFooter({ text: `r/${r.subreddit}` })] });
  } catch { m.reply({ embeds: [errE('Unavailable.')] }); }
}};
commands.joke = { cat: 'Fun', desc: 'Random joke', async run(m) {
  try { const r = await fetch('https://official-joke-api.appspot.com/random_joke').then(x => x.json());
    m.reply({ embeds: [infoE('😂 Joke', `${r.setup}\n\n||${r.punchline}||`)] });
  } catch { m.reply({ embeds: [errE('Unavailable.')] }); }
}};
commands.ship = { cat: 'Fun', desc: 'Ship two users', usage: 'ship @a @b', async run(m, a) {
  const u1 = m.mentions.users.first() || m.author;
  const u2 = m.mentions.users.at(1) || (await resolveUser(m, a[1])) || m.author;
  const pct = Math.floor(Math.random()*101);
  const bar = '█'.repeat(Math.round(pct/10)) + '░'.repeat(10 - Math.round(pct/10));
  m.reply({ embeds: [infoE('💞 Ship', `${u1} + ${u2}\n\`${bar}\` **${pct}%**`)] });
}};
commands.rank = { cat: 'Fun', desc: 'Your level', async run(m) {
  const e = eco(m.author.id);
  m.reply({ embeds: [infoE(`⭐ ${m.author.username}`).addFields({ name: 'Level', value: `${Math.floor(Math.sqrt(e.msgs/5))}`, inline: true }, { name: 'XP', value: `${e.msgs}`, inline: true })] });
}};
commands.rep = { cat: 'Fun', desc: 'Give rep', usage: 'rep @user', async run(m, a) {
  const t = await resolveUser(m, a[0]); if (!t) return m.reply({ embeds: [errE('Mention a user.')] });
  if (t.id === m.author.id) return m.reply({ embeds: [errE("Can't rep yourself.")] });
  eco(t.id).rep++;
  m.reply({ embeds: [okE('⭐ Rep given', `${t.tag} now has **${eco(t.id).rep}**`)] });
}};
commands.daily = { cat: 'Fun', desc: 'Claim daily', async run(m) {
  const e = eco(m.author.id), now = Date.now();
  if (now - e.daily < 86400000) return m.reply({ embeds: [errE('Already claimed.', `Next in ${fmtDur(86400000 - (now - e.daily))}`)] });
  e.daily = now; e.balance += 250;
  m.reply({ embeds: [okE('💰 Daily!', `+250 • Balance: **${e.balance}**`)] });
}};
commands.balance = { cat: 'Fun', desc: 'Your balance', async run(m, a) {
  const u = await resolveUser(m, a[0]) || m.author;
  m.reply({ embeds: [infoE('💰 Balance', `${u.tag} — **${eco(u.id).balance}**`)] });
}};
commands.leaderboard = { cat: 'Fun', desc: 'Top balances', async run(m) {
  const top = [...economy.entries()].sort((a, b) => b[1].balance - a[1].balance).slice(0, 10);
  m.reply({ embeds: [infoE('🏆 Leaderboard').setDescription(top.map(([id, d], i) => `**#${i+1}** <@${id}> — ${d.balance}`).join('\n') || 'Empty')] });
}};
commands.profile = { cat: 'Fun', desc: 'Your profile', async run(m) {
  const e = eco(m.author.id);
  m.reply({ embeds: [infoE(`👤 ${m.author.username}`).setThumbnail(m.author.displayAvatarURL()).addFields(
    { name: 'Level', value: `${Math.floor(Math.sqrt(e.msgs/5))}`, inline: true }, { name: 'XP', value: `${e.msgs}`, inline: true },
    { name: 'Balance', value: `${e.balance}`, inline: true }, { name: 'Rep', value: `${e.rep}`, inline: true })] });
}};
commands.giveaway = { cat: 'Fun', desc: 'Start giveaway', usage: 'giveaway 1m Prize', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.ManageMessages)) return m.reply({ embeds: [errE('❌ No permission.')] });
  const d = parseDur(a[0]); const prize = a.slice(1).join(' ');
  if (!d || !prize) return m.reply({ embeds: [errE('Usage: giveaway 1m Nitro')] });
  const msg = await m.channel.send({ embeds: [infoE('🎉 GIVEAWAY!', `Prize: **${prize}**\nReact 🎉 to enter!`).setFooter({ text: `Ends in ${fmtDur(d)}` })] });
  await msg.react('🎉');
  setTimeout(async () => {
    const r = await msg.reactions.cache.get('🎉').users.fetch().catch(()=>null);
    const users = r ? r.filter(u => !u.bot) : null;
    if (!users || !users.size) return msg.reply({ embeds: [errE('No winner.')] });
    msg.reply({ embeds: [okE('🎉 Winner!', `${users.random()} won **${prize}**!`)] });
  }, d);
}};

/* ---------- SMP ---------- */
commands.ip = { cat: 'SMP', desc: 'Server IP', async run(m) { m.reply({ embeds: [infoE('🖥️ IP', `\`\`\`${MC_SERVER_IP}\`\`\``)] }); }};
commands.serverstatus = { cat: 'SMP', desc: 'MC status', async run(m) {
  try {
    const r = await fetch(`https://api.mcsrvstat.us/3/${MC_SERVER_IP}`).then(x => x.json());
    if (!r.online) return m.reply({ embeds: [errE('Server offline.')] });
    m.reply({ embeds: [infoE('🎮 Status').addFields({ name: 'Players', value: `${r.players?.online ?? 0}/${r.players?.max ?? 0}`, inline: true }, { name: 'Version', value: r.version || '?', inline: true })] });
  } catch { m.reply({ embeds: [errE('API unavailable.')] }); }
}};
commands.rules = { cat: 'SMP', desc: 'SMP rules', async run(m) {
  m.reply({ embeds: [infoE('📜 Rules', '1. احترم جميع اللاعبين.\n2. ممنوع الغش أو Hacks.\n3. ممنوع Griefing.\n4. لا للسبام.\n5. التزم بتعليمات الـ Staff.')] });
}};
commands.store = { cat: 'SMP', desc: 'Store link', async run(m) { m.reply({ embeds: [infoE('🛒 Store', MC_STORE_URL)] }); }};
commands.apply = { cat: 'SMP', desc: 'Apply for staff', async run(m) { m.reply({ embeds: [infoE('📝 Apply', 'Submit in applications channel or DM a staff member.')] }); }};
commands.whitelist = { cat: 'SMP', desc: 'Whitelist request', usage: 'whitelist <MCname>', async run(m, a) {
  if (!a[0]) return m.reply({ embeds: [errE('Provide MC username.')] });
  const ch = settings.logs ? m.guild.channels.cache.get(settings.logs) : null;
  if (ch) ch.send({ embeds: [infoE('📥 Whitelist Request').addFields({ name: 'Discord', value: m.author.tag }, { name: 'MC', value: a[0] })] });
  m.reply({ embeds: [okE('✅ Sent')] });
}};
commands.unwhitelist = { cat: 'SMP', desc: 'Unwhitelist request', usage: 'unwhitelist <MCname>', async run(m, a) {
  if (!a[0]) return m.reply({ embeds: [errE('Provide MC username.')] });
  const ch = settings.logs ? m.guild.channels.cache.get(settings.logs) : null;
  if (ch) ch.send({ embeds: [infoE('📤 Unwhitelist').addFields({ name: 'Discord', value: m.author.tag }, { name: 'MC', value: a[0] })] });
  m.reply({ embeds: [okE('✅ Sent')] });
}};
commands.mcuser = { cat: 'SMP', desc: 'Lookup MC user', usage: 'mcuser <name>', async run(m, a) {
  if (!a[0]) return m.reply({ embeds: [errE('Provide username.')] });
  try {
    const r = await fetch(`https://api.mojang.com/users/profiles/minecraft/${a[0]}`).then(x => x.ok ? x.json() : null);
    if (!r) return m.reply({ embeds: [errE('Not found.')] });
    m.reply({ embeds: [infoE(`🎮 ${r.name}`).setThumbnail(`https://mc-heads.net/avatar/${r.id}/128`).addFields({ name: 'UUID', value: r.id })] });
  } catch { m.reply({ embeds: [errE('Failed.')] }); }
}};
commands.link = { cat: 'SMP', desc: 'Link MC account', usage: 'link <MCname>', async run(m, a) {
  if (!a[0]) return m.reply({ embeds: [errE('Provide MC username.')] });
  const ch = settings.logs ? m.guild.channels.cache.get(settings.logs) : null;
  if (ch) ch.send({ embeds: [infoE('🔗 Link').addFields({ name: 'Discord', value: m.author.tag }, { name: 'MC', value: a[0] })] });
  m.reply({ embeds: [okE('✅ Sent')] });
}};
commands.unlink = { cat: 'SMP', desc: 'Unlink MC account', async run(m) {
  const ch = settings.logs ? m.guild.channels.cache.get(settings.logs) : null;
  if (ch) ch.send({ embeds: [infoE('🔓 Unlink', m.author.tag)] });
  m.reply({ embeds: [okE('✅ Sent')] });
}};

/* ---------- VOICE ---------- */
commands.addvoice = { cat: 'Voice', desc: 'Join voice 24/7', usage: 'addvoice <voiceChannelId>', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const id = (a[0] || '').replace(/[<#>]/g, '').trim();
  if (!id || !/^\d{17,20}$/.test(id)) return m.reply({ embeds: [errE('Usage: addvoice <voiceChannelId>')] });
  const ch = m.guild.channels.cache.get(id) || await m.guild.channels.fetch(id).catch(()=>null);
  if (!ch) return m.reply({ embeds: [errE('❌ Channel not found.')] });
  if (ch.type !== ChannelType.GuildVoice && ch.type !== ChannelType.GuildStageVoice)
    return m.reply({ embeds: [errE('❌ Not a voice channel.')] });
  try {
    await connectToVoice(m.guild, ch.id);
    voiceConfig[m.guild.id] = ch.id;
    saveVoiceConfig(voiceConfig);
    m.reply({ embeds: [okE('🔊 Voice Connected', `Joined ${ch} — 24/7 enabled.`)] });
  } catch (e) { m.reply({ embeds: [errE('❌ Failed', e.message)] }); }
}};
commands.removevoice = { cat: 'Voice', desc: 'Disconnect voice', async run(m) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });
  const conn = getVoiceConnection(m.guild.id);
  if (conn) { try { conn.destroy(); } catch {} }
  if (reconnectTimers.has(m.guild.id)) { clearTimeout(reconnectTimers.get(m.guild.id)); reconnectTimers.delete(m.guild.id); }
  const had = !!voiceConfig[m.guild.id];
  delete voiceConfig[m.guild.id]; saveVoiceConfig(voiceConfig);
  m.reply({ embeds: [okE('🔇 Disconnected', had ? 'Channel removed.' : 'Not in a saved channel.')] });
}};

/* ============================================================
 *                     EVENT: READY
 * ============================================================ */
client.once('ready', async () => {
  console.log('=====================================');
  console.log(`[READY] Logged in as ${client.user.tag}`);
  console.log(`[READY] Guilds: ${client.guilds.cache.size}`);
  console.log(`[READY] Welcome Channel ID: ${WELCOME_CHANNEL_ID}`);
  console.log('=====================================');
  client.user.setActivity('𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷', { type: ActivityType.Watching });
  await restoreAllVoiceConnections();
});

/* ============================================================
 *             EVENT: WELCOME (with debug logs)
 * ============================================================ */
client.on('guildMemberAdd', async member => {
  console.log(`[WELCOME] ➕ ${member.user.tag} (${member.id}) joined ${member.guild.name}`);

  joinLog.push(Date.now());
  while (joinLog.length && Date.now() - joinLog[0] > 10000) joinLog.shift();
  if (settings.antiraid && joinLog.length >= 8) {
    console.log('[WELCOME] ⚠️ Anti-raid triggered');
    try { await member.kick('Anti-raid'); } catch {}
    return;
  }

  if (!WELCOME_CHANNEL_ID) {
    console.error('[WELCOME] ❌ WELCOME_CHANNEL_ID is empty!');
    return;
  }

  // try cache first, then fetch
  let ch = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!ch) {
    console.log(`[WELCOME] Channel not in cache, fetching ${WELCOME_CHANNEL_ID}...`);
    ch = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(err => {
      console.error('[WELCOME] ❌ Fetch failed:', err.message);
      return null;
    });
  }

  if (!ch) {
    console.error(`[WELCOME] ❌ Channel ${WELCOME_CHANNEL_ID} does not exist or bot can't see it.`);
    return;
  }

  console.log(`[WELCOME] ✅ Channel found: #${ch.name} (type: ${ch.type})`);

  if (!ch.isTextBased()) {
    console.error(`[WELCOME] ❌ Channel #${ch.name} is not text-based!`);
    return;
  }

  const me = member.guild.members.me;
  const perms = ch.permissionsFor(me);
  console.log(`[WELCOME] Perms — ViewChannel: ${perms?.has('ViewChannel')}, SendMessages: ${perms?.has('SendMessages')}, EmbedLinks: ${perms?.has('EmbedLinks')}`);

  const embed = new EmbedBuilder()
    .setColor(C.ok)
    .setTitle('🎉 Welcome!')
    .setDescription(
      `مرحبا بيك في سيرفر **𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷** ${member}!\n` +
      `Welcome to **𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷**!`
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Member #${member.guild.memberCount}` })
    .setTimestamp();

  if (WELCOME_IMAGE) embed.setImage(WELCOME_IMAGE);

  try {
    await ch.send({ content: `${member}`, embeds: [embed] });
    console.log(`[WELCOME] ✅ Message sent to #${ch.name}`);
  } catch (err) {
    console.error('[WELCOME] ❌ Send failed:', err.message);
  }
});

/* ============================================================
 *                     EVENT: VOICE STATE
 * ============================================================ */
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.id !== client.user.id || !newState.guild) return;
  const saved = voiceConfig[newState.guild.id];
  if (!saved) return;
  if (newState.channelId && newState.channelId !== saved) {
    if (reconnectTimers.has(newState.guild.id)) return;
    const t = setTimeout(async () => {
      reconnectTimers.delete(newState.guild.id);
      try { await connectToVoice(newState.guild, saved); } catch (e) { console.error('[VOICE] move-back:', e.message); }
    }, 2000);
    reconnectTimers.set(newState.guild.id, t);
  }
});

/* ============================================================
 *                     EVENT: LOGS
 * ============================================================ */
client.on('guildMemberUpdate', async (o, n) => {
  if (o.nickname !== n.nickname) {
    const exec = await auditExec(n.guild, AuditLogEvent.MemberUpdate, n.id);
    sendLog(n.guild, settings.logs || GENERAL_LOG_CHANNEL_ID,
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
    const e = infoE('🏷️ Role Update').addFields({ name: 'Member', value: `${n.user.tag} (${n.id})` });
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
    errE('🗑️ Message Deleted').addFields(
      { name: 'Author', value: msg.author?.tag || '?', inline: true },
      { name: 'Channel', value: `${msg.channel}`, inline: true },
      { name: 'Content', value: (msg.content || '*[attachment]*').slice(0, 1000) }));
});
client.on('messageUpdate', (o, n) => {
  if (!n.guild || n.author?.bot || o.content === n.content) return;
  sendLog(n.guild, settings.logs || GENERAL_LOG_CHANNEL_ID,
    infoE('✏️ Message Edited').addFields(
      { name: 'Author', value: n.author.tag, inline: true },
      { name: 'Channel', value: `${n.channel}`, inline: true },
      { name: 'Before', value: (o.content || '*empty*').slice(0, 800) },
      { name: 'After', value: (n.content || '*empty*').slice(0, 800) }));
});
client.on('guildMemberRemove', async member => {
  const exec = await auditExec(member.guild, AuditLogEvent.MemberKick, member.id);
  const e = errE('👋 Member Left').addFields({ name: 'User', value: `${member.user.tag} (${member.id})` });
  if (exec) e.addFields({ name: 'Kicked by', value: exec.tag });
  sendLog(member.guild, KICK_LOG_CHANNEL_ID || settings.logs || GENERAL_LOG_CHANNEL_ID, e);
});
client.on('guildBanAdd', async ban => {
  const exec = await auditExec(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  sendLog(ban.guild, BAN_LOG_CHANNEL_ID || settings.logs,
    errE('🔨 Banned').addFields(
      { name: 'User', value: `${ban.user.tag} (${ban.user.id})` },
      { name: 'By', value: exec ? exec.tag : 'Unknown' },
      { name: 'Reason', value: ban.reason || 'None' }));
});
client.on('channelCreate', ch => { if (ch.guild) sendLog(ch.guild, settings.logs || GENERAL_LOG_CHANNEL_ID, okE('📁 Channel Created', `${ch.name} (${ch.id})`)); });
client.on('channelDelete', ch => { if (ch.guild) sendLog(ch.guild, settings.logs || GENERAL_LOG_CHANNEL_ID, errE('🗑️ Channel Deleted', `${ch.name} (${ch.id})`)); });

/* ============================================================
 *             EVENT: MESSAGE CREATE
 * ============================================================ */
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

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
      message.channel.send({ embeds: [errE('🛡️ Anti-spam', `${message.author} muted 1m.`)] }).catch(()=>{});
    }
  }
  if (settings.antiinvite && !has(message.member, PermissionFlagsBits.ManageMessages) && /(discord\.gg|discord\.com\/invite)\//i.test(message.content)) {
    message.delete().catch(()=>{});
    message.channel.send({ embeds: [errE('🔗 Invite blocked')] }).catch(()=>{});
  }
  if (settings.antimention && !has(message.member, PermissionFlagsBits.ManageMessages) && message.mentions.users.size >= 5) {
    message.delete().catch(()=>{});
    message.channel.send({ embeds: [errE('🛡️ Mass mentions blocked')] }).catch(()=>{});
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
    message.reply({ embeds: [errE('❌ Command error', (e.message || 'Unknown').slice(0, 500))] }).catch(()=>{});
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
