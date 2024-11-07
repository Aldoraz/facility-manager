const { Events } = require('discord.js');
const ready = require('./base/ready');


module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        ready(client);
    },
};