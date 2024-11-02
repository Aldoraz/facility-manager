const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../util/logger');
const { Rcon } = require('rcon-client');
const { rcon_port, rcon_password } = require('../../config.json');


/**
 * @type {{ cooldown: number, data: SlashCommandBuilder }}
 */
module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage the Minecraft server whitelist')
        .addSubcommand(subcommand => subcommand
                .setName('add')
                .setDescription('Whitelist a user on the Minecraft server')
                .addStringOption(option => option
                    .setName('user')
                    .setDescription('The username to whitelist')
                    .setRequired(true))
                .addBooleanOption(option => option
                    .setName('tos_privacy')
                    .setDescription('Whether the user has read and accepted the TOS and Privacy Policy')
                    .setRequired(true)))
        .addSubcommand(subcommand => subcommand
                .setName('list')
                .setDescription('Get the current whitelist'))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove a user from the whitelist')
            .addStringOption(option => option
                .setName('user')
                .setDescription('The username to remove')
                .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await this.addUser(interaction);
        } else if (subcommand === 'list') {
            await this.listWhitelist(interaction);
        }   else if (subcommand === 'remove') {
            await this.removeUser(interaction);
        }
    },

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    // Subcommand to add a user to the whitelist
    async addUser(interaction) {
        const username = interaction.options.getString('user');
        const accepted = interaction.options.getBoolean('tos_privacy');

        if (accepted === false) {
            return interaction.reply({ content: 'TOS and Privacy Policy must have been read & accepted by the player.', ephemeral: true });
        }

        await interaction.reply({ content: `Whitelisting ${username}...`, ephemeral: true });

        const rcon = new Rcon({
            host: 'server', // tailscale IP
            port: rcon_port,
            password: rcon_password
        });
        
        try {
            await rcon.connect();
            await rcon.send(`whitelist add ${username}`);
            await rcon.send(`whitelist reload`);
            await rcon.end();
        } catch (error) {
            logger.error('Error adding to / reloading whitelist:', error);
            return interaction.editReply({ content: 'An error occurred.\nIs the server asleep?', ephemeral: true });
        }
        logger.info(`${username} was whitelisted by ${interaction.user.tag}.`);
        return interaction.editReply({ content: `Whitelisted: \n\`\`\`${username}\`\`\``, ephemeral: true });
    },

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async listWhitelist(interaction) {
        await interaction.reply({ content: 'Getting whitelist...', ephemeral: true });

        const rcon = new Rcon({
            host: 'server', // tailscale IP
            port: rcon_port,
            password: rcon_password
        });

        try {
            await rcon.connect();
            const whitelist = await rcon.send('whitelist list');
            await rcon.end();

            return interaction.editReply({ content: `\n\`\`\`${whitelist}\`\`\`` })
        } catch (error) {
            logger.error('Error getting whitelist:', error);
            return interaction.editReply({ content: 'An error occurred.\nIs the server asleep?', ephemeral: true });
        }
    },

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    // Subcommand to add a user to the whitelist
    async removeUser(interaction) {
        const username = interaction.options.getString('user');

        await interaction.reply({ content: `Removing ${username} from whitelist...`, ephemeral: true });

        const rcon = new Rcon({
            host: 'server', // tailscale IP
            port: rcon_port,
            password: rcon_password
        });
        
        try {
            await rcon.connect();
            await rcon.send(`whitelist remove ${username}`);
            await rcon.send(`whitelist reload`);
            await rcon.end();
        } catch (error) {
            logger.error('Error removing from / reloading whitelist:', error);
            return interaction.editReply({ content: 'An error occurred.\n Is the server asleep?', ephemeral: true });
        }
        logger.info(`${username} was unwhitelisted by ${interaction.user.tag}.`);
        return interaction.editReply({ content: `Unwhitelisted \n\`\`\`${username}\`\`\``, ephemeral: true });
    },
};
