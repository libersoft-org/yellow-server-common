import mariaDB, {ConnectionConfig} from 'mariadb';
import { newLogger } from './log';

const Log = newLogger('database');


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
  cluster: mariaDB.PoolCluster | null;


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
      initializationTimeout: 60000,
      leakDetectionTimeout: 10000,
      connectionLimit: 10,
      timezone: 'Z',
    };
    this.cluster = null;
  }


  async connect(): Promise<void> {
    Log.trace('connect createPoolCluster...');
    this.cluster = mariaDB.createPoolCluster({restoreNodeTimeout: 1000, removeNodeErrorCount: 999999999});
    Log.trace('connect add..');
    this.cluster.add("server1", this.connectionConfig);
    //this.cluster.add("server2", this.connectionConfig);
    //this.cluster.add("server3", this.connectionConfig);

    /*this.cluster.on('acquire', conn => {
      Log.info('Connection %d acquired', conn.threadId);
    });
    this.cluster.on('connection', conn => {
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
    this.cluster.on('enqueue', () => {
      Log.info('Waiting for available connection slot');
    });
    this.cluster.on('release', conn => {
      Log.info('Connection %d released', conn.threadId);
    });
    this.cluster.on('error', err => {
     Log.error('Pool error:', err);
    });*/

    /* attempt a connection to the database for verification */
    Log.trace('await this.cluster.getConnection()');
    let conn = await this.cluster.getConnection();
    const id = conn.threadId;
    Log.info('connected to database. connection id:', id);
    await conn.release();
    Log.trace('test conn', id, 'released.');
  }


  async disconnect(): Promise<void> {
    if (this.cluster) {
      await this.cluster.end();
      this.cluster = null;
      Log.info('Disconnected from the database');
    }
  }


  async execute<T>(callback: (conn: mariaDB.Connection) => Promise<T>): Promise<T> {
    Log.trace('execute...');
    if (!this.cluster) {
      Log.trace('execute: connect');
      await this.connect();
    }

    //Log.trace('execute getConnection');

    //Log.debug('pool.getConnection()...');
    let c = await this.cluster.getConnection();
    //Log.debug('pool.getConnection()...done');

    /*if (!this.connections[c.threadId]) {
     throw new Error('Connection not found');
    }*/

    let result;
    try {
     try {
      result = await callback(c);
     } finally {
      //Log.debug('commit & release ', c.threadId);
      await c.commit();
      await c.release();
      //Log.debug('done commit & release ', c.threadId);
/*
         Log.trace("Total connections: ", this.pools[0].totalConnections());
         Log.trace("Active connections: ", this.pools[0].activeConnections());
         Log.trace("Idle connections: ", this.pools[0].idleConnections());
*/
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
    Log.trace('databaseExists?...');
    return await this.execute(async conn => {
      Log.trace('databaseExists: find schema', this.settings.name, '...');
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
