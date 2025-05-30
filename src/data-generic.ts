import Database from './database.js';

interface Settings {
}

class DataGeneric {
  db: Database;

  constructor(settings: Settings) {
    this.db = new Database(settings);
  }

  async close(): Promise<void> {
    await this.db.disconnect();
  }

  async databaseExists(): Promise<boolean> {
    return await this.db.databaseExists();
  }

  async checkDatabase(): Promise<void> {
  }

}

export default DataGeneric;
