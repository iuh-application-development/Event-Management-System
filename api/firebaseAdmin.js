const admin = require('firebase-admin');
const path = require('path');

// Đường dẫn đến file khóa bạn vừa tải
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath)
});

module.exports = admin;