const { Events } = require('discord.js');
const commandRouter = require('./base/commandRouter');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            commandRouter(interaction);
        } else {
            throw new Error(`Unhandled interaction type: ${interaction.type}`);
        }
    },
};