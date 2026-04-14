const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: false },
  googleId: { type: String },
  authProvider: { type: String, default: 'local' },
  phoneNumber: { type: String },
  timezone: { type: String, default: 'UTC' },
  name: { type: String },
  preferences: {
    notifyViaEmail:        { type: Boolean, default: true   },
    alertDaysBefore:       { type: Number,  default: 3      },
    notifUpcomingRenewals: { type: Boolean, default: true   },
    notifPriceIncreases:   { type: Boolean, default: false  },
    notifFailedPayments:   { type: Boolean, default: true   },
    notifFreeTrialEnding:  { type: Boolean, default: true   },
    notifYearlyOnly:       { type: Boolean, default: false  },
    multipleReminders:     { type: Boolean, default: false  },
    reminderD7:            { type: Boolean, default: false  },
    reminderD3:            { type: Boolean, default: true   },
    reminderD1:            { type: Boolean, default: false  },
    reminderBilling:       { type: Boolean, default: false  },
    quietHoursEnabled:     { type: Boolean, default: false  },
    quietHoursStart:       { type: String,  default: '22:00'},
    quietHoursEnd:         { type: String,  default: '08:00'},
    weeklySummary:         { type: Boolean, default: false  },
    budgetMonthly:         { type: Number,  default: 0      },
    budgetAlertAt80:       { type: Boolean, default: false  },
    budgetAlertOnNew:      { type: Boolean, default: false  },
    perSubOverrides:       { type: Boolean, default: false  },
    snoozeUntil:           { type: String,  default: null   }
  }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function() {
    if (!this.isModified('password') || !this.password) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
