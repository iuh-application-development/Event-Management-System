// File: models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  eventDate: {
    type: Date, 
    required: true
  },
  eventTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  ticketPrice: {
    type: Number,
    required: true
  },  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Adding owner as an alias for organizer for legacy code compatibility
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  image: String,
  category: String
}, {
  timestamps: true
});

// Pre-save hook to sync owner and organizer fields
eventSchema.pre('save', function(next) {
  // If owner is set but organizer is not, copy owner to organizer
  if (this.owner && !this.organizer) {
    this.organizer = this.owner;
  }
  // If organizer is set but owner is not, copy organizer to owner
  else if (this.organizer && !this.owner) {
    this.owner = this.organizer;
  }
  next();
});

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;