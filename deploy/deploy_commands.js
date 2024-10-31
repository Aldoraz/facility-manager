// Script for deploying slash commands to the specified environment (dev, prod, or global).
// Reads command files, prepares them, and sends them to the specified Discord server or globally.

const { REST, Routes } = require('discord.js');
const { clientId, devServerId, prodServerId, token } = require('../config.json');
const fs = require('node:fs');
const path = require('node:path');
const logger = require('../util/logger');

const args = process.argv.slice(2);
if (args.length < 1) {
    logger.error('Usage: npm run deploy:<env>');
    process.exit(1);
}

const env = args[0];

let guildId = null;
if (env === 'dev') {
    guildId = devServerId;
} else if (env === 'prod') {
    guildId = prodServerId;
}

const commands = [];
const foldersPath = path.join(__dirname, '../commands');
const commandFolders = fs.readdirSync(foldersPath);

// Load all command files
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        if (env === 'global') {
            logger.info(`Started refreshing ${commands.length} global application (/) commands.`);
            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            logger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
        } else if (guildId) {
            logger.info(`Started refreshing ${commands.length} guild application (/) commands for ${env} environment.`);
            const data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            logger.info(`Successfully reloaded ${data.length} guild application (/) commands for ${env} environment.`);
        } else {
            logger.error('Invalid environment specified. Use "dev", "prod", or "global".');
            process.exit(1);
        }
        
    } catch (error) {
        logger.error('An error occurred while deploying commands:', error);
        process.exit(1);
    }
})();