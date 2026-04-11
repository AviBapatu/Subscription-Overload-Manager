const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phoneNumber: { type: String },
  timezone: { type: String, default: 'UTC' },
  name: { type: String },
  preferences: {
    notifyViaEmail: { type: Boolean, default: true },
    notifyViaWhatsApp: { type: Boolean, default: false },
    alertDaysBefore: { type: Number, default: 3 }
  }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
