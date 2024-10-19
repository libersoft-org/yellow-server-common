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
   bigIntAsNumber: true
  };
  this.conn = null;
  this.connecting = false;
 }

 async connect() {
   this.conn = await mariaDB.createConnection(this.connectionConfig);
   Log.addLog('Connected to the database');
 }

 async reconnect() {
  if (this.conn) {
   try {
    await this.conn.end();
   } catch (ex) {
    Log.addLog('Error while disconnecting: ' + ex.message, 2);
   }
  }
  this.conn = null;
  await this.connect();
 }

 async execute(callback) {

  Log.addLog('db.execute');

  try {
   if (!this.conn)
   {
    await this.connect();
    Log.addLog('Connected: ' + JSON.stringify(this.conn));
   }
   else {
    try {
     await this.conn.ping();
    } catch (err) {
     Log.addLog('Connection lost: ' + err.message, 2);
     await this.reconnect();
     Log.addLog('Reconnected: ' + JSON.stringify(this.conn));
    }
   }
   Log.addLog('callback: ' + callback);
   const result = await callback(this.conn);
   Log.addLog('result: ' + JSON.stringify(result));
   return result;
  } catch (ex) {
   Log.addLog(ex.message, 2);
   return null;
  }
 }

 async query(command, params = []) {
  Log.addLog('query: ' + command + ' ' + params);
  return await this.execute(async conn => {
   Log.addLog('conn: ' + JSON.stringify(conn));
   const result = await conn.query(command, params);
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
