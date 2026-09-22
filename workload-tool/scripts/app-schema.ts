/**
 * The one Postgres schema this app owns.
 *
 * Its own module so importing it cannot drag in a script that runs on import.
 * Everything outside this schema in the target database belongs to something
 * else and must never be read or written by this app.
 */
export const APP_SCHEMA = "workload";
