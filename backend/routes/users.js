const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

// ─────────────────────────────────────────
// User Routes
// ─────────────────────────────────────────

router.get('/:id', auth, userController.getUserProfile);
router.post('/', userController.seedUser);
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.put('/:id/preferences', auth, userController.updateUserPreferences);
router.put('/:id', auth, userController.updateUserProfile);
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-otp', userController.verifyOtp);
router.post('/reset-password', userController.resetPassword);

module.exports = router;
