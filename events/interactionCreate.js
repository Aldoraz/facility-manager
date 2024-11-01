// Event handler for managing different types of user interactions including commands, buttons, and select menus.

const { Events, Collection } = require('discord.js');
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
            
            // Handles cooldowns on commands
            const { cooldowns } = interaction.client;

            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const defaultCooldownDuration = 5;
            const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;
            
            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            
                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1_000);
                    return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
                }
            }
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

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
        else if (interaction.isStringSelectMenu()) {
            logger.info(`Select menu interaction received: ${interaction.customId} by user ${interaction.user.tag}`);
            // Implement handling here
        }

        else {
        logger.warn(`Unhandled interaction type received: ${interaction.type}`);
        }

        // Add handling for other interaction types if needed
    },
};