import build from 'pino-abstract-transport'
import {once} from 'events'
var mysql = require('mysql');
import SonicBoom from 'sonic-boom'


export default async function (opts) {

    var con = mysql.createConnection({...opts, database: opts.name});

    con.connect(function (err) {
        if (err) throw err;
        console.log("pino7-mysql connected to database.");
    });

    const destination = new SonicBoom({dest: '/tmp/pino7-mysql-transport-debug.log', sync: false})
    await once(destination, 'ready')

    return build(
        async function (source) {
            for await (let obj of source) {

                //console.log('ooobj', obj);

                /*if (obj.logging_reconf) {
                 db = new DataGeneric(logging_reconf);
                }*/

                //await db?.db.query('INSERT INTO logs4(log) VALUES(?)', [obj]);
                con.query('INSERT INTO logs(json) VALUES(?)', [JSON.stringify(obj)]);
                // level, message, params



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
