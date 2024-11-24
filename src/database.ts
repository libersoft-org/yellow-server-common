import mariaDB, {ConnectionConfig} from 'mariadb';
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
  connections: object;

  constructor(settings: DatabaseSettings) {
    if (!settings) {
      throw new Error('Database settings are missing');
    }
    this.settings = settings;
    this.connections = {};

    this.connectionConfig = {
      host: this.settings.host,
      port: this.settings.port,
      user: this.settings.user,
      password: this.settings.password,
      database: this.settings.name,
      bigIntAsNumber: true,
      metaAsArray: false,
      trace: import.meta.env.VITE_YELLOW_DEBUG,
      debug: import.meta.env.VITE_YELLOW_DB_DEBUG,
      initializationTimeout: 0,
      leakDetectionTimeout: 10000,
    };
    this.pool = null;
  }

  async connect(): Promise<void> {
/*
The createPoolCluster(options) → PoolCluster function does not return a Promise, and therefore must be wrapped in a new Promise object if its return value is returned directly from an async function.
 */

    this.pool = await mariaDB.createPoolCluster({});
    this.pool.add("server1", this.connectionConfig);

    /*this.pool.on('acquire', conn => {
      Log.info('Connection %d acquired', conn.threadId);
    });
    this.pool.on('connection', conn => {
      Log.info('? connection %d', conn.threadId);
      if (!this.connections[conn.threadId]) {
        Log.info('..New connection %d', conn.threadId);
        this.connections[conn.threadId] = true;
        void 'https://github.com/mariadb-corporation/mariadb-connector-nodejs/issues/195';
        conn.on('error', (err) => {
          Log.error('database connection error:', err);
        });
      }
    });
    this.pool.on('enqueue', () => {
      Log.info('Waiting for available connection slot');
    });
    this.pool.on('release', conn => {
      Log.info('Connection %d released', conn.threadId);
    });
    this.pool.on('error', err => {
     Log.error('Pool error:', err);
    });*/

    let conn = await this.pool.getConnection();
    Log.info('connected to database. connection id:', conn.threadId);
    conn.release();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      Log.info('Disconnected from the database');
    }
  }

  async execute<T>(callback: (conn: mariaDB.Connection) => Promise<T>): Promise<T> {
    if (!this.pool) {
      await this.connect();
    }
    let c = await this.pool.getConnection();

    /*if (!this.connections[c.threadId]) {
     throw new Error('Connection not found');
    }*/

    let result;
    try {
     try {
      result = await callback(c);
     } finally {
      await c.end();
      await c.release();
     }
    }
    catch (err) {
      Log.error('Error executing database command:', err);
      throw err;
    }
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
