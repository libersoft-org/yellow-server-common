import { Log } from './log';

class Signals {

 constructor(allowedEvents) {
  this.allowedEvents = allowedEvents;
  this.clients = new Map();
 }

 subscribe(c) {
  if (!c.params) return { error: 1, message: 'Parameters are missing' };
  if (!c.params.event) return { error: 2, message: 'Event parameter is missing' };
  if (!this.allowedEvents.includes(c.params.event)) return { error: 3, message: 'Unsupported event name' };
  const clientData = this.clients.get(c.wsGuid);
  if (!clientData) return { error: 4, message: 'Client not found' };
  clientData.userID = c.userID;
  clientData.subscriptions.add(c.params.event);
  Log.debug('Client ' + c.ws.remoteAddress + ' subscribed to event: ' + c.params.event);
  return { error: 0, message: 'Event subscribed' };
 }

 notifySubscriber(userID, event, data) {
  for (const [wsGuid, clientData] of this.clients) {
   if (clientData.userID === userID && clientData.subscriptions.has(event)) {
    const msg = { event, data });
    Log.debug('Send event to: ' + wsGuid + ', message: ' + msg);
    this.send(clientData, msg);
   }
  }
 }

 userUnsubscribe(c) {
  if (!c.params) return { error: 1, message: 'Parameters are missing' };
  if (!c.params.event) return { error: 2, message: 'Event parameter is missing' };
  if (!this.allowedEvents.includes(c.params.event)) return { error: 3, message: 'Unsupported event name' };
  const clientData = this.webServer.wsClients.get(c.ws);
  if (!clientData) return { error: 4, message: 'Client not found' };
  if (!clientData.subscriptions?.has(c.params.event))
   return {
    error: 5,
    message: 'Client is not subscribed to this event',
   };
  clientData.subscriptions?.delete(c.params.event);
  return { error: 0, message: 'Event unsubscribed' };
 }

 removeClient(wsGuid) {
  this.clients.delete(wsGuid);
 }

