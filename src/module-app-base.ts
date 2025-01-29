import path from 'path';
import {newLogger, reconfigureLogging} from './log';

const Log = newLogger('module-app-base');


export class ModuleAppBase {

 public info: any;

 constructor(info, appPath) {
  this.appPath = appPath;
  this.info = {
   appName: 'Yellow Server Module',
   appVersion: '0.01',
   settingsFile: import.meta.env.VITE_YELLOW_SETTINGS_PATH || path.join(appPath, 'settings.json'),
   ...info
  }
  console.log('this.info', this.info);
  this.defaultSettings = {
    web: {
     http_port: 25001,
     allow_network: false
    },
    database: {
     host: '127.0.0.1',
     port: 3306,
     user: 'yellow_module_org_libersoft_messages',
     password: 'password',
     name: 'yellow_module_org_libersoft_messages'
    }
   };
 }

 async run() {
  const args = process.argv.slice(2);
  switch (args.length) {
   case 0:
    await this.runServer();
    break;
   case 1:
    if (args[0] === '--create-settings') await this.createSettings();
    else if (args[0] === '--create-database') await this.createDatabase();
    else this.getHelp();
    break;
   default:
    this.getHelp();
    break;
  }
 }

 async runServer() {
   await this.loadSettings();
   const header = this.info.appName + ' ver. ' + this.info.appVersion;
   const dashes = '='.repeat(header.length);
   Log.info(dashes);
   Log.info(header);
   Log.info(dashes);
   Log.info('');
   reconfigureLogging({ appPath: this.appPath, ...this.info.settings });
   await this.init();
   await this.checkDatabase();
   await Bun.serve({
    fetch: this.getFetch(),
    websocket: this.getWebSocket(),
    port: this.info.settings.web.http_port
   });
   Log.info('HTTP server is running on port: ' + this.info.settings.web.http_port);
 }

 getFetch() {
  return async (req, server) => {
   if (server.upgrade(req)) return;
   let clientIP = server.requestIP(req).address;
   const forwardedHeaders = [req.headers.get('x-forwarded-for'), req.headers.get('cf-connecting-ip'), req.headers.get('x-real-ip'), req.headers.get('forwarded'), req.headers.get('x-client-ip'), req.headers.get('x-cluster-client-ip'), req.headers.get('true-client-ip'), req.headers.get('proxy-client-ip'), req.headers.get('wl-proxy-client-ip')];
   for (const header of forwardedHeaders) {
    if (header) {
     clientIP = header.split(',')[0];
     break;
    }
   }
   Log.info(req.method + ' request from: ' + clientIP + ', URL: ', req.url);
   const url = new URL(req.url);
   if (url.pathname === "/health") return new Response("OK!");
   return new Response('<h1>404 Not Found</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } });
  };
 }

 getWebSocket() {
  const api = this.api;
  return {
   message: async (ws, message) => {
    Log.debug('WebSocket message from: ', ws.remoteAddress, ', message: ', message);
    const res = await api.processWsMessage(ws, message);
    if (res) {
     Log.info('WebSocket response to: ', ws.remoteAddress, ', message: ', res);
     ws.send(JSON.stringify(res));
    }
   },
   open: ws => {
    Log.info('WebSocket connected: ' + ws.remoteAddress);
   },
   close: (ws, code, message) => {
    Log.info('WebSocket disconnected: ' + ws.remoteAddress + ', code: ' + code + (message ? ', message: ' + message : ''));
   },
   drain: ws => {
    // the socket is ready to receive more data
    //console.log('DRAIN', ws);
   }
  };
 }

 getHelp() {
  Log.info('Command line arguments:');
  Log.info('');
  Log.info('--help - to see this help');
  Log.info('--create-settings - to create a default settings file named "' + this.info.settingsFile + '"');
  Log.info('--create-database - to create a tables in database defined in the settings file');
 }

 async loadSettings() {
  Log.debug('Loading settings from file: ' + this.info.settingsFile);
  const file = Bun.file(this.info.settingsFile);
  if (await file.exists()) {
   try {
    this.info.settings = await file.json();
   } catch {
    Log.info('Settings file "' + this.info.settingsFile + '" has an invalid format.', 2);
    process.exit(1);
   }
  } else {
   Log.info('Settings file "' + this.info.settingsFile + '" not found. Please run this application again using: "./start.sh --create-settings"', 2);
   process.exit(1);
  }
 }

 async createSettings() {
  const file = Bun.file(this.info.settingsFile);
  if (await file.exists()) {
   Log.info('Settings file "' + this.info.settingsFile + '" already exists. If you need to replace it with default one, delete the old one first.', 2);
   process.exit(1);
  } else {
   let settings = this.defaultSettings;
   await Bun.write(this.info.settingsFile, JSON.stringify(settings, null, 1));
   Log.info('Settings file was created sucessfully.');
  }
 }

 async checkDatabase() {
  if (!(await this.data.databaseExists())) {
   Log.info('Database is not yet created. Please run "./start.sh --create-database" first.', 2);
   process.exit(1);
  }
 }

 async createDatabase() {
  await this.loadSettings();
  await this.init();
  await this.data.createDB();
  Log.info('Database creation completed.');
  await this.data.close();
  process.exit(1);
 }
}

export default ModuleAppBase;
