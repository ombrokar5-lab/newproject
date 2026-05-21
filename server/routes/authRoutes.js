const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

function isEmail(target) {
  return typeof target === 'string' && target.includes('@');
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createOtp(target, purpose) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes

  const otp = await Otp.findOneAndUpdate(
    { target, purpose },
    { code, expiresAt, verified: false },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`OTP for ${purpose} to ${target}: ${code}`);
  return otp;
}

router.post('/send-otp', async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone || !purpose) {
      return res.status(400).json({ error: 'Phone and purpose are required.' });
    }

    if (purpose !== 'register') {
      return res.status(400).json({ error: 'Invalid OTP purpose.' });
    }

    const trimmedPhone = phone.trim();
    const existingPhone = await User.findOne({ phone: trimmedPhone });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already exists.' });
    }

    await createOtp(trimmedPhone, purpose);
    res.json({ message: 'OTP sent to your phone.' });
  } catch (error) {
    console.error('Send OTP error:', error.message);
    res.status(500).json({ error: 'Unable to send OTP.' });
  }
});

router.post('/send-password-otp', authMiddleware, async (req, res) => {
  try {
    const { targetType } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const normalizedTargetType = targetType === 'phone' ? 'phone' : 'email';
    const target = normalizedTargetType === 'phone' ? user.phone : user.email;
    if (!target) {
      return res.status(400).json({ error: `No ${normalizedTargetType} available for this account.` });
    }

    await createOtp(target, 'passwordUpdate');
    res.json({ message: `OTP sent to your ${normalizedTargetType}.` });
  } catch (error) {
    console.error('Send password OTP error:', error.message);
    res.status(500).json({ error: 'Unable to send password OTP.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    let { email, phone, password, otpCode } = req.body;
    if (!email || !phone || !password || !otpCode) {
      return res.status(400).json({ error: 'Email, phone, password, and OTP code are required.' });
    }

    email = email.toLowerCase().trim();
    phone = phone.trim();

    const otp = await Otp.findOne({ target: phone, purpose: 'register', code: otpCode, verified: false });
    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP code.' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already exists.' });
    }

    otp.verified = true;
    await otp.save();

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, phone, password: hashedPassword });
    await user.save();

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Unable to register user.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    const normalizedIdentifier = identifier.trim();
    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier.toLowerCase() }, { phone: normalizedIdentifier }],
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, phone: user.phone },
      process.env.JWT_SECRET || 'default_jwt_secret',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user._id, email: user.email, phone: user.phone },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Unable to login.' });
  }
});

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword, otpCode, targetType } = req.body;
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (otpCode) {
      const normalizedTargetType = targetType === 'phone' ? 'phone' : 'email';
      const target = normalizedTargetType === 'phone' ? user.phone : user.email;
      const otp = await Otp.findOne({ target, purpose: 'passwordUpdate', code: otpCode, verified: false });
      if (!otp || otp.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired OTP code.' });
      }

      otp.verified = true;
      await otp.save();

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      return res.json({ message: 'Password updated successfully using OTP.' });
    }

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required when OTP code is not provided.' });
    }

    const currentMatch = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Password update error:', error.message);
    res.status(500).json({ error: 'Unable to update password.' });
  }
});

module.exports = router;
