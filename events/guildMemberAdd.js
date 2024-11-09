const { Events } = require('discord.js');
const memberAuth = require('./memberManagement/memberAuth');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        memberAuth.newMemberJoined(member);
    }
};