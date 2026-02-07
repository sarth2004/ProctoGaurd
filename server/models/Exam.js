const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: [{ type: String }],
    type: { type: String, enum: ['MCQ', 'MSQ', 'Coding'], default: 'MCQ' },
    weightage: { type: Number, default: 1 },
    correctAnswer: { type: String }, // For MCQ/Short Answer
    correctAnswers: [{ type: String }], // For MSQ
    testCases: [{
        input: { type: String },
        output: { type: String },
        isPublic: { type: Boolean, default: true }
    }],
});

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    examKey: {
        type: String,
        required: true,
        unique: true,
    },
    duration: {
        type: Number, // in minutes
        required: true,
    },
    passingMarks: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    questions: [questionSchema],
    isActive: {
        type: Boolean,
        default: true,
    },
    proctoringEnabled: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Exam', examSchema);
