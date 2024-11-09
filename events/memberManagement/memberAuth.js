require('dotenv').config({
    path: process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev'
});
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../../util/logger');
const db = require('../../util/database');
const parentId = process.env.AUTH_PARENT;


/**
 * @param {import("discord.js").GuildMember} member
*/
async function newMemberJoined(member) {
    logger.info(`Creating auth channel for: "${member.user.tag}"`);

    const authChannelParent = member.guild.channels.cache.get(parentId);
    if (!authChannelParent) logger.error('Auth channel parent not found');

    const now = Math.floor(Date.now() / 1000);
    const timeTillKick = 1800; //30 min
    const kickTimestamp = now + timeTillKick;

    db.run(`INSERT INTO members (id, accepted_tos, time_joined) VALUES (?, ?, ?)`, [member.user.id, false, now], (err) => {
        if (err) logger.error('Error new member inserting into members:', err);
    });

    const welcomeEmbed = new EmbedBuilder()
        .setColor("#5865f2")
        .setTitle('Welcome')
        .setDescription(`By pressing the button below, you accept the [TOS](https://romide.com/tos) and [privacy policy](https://romide.com/privacy).\nUse your invite link to authentificate yourself.\nYou will be kicked in <t:${kickTimestamp}:R>`)


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
        await memberChannel.send({ content: `<@${member.user.id}>`,embeds: [welcomeEmbed], components: [buttonRow] });
        setTimeout(() => checkAuthStatus({ member, memberChannel }), timeTillKick * 1000);
    } catch (err) {
        logger.error('Error creating new member channel / embed:', err);
    }
}

/**
 * 
 * @param {import("discord.js").Interaction} interaction 
 */
async function newMemberAuthButtonPressed(interaction) {
    const joinAuthModal = new ModalBuilder()
        .setCustomId('join_auth_modal')
        .setTitle('Authentication');

    const authInput = new TextInputBuilder()
        .setCustomId('invite_code')
        .setLabel('Invite Link')
        .setPlaceholder('discord.gg/<invite_code>')
        .setMinLength(7)
        .setMaxLength(32)
        .setStyle(TextInputStyle.Short);

    const authInputRow = new ActionRowBuilder().addComponents(authInput);
    joinAuthModal.addComponents(authInputRow);

    return interaction.showModal(joinAuthModal);
}

/**
 * @param {import("discord.js").Interaction} interaction 
 */
async function newMemberAuthModalSubmitted(interaction) {
    let inviteCode = interaction.fields.getTextInputValue('invite_code');
    const userId = interaction.user.id;

    const inviteCodeMatch = inviteCode.match(/discord\.gg\/([a-zA-Z0-9]+)/);
    if (!inviteCodeMatch) return interaction.reply({ content: 'Invalid invite link / code.', ephemeral: true });
    inviteCode = inviteCodeMatch[1];

    // Check if the invite code is valid
    db.get(`SELECT id, role_id FROM invites WHERE code = ? AND expires_at > ?`, [inviteCode, Math.floor(Date.now() / 1000)], (err, row) => {
        if (err || !row) {
            logger.error(`Couldnt GET invite info or invite ran out: ${err}`);
            return interaction.reply({ content: 'An error occurred while authenticating.', ephemeral: true });
        }

        const inviteId = row.id;
        const roleId = row.role_id;

        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            logger.error(`Auth role with id ${roleId} not found`);
            return interaction.reply({ content: 'An error occurred while authenticating.', ephemeral: true });
        }


        interaction.member.roles.add(role)
            .then(async() => {
                db.run(`INSERT INTO invite_members (invite_id, member_id) VALUES (?, ?)`, [inviteId, userId], (err) => {
                    if (err) logger.error(`Couldn't insert into invite_members: ${err}`);
                    
                });
                db.run(`UPDATE members SET accepted_tos = ? WHERE id = ?`, [true, userId], (err) => {
                    if (err) logger.error('Error updating members:', err);

                });
                await interaction.reply({ content: 'Authentication successful!', ephemeral: true });
                await interaction.channel.delete();
            }).catch(err => {
                logger.error(`Couldn't assign role: ${err}`);
                return interaction.reply({ content: 'An error occurred while assigning the role. Please try again later.', ephemeral: true });
            });
    });
}

/**
 * @param {import("discord.js").GuildMember} member
 * @param {import("discord.js").GuildChannel} memberChannel
*/
async function checkAuthStatus({ member, memberChannel }) {
    db.get(`SELECT * FROM members WHERE id = ?`, [member.user.id], async (err, row) => {
        if (err) logger.error(`Couldn't GET new member info: ${err.message}`);
        
        if (row && row.accepted_tos) return;

        try {
            await member.kick('Failed to authenticate within 30 minutes.');
            await memberChannel.delete();
            logger.info(`Kicked member "${member.user.tag}" for not authenticating within 30 minutes`);
        } catch (err) {
            logger.error('Error kicking member or deleting channel:', err);
        }
    });
}

module.exports = { newMemberJoined, newMemberAuthButtonPressed, newMemberAuthModalSubmitted };