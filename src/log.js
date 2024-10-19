export class Log {
 static addLog(message, type = 0) {
     const d = new Date();
     const date = d.toLocaleString('sv-SE').replace('T', ' ');
     const logTypes = [
         { text: 'INFO', color: '\x1b[32m' },
         { text: 'WARNING', color: '\x1b[33m' },
         { text: 'ERROR', color: '\x1b[31m' }
     ];
     const msg = message ?? '';
     console.log('\x1b[96m' + date + '\x1b[0m [' + logTypes[type].color + logTypes[type].text + '\x1b[0m] ' + msg);
     if (this.settings?.other?.log_to_file) fs.appendFileSync(this.settings.other.log_file.startsWith('/') ? this.settings.other.log_file : path.join(this.appPath + this.settings.other.log_file), date + ' [' + logTypes[type].text + '] ' + msg + os.EOL);
 }
}

export default Log;

