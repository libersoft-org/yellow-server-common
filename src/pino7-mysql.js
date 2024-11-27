import build from 'pino-abstract-transport'
import SonicBoom from 'sonic-boom'
import { once } from 'events'
import {DataGeneric} from 'yellow-server-common';


//let db = null;


export default async function (opts) {

  console.log('initializing mysql logging transport', opts);
  const db = new DataGeneric(opts);
  srtrstrs


  // SonicBoom is necessary to avoid loops with the main thread.
  // It is the same of pino.destination().
  const destination = new SonicBoom({ dest: 'boom', sync: false })
  await once(destination, 'ready')

  return build(
   async function (source) {
       for await (let obj of source) {

         /*console.log('obj', obj);

         if (obj.logging_reconf) {
          db = new DataGeneric(logging_reconf);
         }*/

         if (!db) {
           console.log('pino7mysql: no db');
           continue;
         }

         await db.db.query('INSERT INTO logs4(log) VALUES(?)', [obj]);

         const toDrain = !destination.write(obj.msg.toUpperCase() + '\n')
         // This block will handle backpressure
         if (toDrain) {
           await once(destination, 'drain')
         }
       }
    },
   {
    async close (err) {
      destination.end()
      await once(destination, 'close')
      await db?.close();
    }
  })
}
