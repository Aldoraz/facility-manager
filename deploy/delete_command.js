require('dotenv').config({
    path: process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev'
});
const { REST, Routes } = require('discord.js');
const logger = require('../util/logger');
const clientId = process.env.CLIENT_ID;
const serverId = process.env.SERVER_ID;
const token = process.env.DISCORD_TOKEN;

// Command-line argument for command ID only
const args = process.argv.slice(2);
if (args.length < 1) {
    logger.error('Usage: npm run delete:<env> <commandId>');
    process.exit(1);
}

const commandId = args[0];
const env = process.env.NODE_ENV === 'prod' ? 'prod' : 'dev';

const rest = new REST().setToken(token);

rest.delete(Routes.applicationGuildCommand(clientId, serverId, commandId))
    .then(() => logger.info(`Successfully deleted guild command with ID ${commandId} for ${env} environment`))
    .catch(error => logger.error(`Failed to delete guild command with ID ${commandId} for ${env} environment:`, error));
