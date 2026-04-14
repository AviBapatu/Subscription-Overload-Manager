

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

// ─────────────────────────────────────────
// User Routes — specific routes FIRST, dynamic routes LAST
// ─────────────────────────────────────────

// ✅ All specific POST routes first
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/google', userController.googleLogin);        // ← moved to top
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-otp', userController.verifyOtp);
router.post('/reset-password', userController.resetPassword);
router.post('/', userController.seedUser);

// ✅ Dynamic :id routes LAST
router.get('/:id', auth, userController.getUserProfile);
router.put('/:id/preferences', auth, userController.updateUserPreferences);
router.put('/:id', auth, userController.updateUserProfile);

module.exports = router;