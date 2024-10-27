import { Log, Signals } from "yellow-server-common";
import { ApiCore } from './api-core.js';
import { Mutex } from 'async-mutex';


class ApiClient {
 constructor(webServer, allowedEvents, commands) {
  this.webServer = webServer;
  this.clients = new Map();
  this.core = new ApiCore();
  this.signals = new Signals(
   allowedEvents,
   this.clients,
   (wsGuid, _clientData, msg) => this.core.send({...msg, type: 'notify', wsGuid } )
  );
  this.commands = commands;
 }

 async processWsMessage(ws, json) {
  let req;
  try {
   req = JSON.parse(json);
  } catch (ex) {
   return {error: 902, message: 'Invalid JSON command'};
  }

  if (req.type === 'response') {
   let requestID = req.requestID;
   let cb = this.core.requests[requestID];
   Log.debug('result from core for requestID:', requestID, req.result);
   if (cb) {
    cb(req.result);
    delete this.core.requests[requestID];
   }
   else
   {
    Log.warning('No callback for the response:', req);
   }
   return;
  }
  else if (req.type === 'request') {
   return await this.processAPI(ws, req);
  }
  else
  {
   Log.warning('Unknown message type:', req);
  }
 }


 async processAPI(ws, req) {
  if (this.core.ws && this.core.ws != ws) console.info('update APICore ws.');
  this.core.ws = ws;

  //Log.debug('API request: ' + JSON.stringify(req));

  let resp = {type: 'response'};

  if (req.requestID) resp.requestID = req.requestID;
  if (req.wsGuid) resp.wsGuid = req.wsGuid;

  let command = req.data?.command;
  Log.debug('API command: ' + command);

  if (!command) return { ...resp, error: 999, message: 'Command not set' };
  const command_fn = this.commands[command];
  //Log.debug('API command_fn: ' + command_fn);
  if (!command_fn) return { ...resp, error: 903, message: 'Unknown API command' };

  const context = { ws, wsGuid: req.wsGuid, userID: req.userID, userAddress: req.userAddress };
  this.updateUserData(context);

  if (command_fn.reqUserSession && !req.sessionID)
  {
   return { ...resp, error: 996, message: 'User session is missing' };
  }

  context.params = req.data?.params;

  let method_result = await command_fn.method.call(this, context);
  return { ...resp, ...method_result };
 }


 updateUserData(req) {
  if (req.userID) {
   let userData = this.clients.get(req.wsGuid);
   if (!userData) {
    userData = {};
    this.clients.set(req.wsGuid, userData);
   }
   userData.userID = req.userID;
  }
 }
