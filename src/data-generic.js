import { Database, Log } from 'yellow-server-common';
import { Info } from './info.js';

class DataGeneric {
 constructor() {
  this.db = new Database(Info.settings.database);
 }

 async close() {
  await this.db.disconnect();
 }

 async databaseExists() {
  return await this.db.databaseExists();
 }
}

