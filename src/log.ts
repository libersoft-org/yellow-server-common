import os from 'os';
import fs from 'fs';
import path from 'path';
import util from 'util';

interface LogSettings {
  other?: {
    log_to_file?: boolean;
    log_file?: string;
  };
}

export class Log {
  static settings: LogSettings;
  static appPath: string;

  static debug(...args: any[]): void {
    this.addLog(args, 0);
  }

  static info(...args: any[]): void {
    this.addLog(args, 1);
  }

  static warning(...args: any[]): void {
    this.addLog(args, 2);
  }

  static error(...args: any[]): void {
    this.addLog(args, 3);
  }

  static addLog(obj: any[], type: number = 0): void {
    const d = new Date();
    const date = d.toLocaleString('sv-SE').replace('T', ' ');
    const logTypes = [
      { text: 'DEBUG', color: '\x1b[34m' },
      { text: 'INFO', color: '\x1b[32m' },
      { text: 'WARNING', color: '\x1b[33m' },
      { text: 'ERROR', color: '\x1b[31m' }
    ];

    const inspected = obj.map((o) => (typeof o === 'string' ? o : util.inspect(o, { showHidden: false, depth: null, colors: true })));
    const obj2 = ['\x1b[96m' + date + '\x1b[0m [' + logTypes[type].color + logTypes[type].text + '\x1b[0m] ', ...inspected];
    console.log(...obj2);
    if (type === 3) {
      console.error(...obj);
    }

    const inspected_nocolor = obj.map((o) => (typeof o === 'string' ? o : util.inspect(o, { showHidden: false, depth: null, colors: false })));
    let msg = '';
    for (const v of inspected_nocolor) {
      msg += v + ' ';
    }

    if (this.settings?.other?.log_to_file) {
      let file: string;
      if (this.settings.other.log_file.startsWith('/')) {
        file = this.settings.other.log_file;
      } else {
        file = path.join(this.appPath + this.settings.other.log_file);
      }
      fs.appendFileSync(file, date + ' [' + logTypes[type].text + '] ' + msg + os.EOL);
    }
  }
}

export default Log;
