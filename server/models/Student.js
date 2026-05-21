const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    major: { type: String, trim: true },
    enrollmentDate: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', studentSchema);
