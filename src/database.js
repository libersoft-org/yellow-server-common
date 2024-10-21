import mariaDB from 'mariadb';
import Log from './log.js';

class Database {
 constructor(settings) {
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
  this.connecting = false;
 }

 async connect() {
   this.conn = await mariaDB.createConnection(this.connectionConfig);
   Log.info('Connected to the database');
 }

 /*async reconnect() {
  if (this.conn) {
   try {
    await this.conn.end();
   } catch (ex) {
    Log.error('Error while disconnecting: ' + ex.message);
   }
  }
  this.conn = null;
  await this.connect();
 }*/

 async execute(callback) {
  if (!this.conn) {
   await this.connect();
  }
   const result = await callback(this.conn);
   return result;
 }

 async query(command, params = []) {
  Log.debug('query: ' + command + ' ' + params);
  return await this.execute(async conn => {
   Log.debug('conn: ', conn);
   const result = await conn.query(command, params);
   Log.debug('result: ', result);
   return result;
  });
 }

 async databaseExists() {
  return await this.execute(async conn => {
   const rows = await conn.query('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?', [this.settings.name]);
   return rows.length > 0;
  });
 }

 async tableExists(name) {
  return await this.execute(async conn => {
   const rows = await conn.query('SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', [this.settings.name, name]);
   return rows[0].cnt === 1;
  });
 }
}

export default Database;
