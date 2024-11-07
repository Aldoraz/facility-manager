const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../../util/logger');
const db = require('../../util/database');
/**
 * @param {import("discord.js").GuildMember} member
*/
// TODO: Add member to db with accepted_tos = false and time_joined = Date.now()
async function newMemberJoined(member) {
    logger.info(`Creating auth channel for: ${member.user.tag}`);

    const authChannelParent = member.guild.channels.cache.get('1301635213897764997');
    if (!authChannelParent) throw new Error('Parent channel was deleted.');

    const timeTillKick = 300;
    const kickTimestamp = Math.floor(Date.now() / 1000) + timeTillKick;

    const welcomeEmbed = new EmbedBuilder()
        .setColor("#5865f2")
        .setTitle('Welcome')
        .setDescription(`By pressing the button below, you accept the TOS and privacy policy.\nUse your invite link to authentificate yourself.\nYou will be kicked in <t:${kickTimestamp}:R>`)
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
            parent: authChannelParent.id,
            permissionOverwrites: [
                { id: member.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                { id: member.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            ],
        })
        await memberChannel.send({ embeds: [welcomeEmbed], components: [buttonRow] });
        setTimeout(timeout, timeTillKick * 1000, { member, memberChannel });
    } catch (error) {
        throw new Error('Error creating member channel:', error);
    }
    
}

/**
 * 
 * @param {import("discord.js").Interaction} interaction 
 */
// TODO: Check if 5 minutes have passed since the member joined
async function newMemberAuthButtonPressed(interaction) {
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

        await interaction.showModal(joinAuthModal);
}

/**
 * @param {import("discord.js").Interaction} interaction 
 */
// TODO: Fix insert, check if 5min have passed since the member joined, modularize user kicking
async function newMemberAuthModalSubmitted(interaction) {

    let inviteCode = interaction.fields.getTextInputValue('invite_code');
    const userId = interaction.user.id;

    const inviteCodeMatch = inviteCode.match(/discord\.gg\/([a-zA-Z0-9]+)/);
    if (inviteCodeMatch) {
        inviteCode = inviteCodeMatch[1];
    }

    // Check if the invite code is valid
    db.get(`SELECT id, role_id FROM invites WHERE code = ? AND expires_at > ?`, [inviteCode, Math.floor(Date.now() / 1000)], (err, row) => {
        if (err) {
            logger.error('Error querying the database:', err);
            return interaction.reply({ content: 'An error occurred while authenticating. Please try again later.', ephemeral: true });
        }

        if (!row) {
            return interaction.reply({ content: 'Invalid or expired invite code. Please check your code and try again.', ephemeral: true });
        }

        const inviteId = row.id;
        const roleId = row.role_id;

        const role = interaction.guild.roles.cache.get(roleId);
        if (role) {
            interaction.member.roles.add(role)
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
                    interaction.channel.delete();
                })
                .catch(err => {
                    logger.error('Error assigning role:', err);
                    interaction.reply({ content: 'An error occurred while assigning the role. Please try again later.', ephemeral: true });
                });
        } else {
            interaction.reply({ content: 'The role associated with this invite code no longer exists. Please request a new invite.', ephemeral: true });
        }
    });
}

// TODO: Make accept interaction / member
async function timeout(timeoutInfo) {
    const { member, timeoutChannel } = timeoutInfo;
    if (!member || !timeoutChannel) return;
    await member.kick('Failed to authenticate within 5 minutes.');
    await timeoutChannel.delete();

}








    

        

module.exports = { newMemberJoined, newMemberAuthButtonPressed, newMemberAuthModalSubmitted };