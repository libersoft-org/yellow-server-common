import build from 'pino-abstract-transport'
import SonicBoom from 'sonic-boom'
import { once } from 'events'


import {DataGeneric} from 'yellow-server-common';


export default async function (opts) {

  const db = new DataGeneric(opts);

  // SonicBoom is necessary to avoid loops with the main thread.
  // It is the same of pino.destination().
  const destination = new SonicBoom({ dest: 'boom', sync: false })
  await once(destination, 'ready')

  return build(async function (source) {
    for await (let obj of source) {

      console.log('obj', obj);
      await db.db.query('INSERT INTO logs4(log) VALUES(?)', [obj]);

      const toDrain = !destination.write(obj.msg.toUpperCase() + '\n')
      // This block will handle backpressure
      if (toDrain) {
        await once(destination, 'drain')
      }
    }
  }, {
    async close (err) {
      destination.end()
      await once(destination, 'close')
    }
  })
}
