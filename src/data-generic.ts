import Database from './database.js';

interface Settings {
  // Define the shape of the settings object if known
}

class DataGeneric {
  db: Database;

  /* todo: reconnects */

  constructor(settings: Settings) {
    this.db = new Database(settings);
  }

  async close(): Promise<void> {
    await this.db.disconnect();
  }

  async databaseExists(): Promise<boolean> {
    return await this.db.databaseExists();
  }
}

export default DataGeneric;
