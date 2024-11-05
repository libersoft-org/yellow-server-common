import mariaDB from 'mariadb';
import Log from './log.js';

interface DatabaseSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

class Database {
  settings: DatabaseSettings;
  connectionConfig: mariaDB.ConnectionConfig;
  conn: mariaDB.Connection | null;

  constructor(settings: DatabaseSettings) {
    if (!settings) {
      throw new Error('Database settings are missing');
    }
    this.settings = settings;

    this.connectionConfig = {
      host: this.settings.host,
      port: this.settings.port,
      user: this.settings.user,
      password: this.settings.password,
      database: this.settings.name,
      bigIntAsNumber: true,
      metaAsArray: false,
    };
    this.conn = null;
  }

  async connect(): Promise<void> {
    this.conn = await mariaDB.createConnection(this.connectionConfig);
    Log.info('Connected to the database');
  }

  async disconnect(): Promise<void> {
    if (this.conn) {
      await this.conn.end();
      this.conn = null;
      Log.info('Disconnected from the database');
    }
  }

  async execute<T>(callback: (conn: mariaDB.Connection) => Promise<T>): Promise<T> {
    if (!this.conn) {
      await this.connect();
    }
    const result = await callback(this.conn);
    return result;
  }

  async query<T>(command: string, params: any[] = []): Promise<T> {
    return await this.execute(async conn => {
      const result = await conn.query(command, params);
      return result;
    });
  }

  async databaseExists(): Promise<boolean> {
    return await this.execute(async conn => {
      const rows = await conn.query('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?', [this.settings.name]);
      return rows.length > 0;
    });
  }

  async tableExists(name: string): Promise<boolean> {
    return await this.execute(async conn => {
      const rows = await conn.query('SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', [this.settings.name, name]);
      return rows[0].cnt === 1;
    });
  }
}

export default Database;
