// File: models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // Tên sự kiện
  title: { type: String, required: true },
  // Mô tả sự kiện
  description: { type: String, required: true },
  // Ngày diễn ra
  eventDate: { type: Date, required: true },
  // Thời gian
  eventTime: { type: String, required: true },
  // Địa điểm
  location: { type: String, required: true },
  // Giá vé
  ticketPrice: { type: Number, required: true },

  organizer: {
    type: mongoose.Schema.Types.ObjectId,  // ID tham chiếu đến User
    ref: 'User',                           // Liên kết với collection User
    required: true
  },
  
  owner: {
    type: mongoose.Schema.Types.ObjectId, // ID tham chiếu đến User
    ref: 'User'
  },
  // Trạng thái phê duyệt
  isApproved: {
    type: Boolean,
    default: false
  },
  image: String,
  category: String
}, {
  timestamps: true
});

// Móc lưu trước để đồng bộ hóa các trường chủ sở hữu và người tổ chức
eventSchema.pre('save', function(next) {
  if (this.owner && !this.organizer) {
    this.organizer = this.owner;   // Nếu có owner mà không có organizer
  }
  else if (this.organizer && !this.owner) {
    this.owner = this.organizer;   // Nếu có organizer mà không có owner
  }
  next();
});
// Tạo model từ schema
const Event = mongoose.model('Event', eventSchema);
module.exports = Event;