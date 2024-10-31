// Event handler for managing different types of user interactions including commands, buttons, and select menus.

const { Events } = require('discord.js');
const logger = require('../util/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                logger.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
                logger.info(`Successfully executed command: ${interaction.commandName} by user ${interaction.user.tag}`);
            } catch (error) {
                logger.error(`Error executing command: ${interaction.commandName} by user ${interaction.user.tag}`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        }

        // Handle button interactions
        else if (interaction.isButton()) {
            logger.info(`Button interaction received: ${interaction.customId} by user ${interaction.user.tag}`);
            // Implement handling here
        }

        // Handle select menu interactions
        else if (interaction.isSelectMenu()) {
            logger.info(`Select menu interaction received: ${interaction.customId} by user ${interaction.user.tag}`);
            // Implement handling here
        }

        else {
        logger.warn(`Unhandled interaction type received: ${interaction.type}`);
        }

        // Add handling for other interaction types if needed
    },
};