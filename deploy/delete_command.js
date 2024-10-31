// Script for deleting a specific command from the specified environment (dev, prod, or global).
// Takes environment and command ID as arguments, then deletes the command accordingly.

const { REST, Routes } = require('discord.js');
const { clientId, devServerId, prodServerId, token } = require('../config.json');
const logger = require('../util/logger');

const args = process.argv.slice(2);
if (args.length < 2) {
    logger.error('Usage: npm run delete:<env> <commandId>');
    process.exit(1);
}

const env = args[0];
const commandId = args[1];

let guildId = null;
if (env === 'dev') {
    guildId = devServerId;
} else if (env === 'prod') {
    guildId = prodServerId;
}

const rest = new REST().setToken(token);

if (env === 'global') {
    rest.delete(Routes.applicationCommand(clientId, commandId))
        .then(() => logger.info(`Successfully deleted global command with ID ${commandId}`))
        .catch(error => logger.error(`Failed to delete global command with ID ${commandId}:`, error));
} else if (guildId) {
    rest.delete(Routes.applicationGuildCommand(clientId, guildId, commandId))
        .then(() => logger.info(`Successfully deleted guild command with ID ${commandId} from ${env} environment`))
        .catch(error => logger.error(`Failed to delete guild command with ID ${commandId} from ${env} environment:`, error));
} else {
    logger.error('Invalid environment specified. Use "dev", "prod", or "global".');
    process.exit(1);
}