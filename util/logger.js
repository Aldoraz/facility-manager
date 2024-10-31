// Logger utility for logging messages at different levels (info, warn, error, debug).
 // Logs are written to the console (color-coded) and a rotating file ('bot.log').

const fs = require('fs');
const path = require('path');
const { blue, yellow, red, magenta } = require('colorette');

// Generates and returns the current timestamp in ISO format for logging purposes.
const getTimestamp = () => {
    return new Date().toISOString();
};

// Rotates the log files by renaming the current log to 'bot_previous.log' and preparing a fresh 'bot.log' for new entries.
const rotateLogs = () => {
    const logDirectory = path.join(__dirname, '../logs');
    const logFilePath = path.join(logDirectory, 'bot.log');
    const previousLogFilePath = path.join(logDirectory, 'bot_previous.log');

    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory);
    }

    if (fs.existsSync(logFilePath)) {
        fs.renameSync(logFilePath, previousLogFilePath);
    }
};
rotateLogs();

// Appends the log message to 'bot.log' with the appropriate level and timestamp for persistent logging.
const logToFile = (level, message) => {
    const logDirectory = path.join(__dirname, '../logs');
    const logFilePath = path.join(logDirectory, 'bot.log');
    const formattedMessage = `[${getTimestamp()}] ${level.toUpperCase()}: ${message}\n`;

    try {
        fs.appendFileSync(logFilePath, formattedMessage);
    } catch (error) {
        logger.error('Failed to write log to file:', error);
    }
};


// Logger object providing different log levels (info, warn, error, debug), formatting messages with timestamp, and writing them to a log file.
const logger = {
    info: (...messages) => {
        const timestamp = `[${getTimestamp()}]`;
        const formattedMessages = messages.map(msg => typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)).join(' ');
        console.log(`${timestamp} ${blue('INFO:')} ${formattedMessages}`);
        logToFile('info', formattedMessages);
    },
    warn: (...messages) => {
        const timestamp = `[${getTimestamp()}]`;
        const formattedMessages = messages.map(msg => typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)).join(' ');
        console.log(`${timestamp} ${yellow('WARN:')} ${formattedMessages}`);
        logToFile('warn', formattedMessages);
    },
    error: (...messages) => {
        const timestamp = `[${getTimestamp()}]`;
        const formattedMessages = messages.map(msg => {
            if (msg instanceof Error) {
                return `${msg.message}\n${msg.stack}`;
            }
            return typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
        }).join(' ');
        console.log(`${timestamp} ${red('ERROR:')} ${formattedMessages}`);
        logToFile('error', formattedMessages);
    },
    debug: (...messages) => {
        const timestamp = `[${getTimestamp()}]`;
        const formattedMessages = messages.map(msg => typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)).join(' ');
        console.log(`${timestamp} ${magenta('DEBUG:')} ${formattedMessages}`);
        logToFile('debug', formattedMessages);
    }
};

module.exports = logger;
