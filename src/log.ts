const util = require('util')
const pino = require('pino')
const pretty = require('pino-pretty')
const fs = require('fs')
const path = require('path')
const os = require('os')

    const ecsFormat = require('@elastic/ecs-pino-format')()
const pinoElastic = require('pino-elasticsearch')
//const logdir = process.env.LOGDIR || '/tmp/'


const createSonicBoom = (dest) =>
 pino.destination({dest: dest, append: true, sync: true})



let globalPino = pino({name: 'log', level: 'debug'}, pino.multistream(
 /*{
 stream: pretty({
  colorize: true,
  //sync: true,
  hideObject: true
 }*/
[]
));




let loggers: any = []; // todo: weakref
let config = {};



export function reconfigureLogging(app_config) {

 config = app_config?.log;

 if (!config) {
  console.log('No logging configured.');
  return;
 }

 let streams = [];
 let conf;


 /*conf = config.stdout;
 if (conf?.enabled) {
  streams.push(pino.transport({
    target: './pino7-pretty',
    options: {
      minimumLevel: conf.level,
      colorize: true
    }
  }))
 }*/


 conf = config.json;
 if (conf?.enabled) {
  console.log('log.json', conf)
  checkValidLevel(conf.level);
  streams.push({level: conf.level, stream: createSonicBoom(conf.name)});
 }


 conf = config.database;
 if (conf?.enabled)
 {
  //console.log('log.database', conf)
  let tr = pino.transport({
    target: './pino7-mysql.js',
    options: conf.database || app_config.database
  })
  streams.push(tr)
 }

/* conf = config.elasticsearch;
 if (conf?.enabled) {
  //console.log('log.elasticsearch', conf)
  const streamToElastic = pinoElastic({
    index: 'logs-pino-yellow-server',
    node: 'https://localhost:9200',
    auth: {username: 'elastic', password: 'changeme'},
    rejectUnauthorized: false,
    flushInterval: 500,
    flushBytes: 100
  });
  streamToElastic.on(
  'insertError',
   (error) => {
     const documentThatFailed = error.document;
     console.log(`An error occurred insert document:`, documentThatFailed);
   }
  );
  streamToElastic.on(
   'error',
   (error) => {
    console.log(error);
   });

  streams.push({level: 0, stream: streamToElastic});
  /!*
  let tr = pino.transport({
   target: 'pino-elasticsearch',
   options: {
    index: 'an-index',
    node: 'http://localhost:9200',
    esVersion: 7,
    flushBytes: 100
   }
  });
  *!/
 }*/

 globalPino = pino({level: config.level || 'debug', ...ecsFormat}, pino.multistream(streams));

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

 constructor(name, parent = null, opts = null) {
  this.name = name;
  loggers.push(this);
  this.parent = parent;
  this.opts = opts;
  this.reconfigure();
 }

 child(name, opts = {}) {
  //console.log('make child logger', opts);
  return new Logger(this.name + ':' + name, this, opts);
 }

 reconfigure() {
  if (this.opts)
   this.myPino = this.parent.myPino.child({name: this.name, ...this.opts});
  else
   this.myPino = globalPino.child({name: this.name});
 }


 trace  (...args: any[]) {this.log(globalPino.levels.values.trace, args);}
 debug  (...args: any[]) {this.log(globalPino.levels.values.debug, args);}
 info   (...args: any[]) {this.log(globalPino.levels.values.info, args);}
 warn   (...args: any[]) {this.log(globalPino.levels.values.warn, args);}
 warning(...args: any[]) {this.log(globalPino.levels.values.warning, args);}
 error  (...args: any[]) {this.log(globalPino.levels.values.error, args);}
 fatal  (...args: any[]) {this.log(globalPino.levels.values.fatal, args);}


 log(level: Number, args: any[]): void {

  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
  }
  corr = {...corr/*, arguments: args*/};


  const d = new Date();
  const date = d.toLocaleString('sv-SE').replace('T', ' ');
  const levels = {
   10: {text: 'TRACE', color: '\x1b[34m'},
   20: {text: 'DEBUG', color: '\x1b[34m'},
   30: {text: 'INFO', color: '\x1b[32m'},
   40: {text: 'WARNING', color: '\x1b[33m'},
   50: {text: 'ERROR', color: '\x1b[31m'},
   60: {text: 'FATAL', color: '\x1b[31m'}
  };

  let levelText = '???';
  let levelColorText = '????'
  if (levels[level]) {
   levelText = levels[level].text;
   levelColorText = this.name + '[' + levels[level].color + levelText + '\x1b[0m' + ']';
  }

  let conf = config.stdout
  if (!conf) {
   const msgWithColor = this.formatWithColor(args, levelColorText, date);
   console.log(...msgWithColor);
  }
  else if (conf?.enabled) {
   const msgWithColor = this.formatWithColor(args, levelColorText, date);
   if (this.filter(level, conf))
    console.log(...msgWithColor);
  }


  const msgNocolor = this.formatNoColor(args);
  if (level > 40) {
   console.error(msgNocolor);
  }


  conf = config.file
  if (conf?.enabled) {
   this.logToFile(conf, date, msgNocolor, levelText);
  }


  if (level <= 10)
   this.myPino.trace(corr, ...args);
  else if (level <= 20)
   this.myPino.trace(corr, ...args);
  else if (level <= 30)
   this.myPino.info(corr, ...args);
  else if (level <= 40)
   this.myPino.warn(corr, ...args);
  else if (level <= 50)
   this.myPino.error(corr, ...args);
  else
   this.myPino.fatal(corr, ...args);

 }


 filter(level, conf) {
  if (!conf?.enabled)
   return false;
  if (conf.level && level < conf.level)
   return false;
  const matchers = conf.levels || []
  //console.log('filter');
  for (let matcher of matchers) {
   //console.log('matcher', matcher);
   const key = Object.keys(matcher)[0];
   const val = matcher[key]
   if (this.match(key, this.name)) {
    const keep = globalPino.levels.values[val] <= level;
    //console.log('matcher', key, val, level, this.name, keep);
    return keep
   }
  }
  //console.log('no match', matchers, this.name);
  return true;
 }

 match(key, name) {
  //console.log('match', key, name);
  if (key === name)
   return true;
  if (key === '*')
   return true;
 }


 logToFile(conf, date, msg, levelText)
 {
  let file: string;
  if (conf.name.startsWith('/')) {
   file = conf.name;
  } else {
   file = path.join(this.appPath + conf.name);
  }
  fs.appendFileSync(file, date + ' [' + levelText + '] ' + msg + os.EOL);
 }


 formatWithColor(args: any[], levelColorText, date)
 {
  const inspected = args.map((o) => (typeof o === 'string' ? o : util.inspect(o, {
   showHidden: false,
   depth: null,
   colors: true
  })));

  return ['\x1b[96m' + date + '\x1b[0m ' + levelColorText + ' ', ...inspected];
 }


 formatNoColor(args: any[]): string {
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
