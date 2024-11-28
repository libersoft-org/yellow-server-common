const util = require('util')
const pino = require('pino')
const pretty = require('pino-pretty')


const logdir = process.env.LOGDIR || '/tmp/'


const createSonicBoom = (dest) =>
 pino.destination({dest: dest, append: true, sync: true})


/*let tr = pino.transport({
  target: '/home/koom/repos/koo5/yellow-dev/0/yellow-dev/yellow-server-common/src/pino7-mysql.js',
})*/


let globalPino = pino({level: 'debug'}, pino.multistream({
 stream: pretty({
  colorize: true,
  sync: true,
 })
}));

let loggers: any = [];



export function reconfigureLogging(config) {
 /* takes either null or the relevant settings.json section */

 let streams = [
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
 ];

 if (config && config.database) {
  console.log('config.database', config.database)
  let tr = pino.transport({
    target: './pino7-mysql.js',
    options: config.database
  })
  streams.push(tr)
 }

 globalPino = pino({level: 'debug'}, pino.multistream(streams));

 for (const logger of loggers) {
  logger.reconfigure();
 }
}


export class Logger {

 name: string;
 myPino: any;

 constructor(name) {
  this.name = name;
  loggers.push(this);
  this.reconfigure();
 }

 reconfigure() {
  this.myPino = globalPino.child({name: this.name});
 }

 debug(...args: any[]): void {
  this.myPino.debug(this.format(args));
 }

 info(...args: any[]): void {
  this.myPino.info(this.format(args));
 }

 warn(...args: any[]): void {
  this.myPino.warn(this.format(args));
 }

 warning(...args: any[]): void {
  this.myPino.warn(this.format(args));
 }

 error(...args: any[]): void {
  this.myPino.error(this.format(args));
 }

 fatal(...args: any[]): void {
  this.myPino.fatal(this.format(args));
 }

 format(args: any[]): string {
  let msg = '';
  const inspected_nocolor = args.map((o) => (typeof o === 'string' ? o : util.inspect(o, {
   showHidden: false,
   depth: null,
   colors: false
  })));
  for (const v of inspected_nocolor) {
   msg += v + ' ';
  }
  return msg;
 }

}


export function newLogger(name) {
 return new Logger(name);
}



export function testLogging() {
 const log = newLogger('test1')
 log.info('testLogging start');
 console.log('Before-Fatal')
 log.fatal('Fatal')
 log.error('Error')
 log.warn('Warn')
 console.log('After-Warn, Before-Info')
 log.info('Info')
 console.log('After-Info')

 log.debug('Debug')

 log.info({merging: 'object'}, 'interpolation string %o', [123]);
 log.info({merging: {a: 'object'}}, 'interpolation string %o', [123]);

 log.info('test123, 456, 789')
 log.info('test123 %o %o, 456, 789', 'abc', 'def') //   msg: "test123 'abc' 'def', 456, 789",

 const log2 = newLogger('app2');
 log2.info('app start');
}


/*
export function testPino() {
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

 log.info({merging: 'object'}, 'interpolation string %o', [123]);
 log.info({merging: {a: 'object'}}, 'interpolation string %o', [123]);

 log.info('test123, 456, 789')
 log.info('test123 %o %o, 456, 789', 'abc', 'def') //   msg: "test123 'abc' 'def', 456, 789",

 const log2 = newLogger('app2');
 log2.info('app start');
}

*/

export const Log = newLogger('log');

export default Log;
