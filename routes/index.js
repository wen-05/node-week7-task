const express = require('express')
const router = express.Router()

const creditPackageRouter = require('./creditPackage')
const skillRouter = require('./skill')
const coachRouter = require('./coach')
const userRouter = require('./users')
const adminRouter = require('./admin')
const coursesRouter = require('./courses')

router.use('/credit-package', creditPackageRouter)
router.use('/coaches/skill', skillRouter)
router.use('/coaches', coachRouter)
router.use('/users', userRouter)
router.use('/admin/coaches', adminRouter)
router.use('/courses', coursesRouter)

module.exports = router