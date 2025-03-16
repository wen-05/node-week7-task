const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Admin')
const { isUndefined, isNotValidString, isNotValidInteger, isNotValidUUID } = require('../utils/valid')
const { handleSuccess } = require('../utils/sendResponse')
const appError = require('../utils/appError')
const { IsNull, In, Between } = require('typeorm')

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)
const monthMap = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
}

const getCourse = async (req, res, next) => {
  const { id } = req.user

  const courseRepo = dataSource.getRepository('Course')
  const courses = await courseRepo.find({
    select: [
      'id',
      'name',
      'start_at',
      'end_at',
      'max_participants'
    ],
    where: { user_id: id }
  })

  const now = new Date()

  const courseBookingRepo = dataSource.getRepository('CourseBooking')

  const courseList = await Promise.all(courses.map(async item => {
    const startAt = new Date(item.start_at)
    const endAt = new Date(item.end_at)

    let courseStatus = '尚未開始'
    if (startAt <= now && endAt >= now) {
      courseStatus = '報名中'
    } else if (endAt < now) {
      courseStatus = '已結束'
    }

    const participants = await courseBookingRepo.count({ course_id: item.id, cancelledAt: IsNull() })

    return {
      id: item.id,
      status: courseStatus,
      name: item.name,
      start_at: item.start_at,
      end_at: item.end_at,
      max_participants: item.max_participants,
      participants
    }
  }))

  handleSuccess(res, 200, courseList)
}

