const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Skill')
const { isUndefined, isNotValidString } = require('../utils/valid')
const { handleSuccess } = require('../utils/sendResponse')
const appError = require('../utils/appError')

const getSkill = async (req, res, next) => {
  const skill = await dataSource.getRepository('Skill').find({
    select: ['id', 'name']
  })

  handleSuccess(res, 200, skill)
}

const createSkill = async (req, res, next) => {
  const { name } = req.body
  if (isUndefined(name) || isNotValidString(name)) {
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const skillRepo = dataSource.getRepository('Skill')
  const existSkill = await skillRepo.findBy({ name })

  if (existSkill.length > 0) {
    next(appError(409, '資料重複'))
    return
  }

  const newSkill = skillRepo.create({
    name
  })

  const result = await skillRepo.save(newSkill)
  handleSuccess(res, 200, result)
}

const deleteSkill = async (req, res, next) => {
  const skillId = req.url.split('/').pop()

  if (isUndefined(skillId) || isNotValidString(skillId)) {
    next(appError(400, 'ID錯誤'))
    return
  }

  const result = await dataSource.getRepository('Skill').delete(skillId)
  if (result.affected === 0) {
    next(appError(400, 'ID錯誤'))
    return
  }

  handleSuccess(res, 200, result)
}

module.exports = { getSkill, createSkill, deleteSkill }