require('dotenv').config({ 
    path: process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev' 
});
const { Events } = require('discord.js');
const commandRouter = require('./base/commandRouter');
const memberAuth = require('./memberManagement/memberAuth');
const logger = require('../util/logger');

const currentServerId = process.env.SERVER_ID;

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.guild.id !== currentServerId) {
            logger.info(`Event from outside the current environment detected (guild ID: ${interaction.guild.id}). Event ignored.`);
            return;
        }
        if (interaction.isChatInputCommand()) {
            // Handles slash commands
            commandRouter(interaction);
        } else if (interaction.isButton()) {
            // Handles button interactions
            switch (interaction.customId) {
                case 'join_auth_button':
                    memberAuth.newMemberAuthButtonPressed(interaction);
                    break;
                default:
                    throw new Error(`Unhandled button custom ID: ${interaction.customId}`);
            }
            logger.info(`Button "${interaction.customId}" pressed by "${interaction.user.tag}"`);
        } else if (interaction.isModalSubmit()) {
            // Handles modal submit interactions
            switch (interaction.customId) {
                case 'join_auth_modal':
                    memberAuth.newMemberAuthModalSubmitted(interaction);
                    break;
                default:
                    throw new Error(`Unhandled modal custom ID: ${interaction.customId}`);
            }
            logger.info(`Modal "${interaction.customId}" submitted by "${interaction.user.tag}"`);
        } else {
            logger.error(`Unhandled interaction type: ${interaction.type}`);
        }
    },
};