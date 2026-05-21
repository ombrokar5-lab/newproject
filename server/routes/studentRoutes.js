const express = require('express');
const Student = require('../models/Student');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error('Fetch students error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch students.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch the student.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, major, enrollmentDate } = req.body;
    const student = new Student({ firstName, lastName, email, phone, major, enrollmentDate });
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    console.error('Create student error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to create student.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json(student);
  } catch (error) {
    console.error('Update student error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to update student.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json({ message: 'Student removed.' });
  } catch (error) {
    console.error('Delete student error:', error.message);
    res.status(500).json({ error: error.message || 'Unable to delete student.' });
  }
});

module.exports = router;
