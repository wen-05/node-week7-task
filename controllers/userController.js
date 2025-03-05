const bcrypt = require('bcrypt')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('User')
const { isUndefined, isNotValidString, isValidPassword } = require('../utils/valid')
const { handleSuccess } = require('../utils/sendResponse')
const appError = require('../utils/appError')

const config = require('../config/index')
const generateJWT = require('../utils/generateJWT')

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

const getProfile = async (req, res, next) => {
  const { id } = req.user

  const userRepository = dataSource.getRepository('User')
  const user = await userRepository.findOne({
    select: ['name', 'email'],
    where: { id }
  })

  handleSuccess(res, 200, user)
}

const updateProfile = async (req, res, next) => {
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

module.exports = { signup, login, getProfile, updateProfile }