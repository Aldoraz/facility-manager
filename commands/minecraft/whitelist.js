const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const logger = require('../../util/logger');
const fs = require('fs');
const ampapi = require("@cubecoders/ampapi");
const { username, password } = require('../../config.json');

module.exports = {
    cooldown: 30,
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage the Minecraft server whitelist')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Whitelist a user on the Minecraft server')
                .addStringOption(option => option.setName('user')
                    .setDescription('The username to whitelist')
                    .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setDescription('Reload the Minecraft whitelist')),


    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await this.addUser(interaction);
        } else if (subcommand === 'reload') {
            await this.reloadWhitelist(interaction);
        }
    },

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    // Subcommand to add a user to the whitelist
    async addUser(interaction) {
        const username = interaction.options.getString('user');
        let uuid;

        // Fetch UUID from Mojang API
        await interaction.reply({ content: 'Whitelisting user...', ephemeral: true });
        try {
            const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
            if (response.status !== 200) {
                logger.error(`Error retrieving UUID: ${response.statusText}`);
                return interaction.editReply({ content: 'That user does not exist.', ephemeral: true });
            }
            uuid = response.data.id;
        } catch (error) {
            logger.error('Error retrieving UUID:', error);
            return interaction.editReply({ content: 'An error occurred fetching the UUID.', ephemeral: true });
        }

        const whitelistDict = { "uuid": uuid, "name": username };
        const whitelistPath = '/home/amp/.ampdata/instances/MCVanilla01/Minecraft/whitelist.json'; // Replace with actual path

        // Update whitelist.json
        try {
            const whitelist = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
            whitelist.push(whitelistDict);
            fs.writeFileSync(whitelistPath, JSON.stringify(whitelist, null, 4));
        } catch (fileError) {
            logger.error(`Error updating whitelist.json: ${fileError}`);
            return interaction.editReply({ content: 'An error occurred updating the whitelist. Please try again later.', ephemeral: true });
        }

        return interaction.editReply({ content: `Whitelisted ${username}.`, ephemeral: true });
    },

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    // Subcommand to reload the whitelist on the Minecraft server
    async reloadWhitelist(interaction) {
        const API = new ampapi.AMPAPI("http://amp.romide.com:25565/");

        await interaction.reply({ content: 'Reloading whitelist...', ephemeral: true });
        try {
            const APIInitOK = await API.initAsync();
            if (!APIInitOK) {
                logger.error("API initialization failed");
                interaction.editReply({ content: 'An error occurred initializing the API.', ephemeral: true });
            }

            const loginResult = await API.Core.LoginAsync(username, password, "", false);
            if (!loginResult.success) {
                logger.error("Failed to log into AMP");
                interaction.editReply({ content: 'An authentification error occurred.', ephemeral: true });
            }

            logger.info("Logged into AMP successfully");
            API.sessionId = loginResult.sessionID;

            const APIInitStage2 = await API.initAsync();
            if (!APIInitStage2) {
                logger.error("API initialization failed");
                interaction.editReply({ content: 'An error occurred initializing the API.', ephemeral: true });
            }

            await API.Core.SendConsoleMessageAsync("whitelist reload");
            logger.info("Whitelist reloaded successfully");
            return interaction.editReply({ content: 'Whitelist reloaded successfully.', ephemeral: true });

        } catch (error) {
            if (error instanceof AggregateError) {
                for (const individualError of error.errors) {
                    logger.error(`${individualError}`);
                }
            }
            logger.error(`Error reloading whitelist: ${error}`);
            return interaction.editReply({ content: 'An error occurred reloading the whitelist. Please try again later.', ephemeral: true });
        }
    }
};
