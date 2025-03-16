const bcrypt = require('bcrypt')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('User')
const { isUndefined, isNotValidString, isValidPassword } = require('../utils/valid')
const { handleSuccess } = require('../utils/sendResponse')
const appError = require('../utils/appError')

const config = require('../config/index')
const generateJWT = require('../utils/generateJWT')
const { IsNull } = require('typeorm')

const saltRounds = 10

const signup = async (req, res, next) => {
  const { name, email, password } = req.body

  if (isUndefined(name) || isNotValidString(name) || isUndefined(email) || isNotValidString(email) || isUndefined(password) || isNotValidString(password)) {

    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  if (!isValidPassword(password)) {
    logger.warn('建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
    next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'))
    return
  }

  const userRepository = dataSource.getRepository('User')

  // 檢查 email 是否已存在
  const existingUser = await userRepository.findOneBy({ email })

  if (existingUser) {
    logger.warn('建立使用者錯誤: Email 已被使用')
    next(appError(409, 'Email 已被使用'))
    return
  }

  // 建立新使用者
  const hashPassword = await bcrypt.hash(password, saltRounds)
  const newUser = userRepository.create({
    name,
    email,
    role: 'USER',
    password: hashPassword
  })

  const savedUser = await userRepository.save(newUser)
  logger.info('新建立的使用者ID:', savedUser.id)

  handleSuccess(res, 201, {
    user: {
      id: savedUser.id,
      name: savedUser.name
    }
  })
}

const login = async (req, res, next) => {
  const { email, password } = req.body

  if (isUndefined(email) || isNotValidString(email) || isUndefined(password) || isNotValidString(password)) {
    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }


  const userRepository = dataSource.getRepository('User')
  const existingUser = await userRepository.findOne({
    select: ['id', 'name', 'password'],
    where: { email }
  })

  if (!existingUser) {
    next(appError(400, '使用者不存在'))
    return
  }

  logger.info(`使用者資料: ${JSON.stringify(existingUser)}`)

  if (!isValidPassword(password)) {
    logger.warn('密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
    next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'))
    return
  }

  const isMatch = await bcrypt.compare(password, existingUser.password)
  if (!isMatch) {
    next(appError(400, '密碼輸入錯誤'))
    return
  }

  const token = await generateJWT({
    id: existingUser.id
  }, config.get('secret.jwtSecret'), {
    expiresIn: `${config.get('secret.jwtExpiresDay')}`
  })

  handleSuccess(res, 201, {
    token,
    user: {
      name: existingUser.name
    }
  })
}

const forgetPassword = async (req, res, next) => {
  const { id } = req.user
  const { password, new_password, confirm_new_password } = req.body

  if (isNotValidString(password) || isNotValidString(new_password) || isNotValidString(confirm_new_password)) {
    return next(appError(400, '欄位未填寫正確'))
  }

  if (!isValidPassword(password) || !isValidPassword(new_password) || !isValidPassword(confirm_new_password)) {
    return next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'))
  }

  if (new_password === password) {
    return next(appError(400, '新密碼不能與舊密碼相同'))
  }

  if (new_password !== confirm_new_password) {
    next(appError(400, '新密碼與驗證新密碼不一致'))
    return
  }

  const userRepo = dataSource.getRepository('User')
  const findUser = await userRepo.findOne({
    select: ['password'],
    where: { id }
  })

  const passwordMatch = await bcrypt.compare(password, findUser.password)
  if (!passwordMatch) {
    return next(appError(400, '密碼輸入錯誤'))
  }

  const hashNewPassword = await bcrypt.hash(new_password, saltRounds)
  const updateUser = userRepo.update({ id }, { password: hashNewPassword })
  if (updateUser.affected === 0) {
    return next(appError(400, '更新密碼失敗'))
  }

  handleSuccess(res, 200, null)
}

const getProfile = async (req, res, next) => {
  const { id } = req.user

  const userRepository = dataSource.getRepository('User')
  const user = await userRepository.findOne({
    select: ['name', 'email'],
    where: { id }
  })

  handleSuccess(res, 200, user)
}

const editProfile = async (req, res, next) => {
  const { id } = req.user
  const { name } = req.body

  if (isUndefined(name) || isNotValidString(name)) {
    logger.warn('欄位未填寫正確')
    next(appError(400, '欄位未填寫正確'))
    return
  }

  const userRepository = dataSource.getRepository('User')
  const user = await userRepository.findOne({
    select: ['name'],
    where: { id }
  })

  if (user.name === name) {
    next(appError(400, '使用者名稱未變更'))
    return
  }

  const updatedResult = await userRepository.update({
    id,
    name: user.name
  }, {
    name
  })

  if (updatedResult.affected === 0) {
    next(appError(400, '更新使用者資料失敗'))
    return
  }

  const result = await userRepository.findOne({
    select: ['name'],
    where: { id }
  })

  handleSuccess(res, 200, { user: result })
}

const getPurchaseCreditPackage = async (req, res, next) => {
  const { id } = req.user
  const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
  const creditPurchase = await creditPurchaseRepo.find({
    select: [
      'purchased_credits',
      'price_paid',
      'purchaseAt',
    ],
    where: { user_id: id },
    relations: {
      CreditPackage: true,
    }
  })

  handleSuccess(res, 200, creditPurchase.map(item => (
    {
      purchased_credits: item.purchased_credits,
      price_paid: item.price_paid,
      name: item.CreditPackage.name,
      purchase_at: item.purchaseAt,
    }
  )))
}

const getEnrollCourse = async (req, res, next) => {
  const { id } = req.user

  const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
  const courseBookingRepo = dataSource.getRepository('CourseBooking')
  const userRepo = dataSource.getRepository('User')

  // 總購買堂數
  const userCreditPurchase = await creditPurchaseRepo.sum('purchased_credits', { user_id: id })

  // 已使用堂數
  const credit_usage = await courseBookingRepo.count({ user_id: id, cancelledAt: IsNull() })

  // 剩餘堂數
  const credit_remain = userCreditPurchase - credit_usage

  const courseBookingList = await courseBookingRepo.find({
    select: ['course_id'],
    where: { user_id: id },
    relations: {
      User: true,
      Course: true
    }
  })

  const now = new Date()

  const course_booking = await Promise.all(courseBookingList.map(async item => {
    const startAt = new Date(item.Course.start_at)
    const endAt = new Date(item.Course.end_at)

    let courseStatus = 'PENDING' // 尚未開始
    if (startAt <= now && endAt >= now) {
      courseStatus = 'PROGRESS' // 進行中
    } else if (endAt < now) {
      courseStatus = 'COMPLETED' // 已結束
    }

    const getCoachName = await userRepo.findOne({
      select: ['name'],
      where: { id: item.Course.user_id }
    })

    return {
      name: item.Course.name,
      course_id: item.course_id,
      coach_name: getCoachName.name,
      status: courseStatus,
      start_at: item.Course.start_at,
      end_at: item.Course.end_at,
      meeting_url: item.Course.meeting_url
    }
  }))

  handleSuccess(res, 200, {
    credit_usage,
    credit_remain,
    course_booking
  })
}

module.exports = { signup, login, getProfile, editProfile, forgetPassword, getPurchaseCreditPackage, getEnrollCourse }