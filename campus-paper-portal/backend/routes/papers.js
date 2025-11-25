const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const Paper = require('../models/Paper');
const { authMiddleware } = require('../middleware/auth');

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Config (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper to upload stream to Cloudinary
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "auto", folder: folder },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        const stream = Readable.from(buffer);
        stream.pipe(uploadStream);
    });
};

// POST / - Upload Paper
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { title, abstract, summary, departmentId, year, type, venue, authors } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        let pdfUrl = '';

        // Try Cloudinary Upload
        try {
            if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo') {
                throw new Error('Cloudinary not configured');
            }
            const result = await uploadToCloudinary(req.file.buffer, "papers");
            pdfUrl = result.secure_url;
        } catch (cloudErr) {
            console.warn('Cloudinary upload failed or not configured, falling back to local storage:', cloudErr.message);

            // Fallback: Save to local uploads folder
            const fs = require('fs');
            const path = require('path');
            const fileName = `${Date.now()}-${req.file.originalname}`;
            const filePath = path.join(__dirname, '../uploads', fileName);

            fs.writeFileSync(filePath, req.file.buffer);

            // Construct local URL (assuming server runs on localhost:5000)
            // In production, this should be an env var, but for this fix it's fine.
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            pdfUrl = `${baseUrl}/uploads/${fileName}`;
        }

        const paper = new Paper({
            title,
            abstract,
            summary,
            authors: authors ? JSON.parse(authors) : [],
            departmentId,
            year,
            type,
            venue,
            pdfUrl,
            submittedBy: req.user.id,
            status: 'pending'
        });

        await paper.save();
        res.status(201).json(paper);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET / - List Public (Approved) Papers
router.get('/', async (req, res) => {
    try {
        const papers = await Paper.find({ status: 'approved' })
            .populate('submittedBy', 'fullName')
            .populate('departmentId', 'name')
            .sort({ createdAt: -1 });
        res.json(papers);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /my - List My Papers
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const papers = await Paper.find({ submittedBy: req.user.id })
            .populate('departmentId', 'name')
            .sort({ createdAt: -1 });
        res.json(papers);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
