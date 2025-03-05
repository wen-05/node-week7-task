const express = require('express')
const router = express.Router()

const coursesController = require('../controllers/coursesController')
const handleErrorAsync = require('../utils/handleErrorAsync');

const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Course')
const config = require('../config/index')

const isAuth = require('../middlewares/isAuth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

router.get('/', handleErrorAsync(coursesController.getCourses))
router.post('/:courseId', isAuth, handleErrorAsync(coursesController.enrollCourse))
router.delete('/:courseId', isAuth, handleErrorAsync(coursesController.cancelCourse))

module.exports = router