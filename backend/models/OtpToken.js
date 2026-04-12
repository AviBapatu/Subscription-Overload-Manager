const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    otpHash: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // Automatically deletes the document 10 minutes (600 seconds) after creation
    }
});

module.exports = mongoose.model('OtpToken', otpTokenSchema);
