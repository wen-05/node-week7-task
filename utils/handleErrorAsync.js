// 記錄來自 handleErrorAsync 的錯誤
const logger = require('../utils/logger')('handleErrorAsync');

// 參數 func 傳入 async 函式
const handleErrorAsync = (fn, loggerErrorMessage = null) => {
  // 回傳 middleware 格式的新函式 
  return (req, res, next) => {
    // 執行傳入的 async 函式，使用 catch 統一捕捉
    fn(req, res, next).catch((error) => {
      logger.error(loggerErrorMessage || error)
      next(error)
    });
  };
};

module.exports = handleErrorAsync;