const express = require('express')
const router = express.Router()

const creditPackageController = require('../controllers/creditPackageController')
const handleErrorAsync = require('../utils/handleErrorAsync');

const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackage')
const config = require('../config/index')

const isAuth = require('../middlewares/isAuth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

router.get('/', handleErrorAsync(creditPackageController.getCreditPackage))
router.post('/', handleErrorAsync(creditPackageController.createCreditPackage))
router.post('/:creditPackageId', isAuth, handleErrorAsync(creditPackageController.purchaseCreditPackage))
router.delete('/:creditPackageId', handleErrorAsync(creditPackageController.deleteCreditPackage))

module.exports = router