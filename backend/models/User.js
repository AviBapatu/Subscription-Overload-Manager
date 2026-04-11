const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  phoneNumber: { type: String },
  timezone: { type: String, default: 'UTC' },
  name: { type: String },
  preferences: {
    notifyViaEmail: { type: Boolean, default: true },
    notifyViaWhatsApp: { type: Boolean, default: false },
    alertDaysBefore: { type: Number, default: 3 }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
