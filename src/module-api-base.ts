import { Signals } from './signals';
import { ApiCore } from './api-core';
import { newLogger } from './log';

const Log = newLogger('module-api-base');


interface Command {
  method: (context: any) => Promise<any>;
  reqUserSession?: boolean;
}

interface Request {
  type: string;
  requestID?: string;
  wsGuid?: string;
  userID?: string;
  userAddress?: string;
  data?: {
    command?: string;
    params?: any;
  };
  result?: any;
  corr: object;
}

interface Response {
  type: string;
  requestID?: string;
  wsGuid?: string;
  error?: number;
  message?: string;
  [key: string]: any;
}

export class ModuleApiBase {
  private app: any;
  private clients: Map<string, any>;
  private core: ApiCore;
  private signals: Signals;
  private commands: { [key: string]: Command };

  constructor(app: any, allowedEvents: string[]) {
    this.app = app;
    this.clients = new Map();
    this.core = new ApiCore();
    this.signals = new Signals(
      allowedEvents,
      this.clients,
      (wsGuid: string, _clientData: any, msg: any) => this.core.send({ ...msg, type: 'notify', wsGuid })
    );
    this.commands ={
       subscribe: { method: this.signals.subscribe.bind(this.signals) },
       unsubscribe: { method: this.signals.unsubscribe.bind(this.signals) }
    }
  }

  async processWsMessage(ws: any, json: string): Promise<Response | void> {
    let req: Request;
    try {
      req = JSON.parse(json);
    } catch (ex) {
      return { error: 902, message: 'Invalid JSON command', type: 'response', requestID: req.requestID, wsGuid: req.wsGuid };
    }

    try {
     if (req.type === 'response') {
      return this.processResponse(req);
     } else if (req.type === 'request') {
      return await this.processAPI(ws, req);
     } else if (req.type === 'server_command') {
      this.processServerCommand(req);
     } else {
      Log.warning('Unknown message type:', req);
      return {
       error: 901,
       message: 'Unknown message type',
       type: 'response',
       requestID: req.requestID,
       wsGuid: req.wsGuid
      };
     }
    }
    catch (ex) {
      Log.error('processWsMessage error:', ex.message);
      return {
       error: 999,
       message: 'Internal module error',
       type: 'response',
       requestID: req.requestID,
       wsGuid: req.wsGuid
      };
    }
  }

  private processServerCommand(data: any) {
   if (data.cmd === 'client_disconnect') {
    let wsGuid = data.wsGuid;
    this.clients.delete(wsGuid);
   }
  }

 private processResponse(req: Request) {
  let requestID = req.requestID;
  let cb = this.core.requests.get(requestID);
  //Log.debug('result from core for requestID:', requestID, req.result);
  if (cb) {
   cb(req.result);
   delete this.core.requests[requestID];
  } else {
   Log.warning('No callback for the response:', req);
   Log.warning('requests:', this.core.requests);
   Log.warning('requestID:', requestID);
   Log.warning('typeof requestID:', typeof requestID);
   for (let kv of this.core.requests) {
    let key = kv[0];
    Log.warning('key:', key);
    Log.warning('typeof key:', typeof key);
    Log.warning('key === requestID:', key === requestID);
    Log.warning('key == requestID:', key == requestID);
   }
   Log.warning('cb:', cb);
   Log.warning('this.core:', this.core);
  }
 }

 async processAPI(ws: any, req: Request): Promise<Response> {
    if (this.core.ws !== ws) {
     Log.debug('Updating server ws. Old ws:', this.core.ws?.remoteAddress, 'New ws:', ws.remoteAddress);
     this.core.ws = ws;
    }

    let corr = req.corr;
    //Log.debug('corr:', corr);

    let resp: Response = { type: 'response' };

    if (req.requestID) resp.requestID = req.requestID;
    if (req.wsGuid) resp.wsGuid = req.wsGuid;

    let command = req.data?.command;
    Log.debug(corr, 'API command: ' + command);

    if (!command) return { ...resp, error: 999, message: 'Command not set' };
    const command_fn = this.commands[command];
    if (!command_fn) return { ...resp, error: 903, message: 'Unknown API command' };

    const context = { ws, wsGuid: req.wsGuid, userID: req.userID, userAddress: req.userAddress, corr };
    this.updateUserData(context);

    if (command_fn.reqUserSession && !req.sessionID) {
      return { ...resp, error: 996, message: 'User session is missing' };
    }

    context.params = req.data?.params;

    let method_result = await command_fn.method.call(this, context);
    return { ...resp, ...method_result };
  }

  updateUserData(req: { wsGuid: string; userID?: string }) {
    if (req.userID) {
      let userData = this.clients.get(req.wsGuid);
      if (!userData) {
        userData = {};
        this.clients.set(req.wsGuid, userData);
      }
      userData.userID = req.userID;
    }
  }
}
