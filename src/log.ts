const util = require('util')
const pino = require('pino')
const pretty = require('pino-pretty')
const fs = require('fs')
const path = require('path')
const os = require('os')
var mysql = require('mysql');

const ecsFormat = require('@elastic/ecs-pino-format')({'level': 'trace'})
const pinoElastic = require('pino-elasticsearch')
const { HTTPConnection } = require('@elastic/elasticsearch')


const createSonicBoom = (dest) =>
 pino.destination({dest: dest, append: true, sync: true})



let globalPino = pino({name: 'log', level: 'trace'}, pino.multistream(
 /*{
 stream: pretty({
  colorize: true,
  //sync: true,
  hideObject: true
 }*/
[]
));


let con;


let loggers: any = []; // todo: weakref
let config = {};
let _appPath;


export function reconfigureLogging(app_config) {

 _appPath = app_config.appPath;
 console.log('reconfigureLogging _appPath:', _appPath);

 config = app_config?.log || {};

 if (!config) {
  console.log('No logging configured.');
  return;
 }

 let streams = [];
 let conf;



 conf = config.node_child_process_elasticsearch;
 if (conf?.enabled)
 {
  let tr = pino.transport({
   target: './pino7-node-elasticsearch.js',
   options: {level: 'trace'}
  });

  tr.on(
   'error',
   (error) => {
    console.log(error);
   });

  streams.push(tr)
 }


 conf = config.pino_stdout;
 if (conf?.enabled) {
  streams.push(pino.transport({
    target: './pino7-pretty',
    options: {
      minimumLevel: conf.level === undefined ? 'info' : conf.level,
      colorize: true
    }
  }))
 }

 conf = config.json;
 if (conf?.enabled) {
  console.log('log.json', conf)
  checkValidLevel(conf.level);
  streams.push({level: conf.level, stream: createSonicBoom(conf.name)});
 }

 conf = config.database;
 if (conf?.enabled)
 {
  //console.log('log.pino_database', conf)
  let tr = pino.transport({
    target: './pino7-mysql.js',
    options: conf.database || app_config.database
  });

  tr.on(
   'error',
   (error) => {
    console.log(error);
   });

  streams.push(tr)
 }

 /*conf = config.database;
 if (conf?.enabled)
 {
  let opts = conf.database || app_config.database;
  con = mysql.createConnection({...opts, database: opts.name});
  con.connect(function(err) {
    if (err) console.log(err);
    else console.log("Connected!");
  });
 }*/

 conf = config.elasticsearch;
 if (conf?.enabled) {
  //console.log('log.elasticsearch', conf)
  const streamToElastic = pinoElastic({
   Connection: HTTPConnection,
   opType: 'create',
   index: 'logs-pino-yellow',
   node: 'http://127.0.0.1:9200',
   auth: {username: 'elastic', password: 'changeme'},
   //rejectUnauthorized: false,
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
    console.log(error.message);
   });

  streams.push({level: 0, stream: streamToElastic});
 }

 conf = config.opentelemetry;
 if (conf?.enabled) {
  const otl = pino.transport({target: 'pino-opentelemetry-transport', options: {level: 'debug'}});
  streams.push(otl);

  //streams.push(pino.transport({target: 'pino-gelf-transport', options: {level: 'debug', host: 'localhost', port: 12201}}));

 }

 globalPino = pino({level: config.level || 'trace', ...ecsFormat}, pino.multistream(streams));

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
   this.myPino = this.parent.myPino.child({name: this.name, ...this.opts}, {level: 'trace'});
  else
   this.myPino = globalPino.child({name: this.name}, {level: 'trace'});
 }


 trace  (...args: any[]) {this.log(globalPino.levels.values.trace, args);}
 debug  (...args: any[]) {this.log(globalPino.levels.values.debug, args);}
 info   (...args: any[]) {this.log(globalPino.levels.values.info, args);}
 warn   (...args: any[]) {this.log(globalPino.levels.values.warn, args);}
 warning(...args: any[]) {this.log(globalPino.levels.values.warning, args);}
 error  (...args: any[]) {this.log(globalPino.levels.values.error, args);}
 fatal  (...args: any[]) {this.log(globalPino.levels.values.fatal, args);}

 /**
  * Immutable function to truncate all strings in an object to a maximum length.
  * todo: move to utils
  *
  * @param obj
  * @param maxLength
  */
 truncateStrings(obj: any, maxLength = 255) {
   if (typeof obj === 'string') {
     const loggerInfo = `... [truncated string from ${obj.length} length to ${maxLength} by logger]`
     return obj.length > maxLength ? obj.slice(0, maxLength) + loggerInfo : obj;
   } else if (Array.isArray(obj)) {
     return obj.map(item => this.truncateStrings(item, maxLength));
   } else if (typeof obj === 'object' && obj !== null) {
     return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, this.truncateStrings(value, maxLength)]));
   }
   return obj;
 }

 log(level: Number, _args: any[]): void {
  const maxCharsPerString = 255; // todo add to settings
  const args = _args.map(arg => this.truncateStrings(arg, maxCharsPerString));

  let corr = {};
  if (typeof args[0] !== 'string') {
   corr = args.shift();
   if (corr === undefined) {
    corr = {};
   }
  }
  //corr = {...corr/*, arguments: args*/};


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
   if (this.filter(level, conf)) {
    const msgWithColor = this.formatWithColor(args, levelColorText, date);
    console.log(...msgWithColor);
   }
  }



  let file_conf = config.file

  const msgNocolor = this.formatNoColor(args);

  if (level > 40 || file_conf?.enabled) {
   //const msgNocolor = this.formatNoColor(args);

   if (level > 40) {
    console.error(msgNocolor);
   }
   if (file_conf?.enabled) {
    this.logToFile(file_conf, date, msgNocolor, levelText);
   }
  }



  //console.log('level', level);
  if (level <= 10) {
   //console.log('TRACE');
   this.myPino.trace(corr, msgNocolor);
  }
  else if (level <= 20)
   this.myPino.debug(corr, msgNocolor);
  else if (level <= 30)
   this.myPino.info(corr, msgNocolor);
  else if (level <= 40)
   this.myPino.warn(corr, msgNocolor);
  else if (level <= 50)
   this.myPino.error(corr, msgNocolor);
  else
   this.myPino.fatal(corr, msgNocolor);

 }


 filter(level, conf) {
  if (!conf?.enabled)
   return false;
  if ((conf.level !== undefined) && level < conf.level)
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
   file = path.join(_appPath, conf.name);
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
