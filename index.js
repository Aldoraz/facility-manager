// Main entry point for initializing the Discord bot client, loading commands, and handling events.

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const logger = require('./util/logger');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });


// Command handler: Loads all commands and adds them to the client's command collection.
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.info(`Loaded command: ${command.data.name} from ${filePath}`);
        } else {
            logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Event handler: Loads all event files and attaches them to the bot.
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
        logger.info(`Loaded one-time event: ${event.name} from ${filePath}`);
    } else {
        client.on(event.name, (...args) => event.execute(...args));
        logger.info(`Loaded recurring event: ${event.name} from ${filePath}`);
    }
}

// Log into Discord with the bot token
client.login(token).then(() => {
    logger.info('Bot successfully authenticated.');
}).catch((error) => {
    logger.error('Failed to authenticate bot:', error);
});