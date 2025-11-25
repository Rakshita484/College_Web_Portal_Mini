const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const Event = require('../models/Event');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Cloudinary/Local Upload Helper (Reused from papers.js logic)
// In a real app, this should be extracted to a utility file.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadFile = async (buffer, folder, req) => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo') {
            throw new Error('Cloudinary not configured');
        }
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: "auto", folder: folder },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                }
            );
            const stream = Readable.from(buffer);
            stream.pipe(uploadStream);
        });
    } catch (err) {
        console.warn('Upload fallback to local:', err.message);
        const fs = require('fs');
        const path = require('path');
        const fileName = `${Date.now()}-event-${Math.round(Math.random() * 1E9)}`;
        const filePath = path.join(__dirname, '../uploads', fileName);
        fs.writeFileSync(filePath, buffer);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        return `${baseUrl}/uploads/${fileName}`;
    }
};

// POST / - Create Event (Auth required)
router.post('/', authMiddleware, upload.single('certificate'), async (req, res) => {
    try {
        const { title, description, date, location, organizer, departmentId } = req.body;

        let certificateUrl = '';
        if (req.file) {
            certificateUrl = await uploadFile(req.file.buffer, "events", req);
        }

        const event = new Event({
            title,
            description,
            date,
            location,
            organizer,
            departmentId,
            certificateUrl,
            submittedBy: req.user.id,
            status: 'pending' // Default status
        });

        await event.save();
        res.status(201).json(event);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET / - List Approved Events (Public)
router.get('/', async (req, res) => {
    try {
        const events = await Event.find({ status: 'approved' })
            .populate('departmentId', 'name')
            .sort({ date: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /pending - List Pending Events (Admin only)
router.get('/pending', authMiddleware, adminOnly, async (req, res) => {
    try {
        const events = await Event.find({ status: 'pending' })
            .populate('submittedBy', 'fullName email')
            .populate('departmentId', 'name')
            .sort({ createdAt: -1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /:id/status - Approve/Reject Event (Admin only)
router.patch('/:id/status', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Create Notification (Simplified)
        const Notification = require('../models/Notification');
        await Notification.create({
            userId: event.submittedBy,
            type: 'event_status',
            title: `Event ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            body: `Your event "${event.title}" has been ${status}.`,
            read: false
        });

        res.json(event);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
