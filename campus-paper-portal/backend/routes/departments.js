const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

// GET /
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json(departments);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
