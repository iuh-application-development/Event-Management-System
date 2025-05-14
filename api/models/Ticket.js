const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
   userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
   eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
   ticketId: { type: String, unique: true, required: true }, // Thêm trường này
   ticketDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      eventname: { type: String, required: true },
      eventdate: { type: Date, required: true },
      eventtime: { type: String, required: true },
      ticketprice: { type: Number, required: true },
      qr: { type: String, required: true },
   },
   count: { type: Number, default: 0 },
   isUsed: { type: Boolean, default: false },
   usedAt: Date
});

const TicketModel = mongoose.model(`Ticket`, ticketSchema);

module.exports = TicketModel;
module.exports = TicketModel;