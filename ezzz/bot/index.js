const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, REST, Routes } = require('discord.js');

class BotManager {
    constructor() {
        this.client = null;
        this.token = null;
        this.config = {
            welcomeChannelId: null,
            welcomeMessage: '👋 أهلاً وسهلاً {user} بسيرفرنا!',
            welcomeEnabled: true,
            welcomeImage: null
        };
    }

    getBotStatus() {
        if (!this.client || !this.client.user) {
            return { isRunning: false, ping: 0, guilds: 0, users: 0, commands: 0 };
        }
        return {
            isRunning: true,
            ping: this.client.ws.ping,
            guilds: this.client.guilds.cache.size,
            users: this.client.users.cache.size,
            commands: 2
        };
    }

    getBotCommands() {
        return [
            {
                name: 'ترحيب',
                category: 'إدارة',
                description: 'إعدادات الترحيب',
                usage: '/ترحيب [تفعيل|تعطيل|القناة|الرسالة|عرض]'
            },
            {
                name: 'ترحيب-تجربة',
                category: 'إدارة',
                description: 'اختبار رسالة الترحيب',
                usage: '/ترحيب-تجربة'
            }
        ];
    }

    async loginWithToken(token) {
        console.log('🔑 loginWithToken called');
        
        try {
            if (this.client) {
                console.log('🔄 Destroying old client');
                await this.client.destroy();
            }

            console.log('🆕 Creating new client');
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildMessages
                ]
            });

            // حدث الترحيب
            this.client.on('guildMemberAdd', async (member) => {
                console.log('👋 New member:', member.user.tag);
                if (!this.config.welcomeEnabled || !this.config.welcomeChannelId) return;
                const channel = member.guild.channels.cache.get(this.config.welcomeChannelId);
                if (!channel) return;

                const welcomeMsg = this.config.welcomeMessage
                    .replace('{user}', `<@${member.id}>`)
                    .replace('{username}', member.user.username)
                    .replace('{server}', member.guild.name)
                    .replace('{count}', member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setTitle('🎉 عضو جديد!')
                    .setDescription(welcomeMsg)
                    .setColor('#00ff88')
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setImage(this.config.welcomeImage)
                    .setTimestamp()
                    .setFooter({ text: `أنت العضو رقم ${member.guild.memberCount}` });

                await channel.send({ embeds: [embed] });
            });

            // Slash Commands
            this.client.on('interactionCreate', async (interaction) => {
                if (!interaction.isChatInputCommand()) return;
                if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: '❌ للأدمن فقط!', ephemeral: true });
                }

                const { commandName, options, guild } = interaction;

                if (commandName === 'ترحيب') {
                    const sub = options.getSubcommand();
                    switch (sub) {
                        case 'تفعيل':
                            this.config.welcomeEnabled = true;
                            await interaction.reply('✅ تم تفعيل الترحيب');
                            break;
                        case 'تعطيل':
                            this.config.welcomeEnabled = false;
                            await interaction.reply('❌ تم تعطيل الترحيب');
                            break;
                        case 'القناة':
                            const channel = options.getChannel('الروم');
                            this.config.welcomeChannelId = channel.id;
                            await interaction.reply(`✅ تم تحديد روم الترحيب: ${channel}`);
                            break;
                        case 'الرسالة':
                            this.config.welcomeMessage = options.getString('نص');
                            await interaction.reply('✅ تم تحديث الرسالة');
                            break;
                        case 'عرض': {
                            const ch = guild.channels.cache.get(this.config.welcomeChannelId);
                            const embed = new EmbedBuilder()
                                .setTitle('⚙️ إعدادات الترحيب')
                                .addFields(
                                    { name: 'الحالة', value: this.config.welcomeEnabled ? '🟢 مفعل' : '🔴 معطل' },
                                    { name: 'الروم', value: ch ? ch.toString() : '❌ غير محدد' },
                                    { name: 'الرسالة', value: this.config.welcomeMessage }
                                )
                                .setColor('#0099ff');
                            await interaction.reply({ embeds: [embed] });
                            break;
                        }
                    }
                }

                if (commandName === 'ترحيب-تجربة') {
                    const fakeMember = interaction.member;
                    const channel = interaction.guild.channels.cache.get(this.config.welcomeChannelId);
                    if (!channel) return interaction.reply('❌ لم يتم تحديد روم الترحيب!');
                    
                    const welcomeMsg = this.config.welcomeMessage
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

            console.log('⏳ Logging in...');
            await this.client.login(token);
            this.token = token;
            console.log('✅ Logged in as:', this.client.user.tag);

            // تسجيل Slash Commands
            console.log('⏳ Registering slash commands...');
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

            await rest.put(Routes.applicationCommands(this.client.user.id), { body: commands });
            console.log('✅ Slash commands registered');

            return { success: true, message: `✅ البوت شغال: ${this.client.user.tag}` };
            
        } catch (error) {
            console.error('❌ Error in loginWithToken:', error);
            throw error;
        }
    }

    async logoutBot() {
        console.log('⏹️ logoutBot called');
        if (!this.client) {
            return { success: false, message: '❌ البوت موقف!' };
        }
        await this.client.destroy();
        this.client = null;
        this.token = null;
        return { success: true, message: '⏹️ البوت متوقف' };
    }
}

module.exports = new BotManager();
