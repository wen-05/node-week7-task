const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Coach')
const { isUndefined, isNotValidString, isNotValidInteger, isNotValidUUID } = require('../utils/valid')
const { handleSuccess } = require('../utils/sendResponse')
const appError = require('../utils/appError')

const getList = async (req, res, next) => {
  let { per, page } = req.query
  per = parseInt(per)    // 每頁筆數
  page = parseInt(page)  // 目前分頁

  if (isUndefined(per) || isNotValidInteger(per) ||
    isUndefined(page) || isNotValidInteger(page)) {

    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const skip = (page - 1) * per

  const coaches = await dataSource.getRepository('Coach').find({
    select: ['id', 'created_at'],
    take: per,
    skip,
    relations: ['User'],
    order: { created_at: 'DESC' }
  })

  const result = coaches.map(coach => ({
    id: coach.id,
    name: coach.User.name
  }))

  handleSuccess(res, 200, result)
}

const getDetail = async (req, res, next) => {
  const { coachId } = req.params

  if (isUndefined(coachId) || isNotValidString(coachId) || !isNotValidUUID(coachId)) {

    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const coachDetail = await dataSource.getRepository('Coach').findOne({
    where: { id: coachId },
    relations: ['User'],
  })

  if (!coachDetail) {
    logger.warn('找不到該教練')
    next(appError(400, '找不到該教練'))
    return
  }

  const result = {
    user: {
      name: coachDetail.User.name,
      role: coachDetail.User.role
    },
    coach: {
      id: coachDetail.id,
      user_id: coachDetail.user_id,
      experience_years: coachDetail.experience_years,
      description: coachDetail.description,
      profile_image_url: coachDetail.profile_image_url,
      created_at: coachDetail.created_at,
      updated_at: coachDetail.updated_at,
    }
  }

  handleSuccess(res, 200, result)
}

const getCourses = async (req, res, next) => {
  const { coachId } = req.params

  if (isUndefined(coachId) || isNotValidString(coachId) || !isNotValidUUID(coachId)) {

    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const existCoach = await dataSource.getRepository('Coach').findOne({
    where: { id: coachId },
    relations: ['User']
  })

  if (!existCoach) {
    logger.warn('找不到該教練')
    next(appError(400, '找不到該教練'))
    return
  }

  const courses = await dataSource.getRepository('Course').find({
    select: ['id', 'skill_id', 'name', 'description', 'start_at', 'end_at', 'max_participants'],
    where: { user_id: existCoach.user_id }
  })

  const courseList = await Promise.all(courses.map(async item => {
    const startAt = new Date(item.start_at)
    const endAt = new Date(item.end_at)

    const getSkillName = await dataSource.getRepository('Skill').findOne({
      select: ['name'],
      where: { id: item.skill_id }
    })

    return {
      id: item.id,
      coach_name: existCoach.User.name,
      skill_name: getSkillName.name,
      name: item.name,
      description: item.description,
      start_at: startAt,
      end_at: endAt,
      max_participants: item.max_participants
    }
  }))

  handleSuccess(res, 200, courseList)

}

module.exports = { getList, getDetail, getCourses }