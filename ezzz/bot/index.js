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
                                    { name: 'الرسالة', value
