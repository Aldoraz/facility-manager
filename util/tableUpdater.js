const logger = require ('./logger');
const db = require ('./database');

db.serialize(() => {
    db.run(`DROP TABLE old_members`, (err) => {
        if (err) {
            logger.error('Error dropping old members table:', err.message);
        }
        logger.info('Dropped old members table');
    });

    // Step 1: Rename the old table
    db.run(`ALTER TABLE members RENAME TO old_members`, (err) => {
        if (err) {
            return logger.error('Error renaming table:', err.message);
        }
        logger.info('Renamed old members table');

        // Step 2: Create the new table with the updated schema
        db.run(`
            CREATE TABLE members (
                id TEXT PRIMARY KEY,
                accepted_tos BOOLEAN NOT NULL DEFAULT 0,
                time_joined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                return logger.error('Error creating new members table:', err.message);
            }
            logger.info('Created new members table with updated schema');

            // Step 3: Copy data from the old table to the new table
            db.run(`
                INSERT INTO members (id, accepted_tos, time_joined)
                SELECT id, accepted_tos, time_joined FROM old_members
            `, (err) => {
                if (err) {
                    return logger.error('Error copying data to new members table:', err.message);
                }
                logger.info('Copied data to new members table');

                // Step 4: Drop the old table
                db.run(`DROP TABLE old_members`, (err) => {
                    if (err) {
                        return logger.error('Error dropping old members table:', err.message);
                    }
                    logger.info('Dropped old members table');
                    logger.info('Schema update complete');
                });
            });
        });
    });
});
