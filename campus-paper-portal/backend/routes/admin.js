const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const Notification = require('../models/Notification');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /pending-papers - Admin only
router.get('/pending-papers', authMiddleware, adminOnly, async (req, res) => {
    try {
        const papers = await Paper.find({ status: 'pending' })
            .populate('submittedBy', 'fullName email')
            .populate('departmentId', 'name');
        res.json(papers);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /approve-paper/:id
router.patch('/approve-paper/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ message: 'Paper not found' });
        }

        paper.status = 'approved';
        await paper.save();

        // Create Notification
        const notification = new Notification({
            userId: paper.submittedBy,
            type: 'paper_status',
            title: 'Paper Approved',
            body: `Your paper "${paper.title}" has been approved.`,
        });
        await notification.save();

        res.json({ message: 'Paper approved', paper });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /reject-paper/:id
router.patch('/reject-paper/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ message: 'Paper not found' });
        }

        paper.status = 'rejected';
        await paper.save();

        // Create Notification
        const notification = new Notification({
            userId: paper.submittedBy,
            type: 'paper_status',
            title: 'Paper Rejected',
            body: `Your paper "${paper.title}" has been rejected.`,
        });
        await notification.save();

        res.json({ message: 'Paper rejected', paper });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
