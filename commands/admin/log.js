const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const logger = require('../../util/logger');
const path = require('path');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('log')
        .setDescription('Get the bot’s log file')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cur')
                .setDescription('Get the current log file'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('prev')
                .setDescription('Get the previous log file')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let logFile;

        if (subcommand === 'cur') {
            logFile = path.join(__dirname, '../../logs/bot.log');
        } else if (subcommand === 'prev') {
            logFile = path.join(__dirname, '../../logs/bot_previous.log');
        }

        try {
            const fileAttachment = new AttachmentBuilder(logFile, { name: `bot-${subcommand}.txt` });
            logger.info(`Sending log file ${logFile} to ${interaction.user.tag}`);
            await interaction.reply({ files: [fileAttachment], ephemeral: true });
        } catch (error) {
            logger.error('Error reading log file:', error);
            await interaction.reply({ content: 'Could not retrieve the log file.', ephemeral: true });
        }
    }
};
