import build from 'pino-abstract-transport'
import {spawn} from 'child_process'

export default async function (opts) {

 const child = spawn('/usr/bin/node', ['/app/app/src/node_modules/pino-elasticsearch/cli.js', '-u', 'yellow', '-p', 'yellow', 'http://localhost:9200'], { stdio: ['pipe', 'inherit', 'inherit'] } )

 return build(
  async function (source) {
   for await (let obj of source) {
    try {
     const objstr = JSON.stringify(obj);
     child.stdin.write(objstr + '\n');
    } catch (e) {
     console.log('Error:', e);
    }
   }
  },
  {
   async close(err) {
    console.log('Closing pino7-node-child-process-elasticsearch');
    //child.kill();
   }
  }
 );

}
