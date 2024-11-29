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
  //sync: true,
  hideObject: true
 })
}));

let loggers: any = [];



export function reconfigureLogging(app_config) {

 let config = app_config?.log;

 if (!config) {
  console.log('No logging configured.');
  return;
 }

 let streams = [];
 let conf;

 conf = config.stdout;
 if (conf?.enabled) {
  streams.push(pino.transport({
    target: './pino7-pretty',
    options: {
      minimumLevel: conf.level,
      colorize: true
    }
  }))
 }

 conf = config.file;
 if (conf?.enabled) {
  console.log('log.file', conf)
  checkValidLevel(conf.level);
  streams.push({level: conf.level, stream: createSonicBoom(conf.name)});
 }

 conf = config.database;
 if (conf?.enabled)
 {
  console.log('log.database', conf)
  let tr = pino.transport({
    target: './pino7-mysql.js',
    options: conf.database || app_config.database
  })
  streams.push(tr)
 }

 conf = config.elasticsearch;
 if (conf?.enabled) {
  console.log('log.elasticsearch', conf)
  let tr = pino.transport({
   target: 'pino-elasticsearch',
   options: {
    index: 'an-index',
    node: 'http://localhost:9200',
    esVersion: 7,
    flushBytes: 1000
   }
  });
 }

 globalPino = pino({level: config.level || 'debug'}, pino.multistream(streams));

 for (const logger of loggers) {
  logger.reconfigure();
 }
}


 function checkValidLevel(level) {
  if (!validLevel(level))
   throw('Unknown log level: ' + level);
 }

 function validLevel(level) {
  return pino().levels.values?.[level] || Number(level);
 }

export class Logger {

 name: string;
 myPino: any;
 parent: any;
 opts: any;

 constructor(name, parent=null, opts=null) {
  this.name = name;
  loggers.push(this);
  this.parent = parent;
  this.opts = opts;
  this.reconfigure();
 }

 child(opts) {
  //console.log('make child logger', opts);
  return new Logger('-', this, opts);
 }

 reconfigure() {
  if (this.opts)
   this.myPino = this.parent.myPino.child(this.opts);
  else
   this.myPino = globalPino.child({name: this.name});
 }

 trace(...args: any[]): void {
  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
  }
  this.myPino.trace(corr, this.format(args));
 }

 debug(...args: any[]): void {
  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
  }
  this.myPino.debug(corr, this.format(args));
 }

 info(...args: any[]): void {
  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
  }
  this.myPino.info(corr, this.format(args));
 }

 warn(...args: any[]): void {
  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
  }
  this.myPino.warn(corr, this.format(args));
 }

 warning(...args: any[]): void {
  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
  }
  this.myPino.warn(corr, this.format(args));
 }

 error(...args: any[]): void {
  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
  }
  this.myPino.error(corr, this.format(args));
 }

 fatal(...args: any[]): void {
  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
  }
  this.myPino.fatal(corr, this.format(args));
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
