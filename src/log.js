import os from 'os';
import fs from 'fs';
import path from 'path';

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

 static addLog(message, type = 0) {

  if (typeof message === 'array') {
   let msg = '';
   for (const v of message) {
    if (msg !== '') msg += ', ';
    msg += JSON.stringify(v);
   }
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
  console.log('\x1b[96m' + date + '\x1b[0m [' + logTypes[type].color + logTypes[type].text + '\x1b[0m] ' + msg);
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

