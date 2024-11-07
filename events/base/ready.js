const logger = require('../../util/logger');

async function ready(client) {
    logger.info(`${client.user.tag} clocked in.`);
}

module.exports = ready;