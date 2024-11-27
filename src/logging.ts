const pino = require('pino')
const pretty = require('pino-pretty')


const logdir = process.env.LOGDIR || '/tmp/'


const createSonicBoom = (dest) =>
  pino.destination({dest: dest, append: true, sync: true})



let streams;


export function newLogger(topic) {

 const log = pino({ level: 'debug' }, pino.multistream(streams))
 console.log('newLogger', topic)
 return log

}


export function initLogging(config) {
 streams = [
  {stream: createSonicBoom(`${logdir}/info.log`)},
  {
   stream: pretty({
    colorize: true,
    sync: true,
   })
  },
  {level: 'error', stream: createSonicBoom(`${logdir}/error.log`)},
  {level: 'debug', stream: createSonicBoom(`${logdir}/debug.log`)},
  {level: 'fatal', stream: createSonicBoom(`${logdir}/fatal.log`)},
  pino.transport({
   target: './pino7-mysql.js',
   options: config.database
  })
 ]
}


export function testLogging() {

 const log = newLogger('test')
 log.info('App start');
 console.log('Before-Fatal')
 log.fatal('Fatal')
 log.error('Error')
 log.warn('Warn')
 console.log('After-Warn, Before-Info')
 log.info('Info')
 console.log('After-Info')

 log.debug('Debug')

 log.info({merging:'object'}, 'interpolation string %o', [123]);
 log.info({merging:{a:'object'}}, 'interpolation string %o', [123]);

 log.info('test123, 456, 789')
 log.info('test123 %o %o, 456, 789', 'abc', 'def') //   msg: "test123 'abc' 'def', 456, 789",

 const log2 = newLogger('app2');
 log2.info('app start');


}


export function newLog(name) {
 return newLogger(name)
}



export default newLogger;
