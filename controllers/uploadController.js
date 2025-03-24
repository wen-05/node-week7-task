const formidable = require('formidable');
const cloudinary = require('cloudinary').v2;

const logger = require('../utils/logger')('Upload')
const config = require('../config/index')

const { handleSuccess } = require('../utils/sendResponse')

// 配置 Cloudinary
cloudinary.config({
  cloud_name: config.get('secret.cloudinary.cloudName'),
  api_key: config.get('secret.cloudinary.apiKey'),
  api_secret: config.get('secret.cloudinary.apiSecret')
});

// 設定上傳檔案大小和文件類型限制
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_FILE_TYPES = {
  'image/jpeg': true,
  'image/png': true
}

const postUploadImage = async (req, res, next) => {
  const form = formidable.formidable({
    multiple: false,
    maxFileSize: MAX_FILE_SIZE,
    filter: ({ mimetype }) => {
      // if (!ALLOWED_FILE_TYPES[mimetype]) {
      //   const error = new Error('不支援的檔案格式')
      //   error.statusCode = 400
      //   throw error
      // }
      return !!ALLOWED_FILE_TYPES[mimetype]
    }
  })

  // 解析表單並處理檔案
  const [fields, files] = await form.parse(req)
  logger.info('files', files)
  logger.info('fields', fields)
  const filePath = files.file[0].filepath

  // 上傳到 Cloudinary
  const { url } = await cloudinary.uploader.upload(filePath, {
    folder: 'express-images',
    public_id: `${new Date().toISOString()}-${files.file[0].originalFilename}`,
    resource_type: 'image'
  })

  logger.info(url)

  handleSuccess(res, 200, { image_url: url })
}

module.exports = { postUploadImage }