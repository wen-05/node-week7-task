const express = require('express')
const router = express.Router()

const uploadController = require('../controllers/uploadController')
const handleErrorAsync = require('../utils/handleErrorAsync');

const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('User')
const config = require('../config/index')

const isAuth = require('../middlewares/isAuth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

router.post('/', isAuth, handleErrorAsync(uploadController.postUploadImage))

module.exports = router