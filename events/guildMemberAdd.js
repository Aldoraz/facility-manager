const { Events, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../util/database');
const logger = require('../util/logger');

// TODO Refactor this mess
module.exports = {
    name: Events.GuildMemberAdd,
    /**
     * @param {import("discord.js").GuildMember} member - The member to process
     */
    async execute(member) {
        logger.info(`Member joined: ${member.user.tag}`);
        const parent = member.guild.channels.cache.get('1301635213897764997');
        if (!parent || parent.type !== ChannelType.GuildCategory) {
            logger.error('Category "border control" not found or is not a category.');
            return;
        }

        const timestamp = Math.floor(Date.now() / 1000) + 300;
        const welcomeEmbed = new EmbedBuilder()
            .setColor("#5865f2")
            .setTitle('Welcome')
            .setDescription(`By pressing the button below, you accept the TOS and privacy policy. You will be kicked in <t:${timestamp}:R>`)
            .addFields(
                { name: 'Privacy Policy', value: '[Click here](https://romide.com/privacy)', inline: true },
                { name: 'Terms of Service', value: '[Click here](https://romide.com/tos)', inline: true }
            );

        const authButton = new ButtonBuilder()
            .setCustomId('join_auth_button')
            .setLabel('Authenticate')
            .setStyle(ButtonStyle.Success);

        const buttonRow = new ActionRowBuilder()
            .addComponents(authButton);

        try {
            const memberChannel = await member.guild.channels.create({
                name: `border-control-${member.user.tag}`,
                type: ChannelType.GuildText,
                parent: parent.id,
                permissionOverwrites: [
                    { id: member.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                    { id: member.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                ],
            });

            const response = await memberChannel.send({ embeds: [welcomeEmbed], components: [buttonRow] });

            const collectorFilter = i => i.user.id === member.user.id;

            try {
                const conformation = await response.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });

                if (conformation.customId !== 'join_auth_button') {
                    logger.warn("Button has the wrong name. Or user manifested a new button to press.");
                    return;
                }

                const joinAuthModal = new ModalBuilder()
                    .setCustomId('join_auth_modal')
                    .setTitle('Authentication');

                const authInput = new TextInputBuilder()
                    .setCustomId('invite_code')
                    .setLabel('Invite Link')
                    .setPlaceholder('discord.gg/<invite_code>')
                    .setMinLength(8)
                    .setMaxLength(32)
                    .setStyle(TextInputStyle.Short);

                const authInputRow = new ActionRowBuilder().addComponents(authInput);
                joinAuthModal.addComponents(authInputRow);

                await conformation.showModal(joinAuthModal);

                const modalSubmission = await conformation.awaitModalSubmit({
                    filter: interaction => interaction.customId === 'join_auth_modal' && interaction.user.id === member.user.id,
                    time: 300_000, // 5 minutes
                });

                let inviteCode = modalSubmission.fields.getTextInputValue('invite_code');
                const userId = modalSubmission.user.id;

                const inviteCodeMatch = inviteCode.match(/discord\.gg\/([a-zA-Z0-9]+)/);
                if (inviteCodeMatch) {
                    inviteCode = inviteCodeMatch[1];
                }

                // Check if the invite code is valid
                db.get(`SELECT id, role_id FROM invites WHERE code = ? AND expires_at > ?`, [inviteCode, Math.floor(Date.now() / 1000)], (err, row) => {
                    if (err) {
                        logger.error('Error querying the database:', err);
                        return modalSubmission.reply({ content: 'An error occurred while authenticating. Please try again later.', ephemeral: true });
                    }

                    if (!row) {
                        return modalSubmission.reply({ content: 'Invalid or expired invite code. Please check your code and try again.', ephemeral: true });
                    }

                    const inviteId = row.id;
                    const roleId = row.role_id;

                    const role = modalSubmission.guild.roles.cache.get(roleId);
                    if (role) {
                        modalSubmission.member.roles.add(role)
                            .then(() => {
                                // Mark the invite as used
                                db.run(`INSERT INTO invite_members (invite_id, member_id) VALUES (?, ?)`, [inviteId, userId], (err) => {
                                    if (err) {
                                        logger.error('Error inserting into invite_members:', err);
                                    }
                                });
                                db.run(`INSERT INTO members (id, accepted_tos) VALUES (?, ?)`, [userId, true], (err) => {
                                    if (err) {
                                        logger.error('Error inserting into members:', err);
                                    }
                                });
                                memberChannel.delete();
                            })
                            .catch(err => {
                                logger.error('Error assigning role:', err);
                                modalSubmission.reply({ content: 'An error occurred while assigning the role. Please try again later.', ephemeral: true });
                            });
                    } else {
                        modalSubmission.reply({ content: 'The role associated with this invite code no longer exists. Please request a new invite.', ephemeral: true });
                    }
                });
            
            } catch (error) {
            logger.error('Error during authentication process:', error);
            await member.kick();
            await memberChannel.delete();
        }
    } catch(error) {
        logger.error('Error creating member channel:', error);
    }
},
};