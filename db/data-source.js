const { DataSource } = require('typeorm')
const config = require('../config/index')

const CreditPackage = require('../entities/CreditPackages.entity')
const Skill = require('../entities/Skill.entity')
const User = require('../entities/User.entity')
const Coach = require('../entities/Coach.entity')
const Course = require('../entities/Course.entity')
const CreditPurchase = require('../entities/CreditPurchase.entity')
const CourseBooking = require('../entities/CourseBooking.entity')

const dataSource = new DataSource({
  type: 'postgres',
  host: config.get('db.host'),
  port: config.get('db.port'),
  username: config.get('db.username'),
  password: config.get('db.password'),
  database: config.get('db.database'),
  synchronize: config.get('db.synchronize'),
  poolSize: 10,
  entities: [
    CreditPackage, Skill, User, Coach, Course, CreditPurchase, CourseBooking
  ],
  ssl: config.get('db.ssl')
})

module.exports = { dataSource }
