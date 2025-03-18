import build from 'pino-abstract-transport'
import {once} from 'events'
var mysql = require('mysql');
import SonicBoom from 'sonic-boom'


export default async function (opts) {

    opts = {...opts, database: opts.name};
    console.log('pino7-mysql opts:', opts);

    var con = mysql.createConnection(opts);

    let p = new Promise((resolve, reject) => {
     con.connect(function (err) {
         if (err) {
          console.log("pino7-mysql error: ", err);
          reject();
         }
         else {
          console.log("pino7-mysql connected to database.");
          resolve();
         }
     })});

    // const destination = new SonicBoom({dest: '/tmp/pino7-mysql-transport-debug.log', sync: false})
    // await once(destination, 'ready')
    await p;

    return build(
        async function (source) {
            for await (let obj of source) {

                try {

                 //console.log('ooobj', obj);

                 con.query(
                  'INSERT INTO logs(level, topic, message, json, created) VALUES(?, ?, ?, ?, ?)',
                  [
                   obj.level,
                   obj.name,
                   JSON.stringify(obj.msg),
                   JSON.stringify(obj),
                   new Date(obj.time)
                  ],
                  function (err, result) {
                  });

                 // const toDrain = !destination.write(JSON.stringify(obj) + '\n');
                 //
                 // // This block will handle backpressure
                 // if (toDrain) {
                 //  await once(destination, 'drain')
                 // }
                }
                catch (e) {
                 console.log('Error:', e);
                }

            }
        },
        {
            async close(err) {
                //destination.end()
                //await once(destination, 'close')
                //await db?.close();
            }
        })
}
