const { Collection } = require('discord.js');
const logger = require('../../util/logger');

async function commandRouter(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) throw new Error(`Command not found: ${interaction.commandName}`);

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
        const subcommand = interaction.options.getSubcommand(false); // Get subcommand if it exists
        await command.execute(interaction);

        const commandName = subcommand
            ? `${interaction.commandName} ${subcommand}`
            : interaction.commandName;

        logger.info(`Successfully executed command: "${commandName}" by "${interaction.user.tag}"`);
    } catch (error) {
        const subcommand = interaction.options.getSubcommand(false);
        const commandName = subcommand
            ? `${interaction.commandName} ${subcommand}`
            : interaction.commandName;

        logger.error(`Error executing command: ${commandName} by user ${interaction.user.tag}`, error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
}

module.exports = commandRouter;