import { newLogger } from './log';

const Log = newLogger('signals');

export class Signals {
  allowedEvents: string[];
  clients: Map<string, any>;
  send: (wsGuid: string, clientData: any, msg: any) => void;

  constructor(allowedEvents: string[], clients: Map<string, any>, send: (wsGuid: string, clientData: any, msg: any) => void) {
    this.allowedEvents = allowedEvents;
    this.clients = clients;
    this.send = send;
  }

  clientDataByWsGuid(wsGuid: string) {
    let r = this.clients.get(wsGuid);
    if (!r) return null;
    if (!r.subscriptions) r.subscriptions = new Set();
    return r;
  }

  subscribe(c: any) {
    if (!c.params) return { error: 1, message: 'Parameters are missing' };
    if (!c.params.event) return { error: 2, message: 'Event parameter is missing' };
    if (!this.allowedEvents.includes(c.params.event)) return { error: 3, message: 'Unsupported event name' };
    const clientData = this.clientDataByWsGuid(c.wsGuid);
    if (!clientData) return { error: 4, message: 'Client not found' };
    clientData.subscriptions.add(c.params.event);
    Log.debug('Client ' + c.ws.remoteAddress + ' subscribed to event: ' + c.params.event);
    return { error: false, message: 'Event subscribed' };
  }

  notify(corr, event: string, data: any) {
    for (const [wsGuid, clientData] of this.clients) {
      if (clientData.subscriptions?.has(event)) {
        const msg = { event, data };
        Log.debug(corr, 'Send event to: ' + wsGuid + ', message: ', (msg));
        this.send(wsGuid, clientData, msg);
      }
    }
    return { error: false, message: 'Event sent' };
  }

  notifyUser(userID: string, event: string, data: any, corr: object) {
    const clients = this.userClients(userID);
    const subscribed = new Map();
    for (const [wsGuid, clientData] of clients.entries()) {
      if (clientData.subscriptions?.has(event)) {
        subscribed.set(wsGuid, clientData);
      }
    }
   Log.trace(corr, 'notifyUser:  userID: ' + userID + ', event: ' + event + ', data: ', data, ', clients: ', Array.from(clients.keys()), ', subscribed: ', Array.from(subscribed.keys()));
   for (const [wsGuid, clientData] of subscribed.entries())
   {
        Log.trace(corr, 'Send event to wsGuid ' + wsGuid);
        const msg = {event, data};
        this.send(wsGuid, clientData, msg);
    }
  }

  userClients(userID: string) {
   let r = new Map();
   for (const [wsGuid, clientData] of this.clients) {
    if (clientData.userID == userID) {
     r.set(wsGuid, clientData);
    }
   }
   return r
  }


  unsubscribe(c: any) {
    if (!c.params) return { error: 1, message: 'Parameters are missing' };
    if (!c.params.event) return { error: 2, message: 'Event parameter is missing' };
    if (!this.allowedEvents.includes(c.params.event)) return { error: 3, message: 'Unsupported event name' };
    const clientData = this.clientDataByWsGuid(c.wsGuid);
    if (!clientData) return { error: 4, message: 'Client not found' };
    if (!clientData.subscriptions.has(c.params.event)) {
      return { error: 5, message: 'Client is not subscribed to this event' };
    }
    clientData.subscriptions.delete(c.params.event);
    return { error: false, message: 'Event unsubscribed' };
  }
}
