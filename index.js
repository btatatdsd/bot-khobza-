/* ---------- APPLY STAFF PANEL (with image support - interactive) ---------- */
commands.applypanel = { cat: 'Verify', desc: 'Send apply staff panel (with optional image)', usage: 'applypanel [imageURL]', async run(m, a) {
  if (!has(m.member, PermissionFlagsBits.Administrator)) return m.reply({ embeds: [errE('❌ Admin only.')] });

  const ch = m.guild.channels.cache.get(APPLY_STAFF_CHANNEL_ID) || await m.guild.channels.fetch(APPLY_STAFF_CHANNEL_ID).catch(()=>null);
  if (!ch || !ch.isTextBased()) return m.reply({ embeds: [errE(`❌ Channel <#${APPLY_STAFF_CHANNEL_ID}> not found.`)] });

  // === 1) Get imageURL from argument ===
  let imageURL = (a[0] || '').trim();

  // === 2) If no argument, check if the command is a reply to a message with an image ===
  if (!imageURL && m.reference?.messageId) {
    const replied = await m.channel.messages.fetch(m.reference.messageId).catch(()=>null);
    if (replied) {
      if (replied.attachments.size) imageURL = replied.attachments.first().url;
      else {
        const urlMatch = replied.content.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp)(?:\?\S+)?/i);
        if (urlMatch) imageURL = urlMatch[0];
      }
    }
  }

  // === 3) Check attachments on the command message itself ===
  if (!imageURL && m.attachments.size) imageURL = m.attachments.first().url;

  // === 4) If still no image → ASK the user interactively ===
  if (!imageURL) {
    await m.reply({ embeds: [infoE('🖼️ أرسل رابط الصورة', 'صيفط رابط الصورة (URL) هنا فهاد الروم، أو كتب `cancel` لإلغاء.\nعندك **60 ثانية**.')] });

    const filter = x => x.author.id === m.author.id && x.channel.id === m.channel.id;
    try {
      const collected = await m.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const replyMsg = collected.first();

      // Check cancel
      if (replyMsg.content.toLowerCase().trim() === 'cancel') {
        return m.reply({ embeds: [infoE('❌ Cancelled.')] });
      }

      // Extract URL from content or attachment
      if (replyMsg.attachments.size) {
        imageURL = replyMsg.attachments.first().url;
      } else {
        const urlMatch = replyMsg.content.match(/https?:\/\/\S+/i);
        if (urlMatch) imageURL = urlMatch[0];
      }

      // Delete the user's reply for cleanliness (optional)
      replyMsg.delete().catch(()=>{});

      if (!imageURL) {
        return m.reply({ embeds: [errE('❌ No valid URL found.', 'رجع جرب وعطيني رابط صحيح.')] });
      }
    } catch {
      return m.reply({ embeds: [errE('⏰ Timed out.', 'ما عطيتيش رابط الصورة. جرب عاود.')] });
    }
  }

  // === 5) Validate URL ===
  if (!/^https?:\/\//i.test(imageURL)) {
    return m.reply({ embeds: [errE('❌ Invalid URL.', `الرابط اللي عطيتي ماشي صحيح: \`${imageURL.slice(0, 100)}\``)] });
  }

  // === 6) Build the panel embed ===
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📝 Apply for Staff — 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷')
    .setDescription(
      '**بغيتي تولي Staff فـ 𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷؟**\n\n' +
      'اختار النوع اللي بغيتي تقدم عليه:\n\n' +
      '🎮 **Apply Staff Minecraft** — Staff داخل السيرفر\n' +
      '💬 **Apply Staff Discord** — Staff فـ الديسكورد\n\n' +
      'كليكي على الزر المناسب وغادي تفتح ليك استمارة. جاوب بصدق وكامل الأسئلة.'
    )
    .setFooter({ text: '𝑲𝒉𝒐𝒃𝒛𝒂 𝑺𝑴𝑷 • Applications' })
    .setTimestamp();

  // Add image to embed
  embed.setImage(imageURL);

  // === 7) Build buttons ===
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_minecraft').setLabel('Apply Staff Minecraft').setEmoji('🎮').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('apply_discord').setLabel('Apply Staff Discord').setEmoji('💬').setStyle(ButtonStyle.Primary)
  );

  // === 8) Send panel ===
  try {
    await ch.send({ embeds: [embed], components: [row] });
    m.reply({ embeds: [okE('✅ Panel sent', `In ${ch}\n**Image:** ${imageURL}`)] }).catch(()=>{});
  } catch (e) {
    m.reply({ embeds: [errE('❌ Failed to send', e.message)] });
  }
}};
