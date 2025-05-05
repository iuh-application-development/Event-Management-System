const admin = require('firebase-admin');
const path = require('path');

// Đường dẫn đến file khóa bạn vừa tải
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath)
});
admin.auth().listUsers(1)
  .then(() => {
    console.log("Kết nối Firebase thành công!");
  })
  .catch((error) => {
    console.error("Lỗi kết nối Firebase:", error);
  });
module.exports = admin;