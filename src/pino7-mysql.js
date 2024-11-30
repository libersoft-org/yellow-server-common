import build from 'pino-abstract-transport'
import {once} from 'events'
var mysql = require('mysql');
import SonicBoom from 'sonic-boom'


export default async function (opts) {

    var con = mysql.createConnection({...opts, database: opts.name});

    let p = new Promise((resolve, reject) => {
     con.connect(function (err) {
         if (err) reject();
         console.log("pino7-mysql connected to database.");
         resolve();
     })});

    const destination = new SonicBoom({dest: '/tmp/pino7-mysql-transport-debug.log', sync: false})
    await once(destination, 'ready')
    await p;

    return build(
        async function (source) {
            for await (let obj of source) {

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
                 function (err, result) {});

                const toDrain = !destination.write(obj.msg.toUpperCase() + '\n')

                // This block will handle backpressure
                if (toDrain) {
                    await once(destination, 'drain')
                }
            }
        },
        {
            async close(err) {
                destination.end()
                await once(destination, 'close')
                //await db?.close();
            }
        })
}
