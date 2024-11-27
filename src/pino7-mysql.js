import build from 'pino-abstract-transport'
import SonicBoom from 'sonic-boom'
import { once } from 'events'
import mariaDB, {ConnectionConfig} from 'mariadb';


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
      initializationTimeout: 1000,
      leakDetectionTimeout: 10000,
      connectionLimit: 10,
    };
    this.cluster = null;
  }

  async connect(): Promise<void> {
    console.log('connect createPoolCluster');
    this.cluster = await mariaDB.createPoolCluster({restoreNodeTimeout: 1000, removeNodeErrorCount: 999999999});
    this.cluster.add("server1", this.connectionConfig);
    console.log('await this.cluster.getConnection()');
    let conn = await this.cluster.getConnection();
    Log.info('connected to database. connection id:', conn.threadId);
    conn.release();
  }

  async disconnect(): Promise<void> {
    if (this.cluster) {
      await this.cluster.end();
      this.cluster = null;
      Log.info('Disconnected from the database');
    }
  }

  async execute<T>(callback: (conn: mariaDB.Connection) => Promise<T>): Promise<T> {
    console.log('execute');
    if (!this.cluster) {
      console.log('execute connect');
      await this.connect();
    }
    console.log('execute getConnection');
    let c = await this.cluster.getConnection();
    console.log('execute callback');

    let result;
    try {
     try {
      result = await callback(c);
     } finally {
      await c.commit();
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
}


interface Settings {
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



export default async function (opts) {

   /*console.log('initializing mysql logging transport', opts);
   const db = new DataGeneric({
   "host": "127.0.0.1",
   "port": 3306,
   "user": "username",
   "password": "password",
   "name": "yellow"
  });*/

  // SonicBoom is necessary to avoid loops with the main thread.
  // It is the same of pino.destination().
  const destination = new SonicBoom({ dest: 'boom', sync: false })
  await once(destination, 'ready')

  return build(
   async function (source) {
       /*for await (let obj of source) {

         /!*console.log('obj', obj);

         if (obj.logging_reconf) {
          db = new DataGeneric(logging_reconf);
         }*!/

         //await db?.db.query('INSERT INTO logs4(log) VALUES(?)', [obj]);

         const toDrain = !destination.write(obj.msg.toUpperCase() + '\n')
         // This block will handle backpressure
         if (toDrain) {
           await once(destination, 'drain')
         }
       }*/
    },
   {
    async close (err) {
      destination.end()
      await once(destination, 'close')
      //await db?.close();
    }
  })
}
