const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../util/database');
const logger = require('../../util/logger')

module.exports = {
    cooldown: 30,
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Create a temporary invite for a friend'),
        
    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        const channel = interaction.guild.channels.cache.get("1301585831529812059");
        const categoryName = interaction.channel?.parent?.name;
        const role = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === categoryName.toLowerCase());
        const createdBy = interaction.user.id;

        const checks = [
            {
                check: () => !!categoryName,
                errorMessage: 'This command must be used in a channel within a category.'
            },
            {
                check: () => !!role,
                errorMessage: `No role found matching the category name: ${categoryName}.`
            },

        ].filter(check => !check.check());

        if (checks.length > 0) {
            const errorMessages = checks.map(check => check.errorMessage).join('\n');
            return interaction.reply({ content: errorMessages, ephemeral: true });
        }

        channel.createInvite({
            maxAge: 1800, 
            maxUses: 5, 
            reason: `Created by ${interaction.user.tag} for ${categoryName}`,
            temporary: true,
            unique: true
        }).then(invite => {
            db.run(`INSERT INTO invites (code, role_id, created_by, expires_at) VALUES (?, ?, ?, ?)`, [invite.code, role.id, createdBy, invite.expiresTimestamp], function(error) {
                if (error) {
                    logger.error('Error inserting the invite:', error)
                    return interaction.reply({ content: 'Failed to create invite.', ephemeral: true });
                }
                const expiresAt = Math.floor(invite.expiresTimestamp / 1000)

                const inviteEmbed = new EmbedBuilder()
                    .setColor("#5865f2")
                    .setTitle("Invite Created")
                    .setDescription(invite.url)
                    .addFields(
                        {name: 'Role', value: `<@&${role.id}>`, inline: true},
                        {name: 'Expires', value: `<t:${expiresAt}:R>`, inline: true},

                    )
                    .setTimestamp();
                interaction.reply({ embeds: [inviteEmbed], ephemeral: true });
            });
        }).catch(error => {
            logger.error('Error creating the invite:', error)
            interaction.reply({ content: 'Failed to create invite.', ephemeral: true });
        });
    }
};