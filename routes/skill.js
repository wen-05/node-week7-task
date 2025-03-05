const express = require('express')
const router = express.Router()

const skillController = require('../controllers/skillController')
const handleErrorAsync = require('../utils/handleErrorAsync');

router.get('/', handleErrorAsync(skillController.getSkill))
router.post('/', handleErrorAsync(skillController.createSkill))
router.delete('/:creditPackageId', handleErrorAsync(skillController.deleteSkill))

module.exports = router