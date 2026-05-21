const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    target: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, enum: ['register', 'passwordUpdate'] },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

otpSchema.index({ target: 1, purpose: 1 });

module.exports = mongoose.model('Otp', otpSchema);
