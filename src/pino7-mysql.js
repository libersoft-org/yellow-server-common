import build from 'pino-abstract-transport'
import SonicBoom from 'sonic-boom'
import {once} from 'events'
var mysql = require('mysql');


export default async function (opts) {

    var con = mysql.createConnection({...opts, database: opts.name});

    con.connect(function (err) {
        if (err) throw err;
        console.log("Connected!");
    });

    const destination = new SonicBoom({dest: 'boom', sync: false})
    await once(destination, 'ready')

    return build(
        async function (source) {
            for await (let obj of source) {

                ///console.log('ooobj', obj);

                /*if (obj.logging_reconf) {
                 db = new DataGeneric(logging_reconf);
                }*/

                //await db?.db.query('INSERT INTO logs4(log) VALUES(?)', [obj]);
                con.query('INSERT INTO logs4(log) VALUES(?)', [JSON.stringify(obj)]);

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
