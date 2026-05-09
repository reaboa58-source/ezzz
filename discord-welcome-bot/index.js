// index.js
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

// ====== الإعدادات (تقدر تعدلها من لوحة التحكم لاحقاً) ======
let config = {
    welcomeChannelId: null,      // ايدي روم الترحيب
    welcomeMessage: '👋 أهلاً وسهلاً {user} بسيرفرنا!', // رسالة الترحيب
    welcomeEnabled: true,
    welcomeImage: null,          // رابط صورة خلفية (اختياري)
    guildId: null                // ايدي السيرفر
};

// ====== قاعدة بيانات بسيطة في الذاكرة ======
const db = new Map();

// ====== EVENT: عند دخول عضو جديد ======
client.on('guildMemberAdd', async (member) => {
    if (!config.welcomeEnabled || !config.welcomeChannelId) return;
    
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel) return;

    const welcomeMsg = config.welcomeMessage
        .replace('{user}', `<@${member.id}>`)
        .replace('{username}', member.user.username)
        .replace('{server}', member.guild.name)
        .replace('{count}', member.guild.memberCount);

    const embed = new EmbedBuilder()
        .setTitle('🎉 عضو جديد!')
        .setDescription(welcomeMsg)
        .setColor('#00ff88')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(config.welcomeImage)
        .setTimestamp()
        .setFooter({ text: `أنت العضو رقم ${member.guild.memberCount}` });

    await channel.send({ embeds: [embed] });
});

// ====== SLASH COMMANDS ======
const commands = [
    new SlashCommandBuilder()
        .setName('ترحيب')
        .setDescription('إعدادات الترحيب')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(sub => 
            sub.setName('تفعيل')
               .setDescription('تفعيل الترحيب')
        )
        .addSubcommand(sub => 
            sub.setName('تعطيل')
               .setDescription('تعطيل الترحيب')
        )
        .addSubcommand(sub => 
            sub.setName('القناة')
               .setDescription('تحديد قناة الترحيب')
               .addChannelOption(opt => 
                   opt.setName('الروم')
                      .setDescription('اختر الروم')
                      .setRequired(true)
               )
        )
        .addSubcommand(sub => 
            sub.setName('الرسالة')
               .setDescription('تغيير رسالة الترحيب')
               .addStringOption(opt => 
                   opt.setName('نص')
                      .setDescription('النص (استخدم {user} للمنشن)')
                      .setRequired(true)
               )
        )
        .addSubcommand(sub => 
            sub.setName('عرض')
               .setDescription('عرض الإعدادات الحالية')
        ),
    
    new SlashCommandBuilder()
        .setName('ترحيب-تجربة')
        .setDescription('اختبار رسالة الترحيب')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
];

// ====== COMMAND HANDLER ======
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    // فقط للأدمن
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ للأدمن فقط!', ephemeral: true });
    }

    const { commandName, options, guild } = interaction;

    if (commandName === 'ترحيب') {
        const sub = options.getSubcommand();

        switch (sub) {
            case 'تفعيل':
                config.welcomeEnabled = true;
                await interaction.reply('✅ تم تفعيل الترحيب');
                break;
            
            case 'تعطيل':
                config.welcomeEnabled = false;
                await interaction.reply('❌ تم تعطيل الترحيب');
                break;
            
            case 'القناة':
                const channel = options.getChannel('الروم');
                config.welcomeChannelId = channel.id;
                config.guildId = guild.id;
                await interaction.reply(`✅ تم تحديد روم الترحيب: ${channel}`);
                break;
            
            case 'الرسالة':
                const msg = options.getString('نص');
                config.welcomeMessage = msg;
                await interaction.reply(`✅ تم تحديث الرسالة:\n${msg}`);
                break;
            
            case 'عرض':
                const ch = guild.channels.cache.get(config.welcomeChannelId);
                const embed = new EmbedBuilder()
                    .setTitle('⚙️ إعدادات الترحيب')
                    .addFields(
                        { name: 'الحالة', value: config.welcomeEnabled ? '🟢 مفعل' : '🔴 معطل' },
                        { name: 'الروم', value: ch ? ch.toString() : '❌ غير محدد' },
                        { name: 'الرسالة', value: config.welcomeMessage }
                    )
                    .setColor('#0099ff');
                await interaction.reply({ embeds: [embed] });
                break;
        }
    }

    if (commandName === 'ترحيب-تجربة') {
        const fakeMember = interaction.member;
        const channel = interaction.guild.channels.cache.get(config.welcomeChannelId);
        
        if (!channel) return interaction.reply('❌ لم يتم تحديد روم الترحيب!');
        
        const welcomeMsg = config.welcomeMessage
            .replace('{user}', `<@${fakeMember.id}>`)
            .replace('{username}', fakeMember.user.username)
            .replace('{server}', interaction.guild.name);

        const embed = new EmbedBuilder()
            .setTitle('🎉 عضو جديد!')
            .setDescription(welcomeMsg)
            .setColor('#00ff88')
            .setThumbnail(fakeMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        await interaction.reply('✅ تم إرسال رسالة تجريبية');
    }
});

// ====== لوحة التحكم الويب ======
const app = express();
app.use(express.json());
app.use(express.static('public'));

// API للحصول على الإعدادات
app.get('/api/config', (req, res) => {
    res.json(config);
});

// API لتحديث الإعدادات
app.post('/api/config', (req, res) => {
    const { welcomeChannelId, welcomeMessage, welcomeEnabled, welcomeImage } = req.body;
    
    if (welcomeChannelId !== undefined) config.welcomeChannelId = welcomeChannelId;
    if (welcomeMessage !== undefined) config.welcomeMessage = welcomeMessage;
    if (welcomeEnabled !== undefined) config.welcomeEnabled = welcomeEnabled;
    if (welcomeImage !== undefined) config.welcomeImage = welcomeImage;
    
    res.json({ success: true, config });
});

// صفحة لوحة التحكم
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تشغيل الويب سيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Dashboard running on port ${PORT}`);
});

// تسجيل الدخول
client.login(process.env.DISCORD_TOKEN);

console.log('🤖 Bot is starting...');