const getDetailCourse = async (req, res, next) => {
  const { courseId } = req.params

  if (isNotValidString(courseId) || !isNotValidUUID(courseId)) {
    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const courseRepo = dataSource.getRepository('Course')
  const course = await courseRepo.findOne({
    select: [
      'id',
      'skill_id',
      'name',
      'description',
      'start_at',
      'end_at',
      'max_participants'
    ],
    where: { id: courseId }
  })

  const startAt = new Date(course.start_at)
  const endAt = new Date(course.end_at)

  const skillData = await dataSource.getRepository('Skill').findOneBy({ id: course.skill_id })

  const courseDetail = {
    id: course.id,
    skill_name: skillData.name,
    name: course.name,
    start_at: startAt,
    end_at: endAt,
    max_participants: course.max_participants,
  }

  handleSuccess(res, 200, courseDetail)
}

const getCoachInformation = async (req, res, next) => {
  const { id } = req.user

  const coachRepo = dataSource.getRepository('Coach')

  const findCoach = await coachRepo.findOne({
    select: ["id"],
    where: { user_id: id },
  })

  const coach = await coachRepo.findOne({
    select: [
      'id',
      'experience_years',
      'description',
      'profile_image_url'
    ],
    where: { id: findCoach.id },
    relations: ['CoachLinkSkill']
  })

  logger.info(`result: ${JSON.stringify(coach, null, 1)}`)

  handleSuccess(res, 200, {
    id: coach.id,
    experience_years: coach.experience_years,
    description: coach.description,
    profile_image_url: coach.profile_image_url,
    skill_ids: coach.CoachLinkSkill.map(item => item.skill_id)
  })
}

const getCoachMonthlyIncome = async (req, res, next) => {
  const { id } = req.user
  const { month } = req.query

  if (isUndefined(month) || !Object.prototype.hasOwnProperty.call(monthMap, month)) {
    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const courseRepo = dataSource.getRepository('Course')
  const courses = await courseRepo.find({
    select: ['id'],
    where: { user_id: id }
  })

  const courseIds = courses.map(course => course.id)
  if (courseIds.length === 0) {
    handleSuccess(res, 200, {
      total: {
        revenue: 0,
        participants: 0,
        course_count: 0
      }
    })
    return
  }

  const courseBookingRepo = dataSource.getRepository('CourseBooking')

  const year = new Date().getFullYear()
  const calculateStartAt = dayjs(`${year}-${month}-01`).startOf('month').toISOString()
  const calculateEndAt = dayjs(`${year}-${month}-01`).endOf('month').toISOString()

  // 授課堂數
  const courseCount = await courseBookingRepo.createQueryBuilder('course_booking')
    .select('COUNT(*)', 'count')
    .where('course_id IN (:...ids)', { ids: courseIds })
    .andWhere('cancelled_at IS NULL')
    .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
    .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
    .getRawOne()

  // 授課人數
  const participants = await courseBookingRepo.createQueryBuilder('course_booking')
    .select('COUNT(DISTINCT(user_id))', 'count')
    .where('course_id IN (:...ids)', { ids: courseIds })
    .andWhere('cancelled_at IS NULL')
    .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
    .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
    .getRawOne()

  const totalCreditPackage = await dataSource.getRepository('CreditPackage').createQueryBuilder('credit_package')
    .select('SUM(credit_amount)', 'total_credit_amount')
    .addSelect('SUM(price)', 'total_price')
    .getRawOne()

  const perCreditPrice = totalCreditPackage.total_price / totalCreditPackage.total_credit_amount
  const totalRevenue = courseCount.count * perCreditPrice

  handleSuccess(res, 200, {
    total: {
      revenue: Math.floor(totalRevenue),
      participants: parseInt(participants.count, 10),
      course_count: parseInt(courseCount.count, 10)
    }
  })
}

const createCourse = async (req, res, next) => {
  const {
    user_id: userId,
    skill_id: skillId,
    name,
    description,
    start_at: startAt,
    end_at: endAt,
    max_participants: maxParticipants,
    meeting_url: meetingUrl
  } = req.body

  if (isUndefined(userId) || isNotValidString(userId) || !isNotValidUUID(userId) ||
    isUndefined(skillId) || isNotValidString(skillId) || !isNotValidUUID(skillId) ||
    isUndefined(name) || isNotValidString(name) ||
    isUndefined(description) || isNotValidString(description) ||
    isUndefined(startAt) || isNotValidString(startAt) ||
    isUndefined(endAt) || isNotValidString(endAt) ||
    isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) ||
    isUndefined(meetingUrl) || isNotValidString(meetingUrl) || !meetingUrl.startsWith('https')) {

    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const userRepository = dataSource.getRepository('User')
  const existingUser = await userRepository.findOne({
    select: ['id', 'name', 'role'],
    where: { id: userId }
  })

  if (!existingUser) {
    logger.warn('使用者不存在')
    next(appError(400, '使用者不存在'))
    return
  } else if (existingUser.role !== 'COACH') {
    logger.warn('使用者尚未成為教練')
    next(appError(400, '使用者尚未成為教練'))
    return
  }

  const courseRepo = dataSource.getRepository('Course')
  const newCourse = courseRepo.create({
    user_id: userId,
    skill_id: skillId,
    name,
    description,
    start_at: startAt,
    end_at: endAt,
    max_participants: maxParticipants,
    meeting_url: meetingUrl
  })

  const savedCourse = await courseRepo.save(newCourse)
  const course = await courseRepo.findOneBy({ id: savedCourse.id })

  handleSuccess(res, 201, { course })
}

const editCourse = async (req, res, next) => {
  const { courseId } = req.params
  const {
    skill_id: skillId,
    name,
    description,
    start_at: startAt,
    end_at: endAt,
    max_participants: maxParticipants,
    meeting_url: meetingUrl
  } = req.body

  if (isNotValidString(courseId) || !isNotValidUUID(courseId) ||
    isUndefined(skillId) || isNotValidString(skillId) || !isNotValidUUID(skillId) ||
    isUndefined(name) || isNotValidString(name) ||
    isUndefined(description) || isNotValidString(description) ||
    isUndefined(startAt) || isNotValidString(startAt) ||
    isUndefined(endAt) || isNotValidString(endAt) ||
    isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) ||
    isUndefined(meetingUrl) || isNotValidString(meetingUrl) || !meetingUrl.startsWith('https')) {

    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const courseRepo = dataSource.getRepository('Course')
  const existingCourse = await courseRepo.findOneBy({ id: courseId })

  if (!existingCourse) {
    logger.warn('課程不存在')
    next(appError(400, '課程不存在'))
    return
  }

  const updateCourse = await courseRepo.update({
    id: courseId
  }, {
    skill_id: skillId,
    name,
    description,
    start_at: startAt,
    end_at: endAt,
    max_participants: maxParticipants,
    meeting_url: meetingUrl
  })

  if (updateCourse.affected === 0) {
    logger.warn('更新課程失敗')
    next(appError(400, '更新課程失敗'))
    return
  }

  const savedCourse = await courseRepo.findOneBy({ id: courseId })

  handleSuccess(res, 200, { course: savedCourse })
}

const editRole = async (req, res, next) => {
  const { userId } = req.params
  const {
    experience_years: experienceYears,
    description,
    profile_image_url: profileImageUrl = null
  } = req.body

  if (!isNotValidUUID(userId) || isUndefined(experienceYears) || isNotValidInteger(experienceYears) || isUndefined(description) || isNotValidString(description)) {

    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  if (profileImageUrl && !isNotValidString(profileImageUrl) && !profileImageUrl.startsWith('https')) {

    logger.warn('大頭貼網址錯誤')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const userRepository = dataSource.getRepository('User')
  const existingUser = await userRepository.findOne({
    select: ['id', 'name', 'role'],
    where: { id: userId }
  })

  if (!existingUser) {
    logger.warn('使用者不存在')
    next(appError(400, '使用者不存在'))
    return
  } else if (existingUser.role === 'COACH') {
    logger.warn('使用者已經是教練')
    next(appError(409, '使用者已經是教練'))
    return
  }

  const coachRepo = dataSource.getRepository('Coach')
  const newCoach = coachRepo.create({
    user_id: userId,
    experience_years: experienceYears,
    description,
    profile_image_url: profileImageUrl
  })

  const updatedUser = await userRepository.update({ id: userId }, { role: 'COACH' })

  if (updatedUser.affected === 0) {
    logger.warn('更新使用者失敗')
    next(appError(400, '更新使用者失敗'))
    return
  }

  const savedCoach = await coachRepo.save(newCoach)
  const savedUser = await userRepository.findOne({
    select: ['name', 'role'],
    where: { id: userId }
  })

  handleSuccess(res, 201, { user: savedUser, coach: savedCoach })
}

const editCoachInformation = async (req, res, next) => {
  const { id } = req.user
  const {
    experience_years,
    description,
    profile_image_url,
    skill_ids
  } = req.body

  if (isUndefined(experience_years) || isNotValidInteger(experience_years) ||
    isUndefined(description) || isNotValidString(description) ||
    isUndefined(profile_image_url) || isNotValidString(profile_image_url) || !profile_image_url.startsWith("https") ||
    isUndefined(skill_ids) || !Array.isArray(skill_ids)) {

    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  if (skill_ids.length === 0 || skill_ids.every(skill_id => isUndefined(skill_id) || isNotValidString(skill_id))) {
    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const coachRepo = dataSource.getRepository('Coach')

  const findCoach = await coachRepo.findOne({
    select: ["id"],
    where: { user_id: id },
  })

  await coachRepo.update({ id: findCoach.id }, {
    experience_years,
    description,
    profile_image_url
  })

  // skill_ids
  const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill')

  const newCoachLinkSkill = skill_ids.map(skill => ({
    coach_id: findCoach.id,
    skill_id: skill
  }))

  await coachLinkSkillRepo.delete({ coach_id: findCoach.id })
  const insert = await coachLinkSkillRepo.insert(newCoachLinkSkill)

  logger.info(`newCoachLinkSkill: ${JSON.stringify(newCoachLinkSkill, null, 1)}`)
  logger.info(`insert: ${JSON.stringify(insert, null, 1)}`)

  const result = await dataSource.getRepository('Coach').findOne({
    select: ['experience_years', 'description', 'profile_image_url'],
    where: { id: findCoach.id },
    relations: ['CoachLinkSkill']
  })

  logger.info(`result: ${JSON.stringify(result, null, 1)}`)

  const data = {
    experience_years: result.experience_years,
    description: result.description,
    profile_image_url: result.profile_image_url,
    skill_ids: result.CoachLinkSkill.map(item => item.skill_id)
  }

  handleSuccess(res, 200, data)
}

module.exports = { createCourse, editCourse, editRole, getCourse, getDetailCourse, editCoachInformation, getCoachInformation, getCoachMonthlyIncome }