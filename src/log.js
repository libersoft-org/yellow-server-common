import os from 'os';
import fs from 'fs';
import path from 'path';
import util from 'util';


export class Log {
 static settings;
 static appPath;

 static debug(...args) {
  this.addLog(args, 0)
 }

 static info(...args) {
  this.addLog(args, 1)
 }

 static warning(...args) {
  this.addLog(args, 2)
 }

 static error(...args) {
  this.addLog(args, 3)
 }

 static safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, function(key, value) {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return; // Ignore circular reference
            }
            seen.add(value);
        }
        return value;
    }, 2);
}


 static addLog(obj, type = 0) {
//console.log(obj);
  let message = '';
  for (const v of obj) {
   if (message !== '') message += ', ';
   if (typeof v === 'object') {
    message += this.safeStringify(v);
   }
   else
    message += v;
  }

  const d = new Date();
  const date = d.toLocaleString('sv-SE').replace('T', ' ');
  const logTypes = [
   {text: 'DEBUG', color: '\x1b[34m'},
   {text: 'INFO', color: '\x1b[32m'},
   {text: 'WARNING', color: '\x1b[33m'},
   {text: 'ERROR', color: '\x1b[31m'}
  ];
  const msg = message ?? '';

  const inspected = obj.map((o) => {if (typeof o === 'string') return o; else return util.inspect(o, {showHidden: false, depth: null, colors: true})});
  const obj2 = ['\x1b[96m' + date + '\x1b[0m [' + logTypes[type].color + logTypes[type].text + '\x1b[0m] ', ...inspected];
  console.log(...obj2);


  //console.log(obj);
  if (this.settings?.other?.log_to_file) {
   let file;
   if (this.settings.other.log_file.startsWith('/')) {
    file = this.settings.other.log_file;
   } else {
    file = path.join(this.appPath + this.settings.other.log_file)
   }
   fs.appendFileSync(file, date + ' [' + logTypes[type].text + '] ' + msg + os.EOL);
  }
 }
}

export default Log;

