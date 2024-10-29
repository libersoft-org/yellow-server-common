import { Log } from './log';

export class ApiCore {
  public ws: WebSocket | undefined;
  public requests: Map<string, (res: any) => void>;
  public api: any;

  constructor() {
    this.ws = undefined;
    this.requests = new Map<string, (res: any) => void>();
    this.api = new Proxy({}, {
      get: (_target, prop: string) => {
        return async (...args: any[]) => {
          return await this.call(prop, args);
        };
      }
    });
  }

  async call(command: string, params: any[]): Promise<any> {

    const requestID = Math.random().toString(36);
    const msg = { type: 'command', command, params, requestID };

    const promise = new Promise<any>((resolve, reject) => {
      this.requests.set(requestID, (res) => {
        resolve(res);
      });
      this.send(msg);
    });

    return await promise;
  }

  public send(msg: any): void {
    //Log.info('send to core:', msg);
    if (this.ws) {
      this.ws.send(JSON.stringify(msg));
    } else {
      Log.error('WebSocket is not defined.');
    }
  }
}
