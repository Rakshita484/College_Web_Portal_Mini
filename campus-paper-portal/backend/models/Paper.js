const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
    title: { type: String, required: true },
    abstract: { type: String },
    summary: { type: String },
    authors: [{ type: String }], // Array of author names
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    year: { type: Number },
    type: {
        type: String,
        enum: ['journal', 'conference', 'research_paper'],
        default: 'research_paper'
    },
    venue: { type: String },
    pdfUrl: { type: String },
    certificateUrl: { type: String },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);
