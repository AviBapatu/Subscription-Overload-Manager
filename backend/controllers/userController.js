const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const OtpToken = require('../models/OtpToken');
const { sendOtpEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'som_secret_key_123';

const generateToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
};

// ─────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────

exports.getUserProfile = async (req, res) => {
    try {
        if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Unauthorized profile access' });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.seedUser = async (req, res) => {
    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.json(existing);

        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.registerUser = async (req, res) => {
    try {
        const { email, password, name, phoneNumber, timezone } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing) return res.status(400).json({ error: 'Email already exists. Please sign in.' });

        const user = new User({
            email: email.trim().toLowerCase(),
            password: password,
            name: name || email.split('@')[0],
            phoneNumber: phoneNumber || '',
            timezone: timezone || 'UTC',
            preferences: {
                notifyViaEmail: true,
                notifyViaWhatsApp: false,
                alertDaysBefore: 3
            }
        });
        await user.save();
        
        const token = generateToken(user);
        res.status(201).json({ user, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user);
        res.json({ user, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateUserPreferences = async (req, res) => {
    try {
        if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Unauthorized' });
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { preferences: req.body } },
            { new: true }
        );
        
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Retroactively cascade preference updates (alert dates and notification flags) to all active subscriptions
        const Subscription = require('../models/Subscription');
        const dayjs = require('dayjs');
        const subs = await Subscription.find({ userId: user._id });
        
        for (const sub of subs) {
            const alertDays = user.preferences?.alertDaysBefore || 3;
            sub.notifyViaEmail = user.preferences?.notifyViaEmail;
            sub.notifyViaWhatsApp = user.preferences?.notifyViaWhatsApp;
            sub.alertDate = dayjs(sub.nextBillingDate).subtract(alertDays, 'day').startOf('day').toDate();
            await sub.save();
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Unauthorized' });
        const { name, phoneNumber, timezone } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { name, phoneNumber, timezone } },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(200).json({ message: 'If that email exists, an OTP has been sent.' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

        await OtpToken.deleteMany({ userId: user._id });

        await OtpToken.create({
            userId: user._id,
            otpHash: otpHash
        });

        sendOtpEmail(user.email, otpCode).catch(console.error);

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(400).json({ error: 'Invalid operation' });

        const hashedOtpChallenge = crypto.createHash('sha256').update(otp).digest('hex');
        
        const tokenDoc = await OtpToken.findOne({
            userId: user._id,
            otpHash: hashedOtpChallenge
        });

        if (!tokenDoc) {
            return res.status(400).json({ error: 'Invalid or expired OTP code' });
        }

        res.status(200).json({ message: 'OTP verified successfully', validSignature: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields are required' });

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(400).json({ error: 'Invalid operation' });

        const hashedOtpChallenge = crypto.createHash('sha256').update(otp).digest('hex');
        
        const tokenDoc = await OtpToken.findOne({
            userId: user._id,
            otpHash: hashedOtpChallenge
        });

        if (!tokenDoc) {
            return res.status(400).json({ error: 'Session expired or invalidated. Please request a new OTP.' });
        }

        user.password = newPassword;
        await user.save();

        await OtpToken.deleteOne({ _id: tokenDoc._id });

        res.status(200).json({ message: 'Password has been successfully reset' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
