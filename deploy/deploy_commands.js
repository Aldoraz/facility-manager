require('dotenv').config({
    path: process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev'
});
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const logger = require('../util/logger');
const clientId = process.env.CLIENT_ID;
const serverId = process.env.SERVER_ID;
const token = process.env.DISCORD_TOKEN;

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
        logger.info(`Started refreshing ${commands.length} guild application (/) commands for the ${process.env.NODE_ENV} environment.`);
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, serverId),
            { body: commands },
        );
        logger.info(`Successfully reloaded ${data.length} guild application (/) commands for the ${process.env.NODE_ENV} environment.`);
    } catch (error) {
        logger.error('An error occurred while deploying commands:', error);
        process.exit(1);
    }
})();