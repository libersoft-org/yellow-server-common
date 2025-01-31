export function websocketOptions(settings) {
 let r = {};
 for (let key in ['idleTimeout', 'maxPayloadLength', 'backpressureLimit', 'closeOnBackpressureLimit', 'perMessageDeflate']) {
  if (settings?.websocket?.[key]) {
   r[key] = settings[key];
  }
 }
 return r;
}
