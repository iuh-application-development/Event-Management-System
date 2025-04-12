const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  uid: { type: String, unique: true, sparse: true }, // Firebase UID
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String }, // Giữ lại để tương thích với xác thực cũ
  photoURL: String, // URL ảnh từ Google
  role: { type: String, default: 'participant', enum: ['admin', 'organizer', 'participant'] }
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;