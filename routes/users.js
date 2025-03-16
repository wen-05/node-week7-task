const express = require('express')
const router = express.Router()

const userController = require('../controllers/userController')
const handleErrorAsync = require('../utils/handleErrorAsync');

const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('User')
const config = require('../config/index')

const isAuth = require('../middlewares/isAuth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

router.post('/signup', handleErrorAsync(userController.signup, '建立使用者錯誤'))
router.post('/login', handleErrorAsync(userController.login, '登入錯誤:'))
router.put('/password', isAuth, handleErrorAsync(userController.forgetPassword))

router.get('/profile', isAuth, handleErrorAsync(userController.getProfile, '取得使用者資料錯誤:'))
router.put('/profile', isAuth, handleErrorAsync(userController.editProfile, '更新使用者資料錯誤:'))

router.get('/credit-package', isAuth, handleErrorAsync(userController.getPurchaseCreditPackage))

router.get('/courses', isAuth, handleErrorAsync(userController.getEnrollCourse))

module.exports = router