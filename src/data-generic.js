import Database from './database.js';

class DataGeneric {
 constructor(settings) {
  this.db = new Database(settings);
 }

 async close() {
  await this.db.disconnect();
 }

 async databaseExists() {
  return await this.db.databaseExists();
 }
}

export default DataGeneric;
