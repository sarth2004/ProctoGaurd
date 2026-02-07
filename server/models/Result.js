const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'tab_switch', 'face_not_visible', 'multiple_faces'
    timestamp: { type: Date, default: Date.now },
    screenshot: { type: String }, // URL to screenshot if any
});

const resultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    totalQuestions: {
        type: Number,
        required: true,
    },
    totalPossibleScore: {
        type: Number,
        default: 0
    },
    status: {
        type: String, // 'Pass', 'Fail'
        required: true,
    },
    timeTaken: {
        type: Number, // in seconds
        default: 0
    },
    violations: [violationSchema],
    verificationPhoto: { type: String }, // Path or Base64
    answers: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }, // { "0": "Option A", "1": ["Option A", "Option B"] }
    verificationStatus: {
        type: String, // 'Pending', 'Verified', 'Rejected'
        default: 'Pending',
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Result', resultSchema);
