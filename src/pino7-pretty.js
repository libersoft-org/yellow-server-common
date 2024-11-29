module.exports = opts => require('pino-pretty')({
  ...opts,
  messageFormat: (log, messageKey) => `${log[messageKey]}`
})

/*

The options accepted have keys corresponding to the options described in CLI Arguments:

{
  colorize: colorette.isColorSupported, // --colorize
  colorizeObjects: true, //--colorizeObjects
  crlf: false, // --crlf
  errorLikeObjectKeys: ['err', 'error'], // --errorLikeObjectKeys (not required to match custom errorKey with pino >=8.21.0)
  errorProps: '', // --errorProps
  levelFirst: false, // --levelFirst
  messageKey: 'msg', // --messageKey (not required with pino >=8.21.0)
  levelKey: 'level', // --levelKey
  messageFormat: false, // --messageFormat
  timestampKey: 'time', // --timestampKey
  translateTime: false, // --translateTime
  ignore: 'pid,hostname', // --ignore
  include: 'level,time', // --include
  hideObject: false, // --hideObject
  singleLine: false, // --singleLine
  customColors: 'err:red,info:blue', // --customColors
  customLevels: 'err:99,info:1', // --customLevels (not required with pino >=8.21.0)
  levelLabel: 'levelLabel', // --levelLabel
  minimumLevel: 'info', // --minimumLevel
  useOnlyCustomProps: true, // --useOnlyCustomProps
  // The file or file descriptor (1 is stdout) to write to
  destination: 1,

  // Alternatively, pass a `sonic-boom` instance (allowing more flexibility):
  // destination: new SonicBoom({ dest: 'a/file', mkdir: true })

  // You can also configure some SonicBoom options directly
  sync: false, // by default we write asynchronously
  append: true, // the file is opened with the 'a' flag
  mkdir: true, // create the target destination


  customPrettifiers: {}
}
 */
