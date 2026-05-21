const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    let { email, phone, password } = req.body;
    if (!email || !phone || !password) {
      return res.status(400).json({ error: 'Email, phone, and password are required.' });
    }

    email = email.toLowerCase().trim();
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already exists.' });
    }

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
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required.' });
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
