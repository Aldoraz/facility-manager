require('dotenv').config({ 
    path: process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev' 
});
const { Events } = require('discord.js');
const memberAuth = require('./memberManagement/memberAuth');
const logger = require('../util/logger');

const currentServerId = process.env.SERVER_ID;

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.guild.id !== currentServerId) {
            logger.info(`Event from outside the current environment detected (guild ID: ${member.guild.id}). Event ignored.`);
            return;
        }
        memberAuth.newMemberJoined(member);
    }
};