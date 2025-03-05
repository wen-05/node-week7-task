const sendResponse = (res, statusCode, result) => {
  res.status(statusCode).json(result)
}

const handleSuccess = (res, statusCode, data) => {
  sendResponse(res, statusCode, { status: 'success', data })
}

module.exports = { handleSuccess }