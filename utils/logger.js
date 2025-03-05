const pino = require('pino')   // 結構化的日誌記錄
const pretty = require('pino-pretty')   // 讓日誌更具可讀性

module.exports = function getLogger (prefix, logLevel = 'debug') {
  return pino(pretty({
    level: logLevel,   // 設定日誌的級別 Ex. info, warn, error，預設為 debug
    messageFormat: `[${prefix}]: {msg}`,   // 設定日誌訊息格式
    colorize: true,  // 使不同級別的日誌顯示不同顏色 => 容易識別
    sync: true  // 開啟同步模式，使所有的日誌都會立即輸出
  }))
}
