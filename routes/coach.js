const express = require('express')
const router = express.Router()

const coachController = require('../controllers/coachController')
const handleErrorAsync = require('../utils/handleErrorAsync');

router.get('/', handleErrorAsync(coachController.getList))
router.get('/:coachId', handleErrorAsync(coachController.getDetail))

module.exports = router