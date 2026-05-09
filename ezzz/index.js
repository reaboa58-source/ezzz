const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, PermissionsBitField, REST, Routes } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

let botToken = process.env.DISCORD_TOKEN || null;
let client = null;
let isBotRunning = false;

let config = {
    welcomeChannelId: null,
    welcomeMessage: '👋 أهلاً وسهلاً {user} بسيرفرنا!',
    welcomeEnabled: true,
    welcomeImage: null,
    guildId: null
};

function startBot(token) {
    if (client) client.destroy();

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages
        ]
    });

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

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
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
                    config.welcomeMessage = options.getString('نص');
                    await interaction.reply('✅ تم تحديث الرسالة');
                    break;
                case 'عرض': {
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

    return new Promise((resolve, reject) => {
        client.once('ready', async () => {
            console.log(`🤖 البوت شغال: ${client.user.tag}`);
            isBotRunning = true;
            
            // سجل Slash Commands
            try {
                const rest = new REST({ version: '10' }).setToken(token);
                const commands = [
                    {
                        name: 'ترحيب',
                        description: 'إعدادات الترحيب',
                        options: [
                            { name: 'تفعيل', description: 'تفعيل الترحيب', type: 1 },
                            { name: 'تعطيل', description: 'تعطيل الترحيب', type: 1 },
                            { name: 'القناة', description: 'تحديد قناة الترحيب', type: 1, options: [{ name: 'الروم', description: 'اختر الروم', type: 7, required: true }] },
                            { name: 'الرسالة', description: 'تغيير رسالة الترحيب', type: 1, options: [{ name: 'نص', description: 'النص', type: 3, required: true }] },
                            { name: 'عرض', description: 'عرض الإعدادات', type: 1 }
                        ]
                    },
                    { name: 'ترحيب-تجربة', description: 'اختبار رسالة الترحيب' }
                ];
                
                await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
                console.log('✅ Slash Commands مسجلة');
            } catch (err) {
                console.error('⚠️ خطأ في تسجيل الأوامر:', err.message);
            }
            
            resolve(client);
        });

        client.login(token).catch(err => {
            console.error('❌ خطأ في التوكن:', err.message);
            isBotRunning = false;
            reject(err);
        });
    });
}

// ====== API ======
app.get('/api/check-token', (req, res) => {
    res.json({ 
        hasToken: !!botToken, 
        isRunning: isBotRunning,
        botTag: client?.user?.tag || null
    });
});

app.post('/api/set-token', async (req, res) => {
    const { token } = req.body;
    if (!token || token.length < 50) {
        return res.status(400).json({ error: '❌ التوكن غير صالح!' });
    }

    try {
        botToken = token;
        await startBot(token);
        res.json({ success: true, botTag: client.user.tag });
    } catch (error) {
        botToken = null;
        isBotRunning = false;
        res.status(400).json({ error: '❌ خطأ: ' + error.message });
    }
});

app.get('/api/config', (req, res) => res.json(config));

app.post('/api/config', (req, res) => {
    const { welcomeChannelId, welcomeMessage, welcomeEnabled, welcomeImage } = req.body;
    if (welcomeChannelId !== undefined) config.welcomeChannelId = welcomeChannelId;
    if (welcomeMessage !== undefined) config.welcomeMessage = welcomeMessage;
    if (welcomeEnabled !== undefined) config.welcomeEnabled = welcomeEnabled;
    if (welcomeImage !== undefined) config.welcomeImage = welcomeImage;
    res.json({ success: true, config });
});

// ====== صفحات الويب ======
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// ====== تشغيل ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    if (botToken) startBot(botToken).catch(console.error);
});
