import { Log } from './log';
import { Signals } from './signals';
import { ApiCore } from './api-core';
import { Mutex } from 'async-mutex';

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
  private webServer: any;
  private clients: Map<string, any>;
  private core: ApiCore;
  private signals: Signals;
  private commands: { [key: string]: Command };

  constructor(webServer: any, allowedEvents: string[]) {
    this.webServer = webServer;
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
      return { error: 902, message: 'Invalid JSON command' };
    }

    if (req.type === 'response') {
      let requestID = req.requestID;
      let cb = this.core.requests[requestID];
      Log.debug('result from core for requestID:', requestID, req.result);
      if (cb) {
        cb(req.result);
        delete this.core.requests[requestID];
      } else {
        Log.warning('No callback for the response:', req);
        Log.warning('requests:', this.core.requests);
        Log.warning('requestID:', requestID);
        Log.warning('typeof requestID:', typeof requestID);
        for (let key in this.core.requests) {
          Log.warning('key:', key);
          Log.warning('typeof key:', typeof key);
          Log.warning('key === requestID:', key === requestID);
        }
        Log.warning('cb:', cb);
        Log.warning('this.core:', this.core);
      }
      return;
    } else if (req.type === 'request') {
      return await this.processAPI(ws, req);
    } else {
      Log.warning('Unknown message type:', req);
    }
  }

  async processAPI(ws: any, req: Request): Promise<Response> {
    if (this.core.ws && this.core.ws !== ws) console.info('update APICore ws.');
    this.core.ws = ws;

    let resp: Response = { type: 'response' };

    if (req.requestID) resp.requestID = req.requestID;
    if (req.wsGuid) resp.wsGuid = req.wsGuid;

    let command = req.data?.command;
    Log.debug('API command: ' + command);

    if (!command) return { ...resp, error: 999, message: 'Command not set' };
    const command_fn = this.commands[command];
    if (!command_fn) return { ...resp, error: 903, message: 'Unknown API command' };

    const context = { ws, wsGuid: req.wsGuid, userID: req.userID, userAddress: req.userAddress };
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
