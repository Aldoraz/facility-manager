const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../util/database');
const logger = require('../../util/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('db')
        .setDescription('Admin database commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ADMINISTRATOR)
        .addSubcommand(subcommand =>
            subcommand
                .setName('members')
                .setDescription('Get members table')
                .addBooleanOption(option => 
                    option.setName('ephemeral')
                          .setDescription('Show response ephemerally (default: true)')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invites')
                .setDescription('Get invites table')
                .addBooleanOption(option => 
                    option.setName('ephemeral')
                          .setDescription('Show response ephemerally (default: true)')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invite_members')
                .setDescription('Get invite_members table')
                .addBooleanOption(option => 
                    option.setName('ephemeral')
                          .setDescription('Show response ephemerally (default: true)'))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
        await interaction.deferReply({ ephemeral });
        logger.info(`${subcommand} table requested by ${interaction.user.tag} with ephemeral=${ephemeral}`);
        switch (subcommand) {
            case 'members':
                await getMembers(interaction, ephemeral);
                break;
            case 'invites':
                await getInvites(interaction, ephemeral);
                break;
            case 'invite_members':
                await getInviteMembers(interaction, ephemeral);
                break;
        }
    }
};

async function getMembers(interaction, ephemeral) {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(`SELECT id, accepted_tos, time_joined FROM members`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const embeds = rows.map(row => {
            return new EmbedBuilder()
                .setTitle("Member Entry")
                .addFields(
                    { name: "Member", value: `<@${row.id}>`, inline: true },
                    { name: "Accepted TOS", value: row.accepted_tos ? "Yes" : "No", inline: true },
                    { name: "Join Date", value: `<t:${row.time_joined}>`, inline: true }
                )
                .setColor("#5865f2");
        });

        for (let i = 0; i < embeds.length; i += 10) {
            const embedBatch = embeds.slice(i, i + 10);
            await interaction.followUp({ embeds: embedBatch, ephemeral });
        }
    } catch (error) {
        logger.error('Error retrieving members:', error);
        await interaction.followUp({ content: 'An error occurred retrieving the members table.', ephemeral: true });
    }
}

async function getInvites(interaction, ephemeral) {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(`SELECT id, code, role_id, created_by, expires_at FROM invites`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const embeds = rows.map(row => {
            return new EmbedBuilder()
                .setTitle("Invite Entry")
                .addFields(
                    { name: "Invite ID", value: row.id.toString(), inline: true },
                    { name: "Invite Code", value: row.code, inline: true },
                    { name: "Role", value: `<@&${row.role_id}>`, inline: true },
                    { name: "Created by", value: `<@${row.created_by}>`, inline: true },
                    { name: "Expiry Date", value: `<t:${row.expires_at}>`, inline: true }
                )
                .setColor("#5865f2");
        });

        for (let i = 0; i < embeds.length; i += 10) {
            const embedBatch = embeds.slice(i, i + 10);
            await interaction.followUp({ embeds: embedBatch, ephemeral });
        }
    } catch (error) {
        logger.error('Error retrieving invites:', error);
        await interaction.followUp({ content: 'An error occurred retrieving the invites table.', ephemeral: true });
    }
}

async function getInviteMembers(interaction, ephemeral) {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(`SELECT invite_id, member_id FROM invite_members`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const embeds = rows.map(row => {
            return new EmbedBuilder()
                .setTitle("Invite Member Entry")
                .addFields(
                    { name: "Invite ID", value: row.invite_id.toString(), inline: true },
                    { name: "Member", value: `<@${row.member_id}>`, inline: true }
                )
                .setColor("#5865f2");
        });

        for (let i = 0; i < embeds.length; i += 10) {
            const embedBatch = embeds.slice(i, i + 10);
            await interaction.followUp({ embeds: embedBatch, ephemeral });
        }
    } catch (error) {
        logger.error('Error retrieving invite_members:', error);
        await interaction.followUp({ content: 'An error occurred retrieving the invite_members table.', ephemeral: true });
    }
}
