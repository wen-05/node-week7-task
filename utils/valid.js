const isUndefined = (value) => {
  return value === undefined
}

const isNotValidString = (value) => {
  return typeof value !== 'string' || value.trim().length === 0 || value === ''
}

const isNotValidInteger = (value) => {
  return typeof value !== 'number' || value < 0 || value % 1 !== 0
}

const isValidPassword = (value) => {
  const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/
  return passwordPattern.test(value);
}

const isNotValidUUID = (id) => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

module.exports = {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isValidPassword,
  isNotValidUUID
}