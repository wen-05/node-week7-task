module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresDay: process.env.JWT_EXPIRES_DAY,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  }
}