const Exam = require('../models/Exam');
const Result = require('../models/Result');
const { v4: uuidv4 } = require('uuid');

// Generate a random 6-char alphanumeric key
const generateKey = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create Exam
exports.createExam = async (req, res) => {
    try {
        const { title, duration, questions, proctoringEnabled, passingMarks } = req.body;

        // Auto-generate key
        let examKey = generateKey();
        // Ensure uniqueness (simple check)
        let existing = await Exam.findOne({ examKey });
        while (existing) {
            examKey = generateKey();
            existing = await Exam.findOne({ examKey });
        }

        const exam = new Exam({
            title,
            examKey,
            duration,
            questions,
            proctoringEnabled,
            passingMarks: passingMarks || 0,
            createdBy: req.user.id,
        });

        await exam.save();
        res.status(201).json(exam);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get All Exams (Admin)
exports.getExams = async (req, res) => {
    try {
        const exams = await Exam.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get Exam Results (Admin)
exports.getExamResults = async (req, res) => {
    try {
        const { examId } = req.params;
        const results = await Result.find({ examId })
            .populate('studentId', 'name email')
            .sort({ score: -1 }); // Rank by score descending

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Verify Exam Key (Student)
exports.verifyExamKey = async (req, res) => {
    try {
        const { examKey } = req.body;
        const exam = await Exam.findOne({ examKey, isActive: true }); // Include everything for student

        if (!exam) {
            return res.status(404).json({ message: 'Invalid Exam Key' });
        }

        // Check if student already took it? (Optional, verify with Results)
        const existingResult = await Result.findOne({ studentId: req.user.id, examId: exam._id });
        if (existingResult) {
            return res.status(400).json({ message: 'You have already taken this exam' });
        }

        if (!exam.isActive) {
            return res.status(403).json({ message: 'This exam is currently inactive. Please contact the administrator.' });
        }

        res.json(exam);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Submit Exam
exports.submitExam = async (req, res) => {
    try {
        const { examId, answers, violations, timeTaken, verificationPhoto } = req.body;
        const exam = await Exam.findById(examId);

        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        let score = 0;
        let totalPossibleScore = 0;

        for (const [index, q] of exam.questions.entries()) {
            const weight = q.weightage || 1;
            totalPossibleScore += weight;

            if (q.type === 'MSQ') {
                const studentAns = answers[index] || [];
                const correctAns = q.correctAnswers || [];
                // Check if sets match
                const isCorrect = studentAns.length === correctAns.length &&
                    studentAns.every(val => correctAns.includes(val)) &&
                    correctAns.every(val => studentAns.includes(val));

                if (isCorrect) score += weight;
            } else if (q.type === 'Coding') {
                // Python Code Auto-Grading with Test Cases
                const studentCode = answers[index] || '';
                const testCases = q.testCases || [];

                if (testCases.length === 0) continue;

                let passedCount = 0;
                // Note: We use the same runCode logic internally
                for (const tc of testCases) {
                    const result = await runPythonInternal(studentCode, tc.input);
                    if (result.success && result.output.trim() === tc.output.trim()) {
                        passedCount++;
                    }
                }

                // If all test cases pass, full marks. Otherwise partial.
                score += (passedCount / testCases.length) * weight;
            } else {
                // MCQ
                if (answers[index] === q.correctAnswer) {
                    score += weight;
                }
            }
        }

        const status = score >= (exam.passingMarks || 0) ? 'Pass' : 'Fail';

        const result = new Result({
            studentId: req.user.id,
            examId,
            score,
            totalPossibleScore, // Added for UI
            totalQuestions: exam.questions.length,
            status,
            violations,
            timeTaken, // Store time taken in seconds
            answers,
            verificationPhoto
        });

        await result.save();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get Student History for Admin
exports.getStudentHistoryForAdmin = async (req, res) => {
    try {
        const { studentId } = req.params;
        const results = await Result.find({ studentId })
            .populate('examId', 'title duration questions')
            .sort({ submittedAt: -1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get Student Exam History (Personal)
exports.getStudentHistory = async (req, res) => {
    try {
        const results = await Result.find({ studentId: req.user.id })
            .populate('examId', 'title duration questions')
            .sort({ submittedAt: -1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Helper for internally running Python
const runPythonInternal = (code, input = "") => {
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
        const py = spawn('python', ['-c', code]);
        let output = '';
        let error = '';

        const timer = setTimeout(() => {
            py.kill();
            resolve({ success: false, output: 'Time Limit Exceeded (3s)' });
        }, 3000);

        if (input) {
            py.stdin.write(input);
            py.stdin.end();
        }

        py.stdout.on('data', (data) => { output += data.toString(); });
        py.stderr.on('data', (data) => { error += data.toString(); });

        py.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve({ success: true, output });
            else resolve({ success: false, output: error || 'Execution Error' });
        });
    });
};

// Student Live Run Code
exports.runCode = async (req, res) => {
    try {
        const { code, input } = req.body;
        const result = await runPythonInternal(code, input);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Runner Error' });
    }
};

// --- Admin Management Controllers ---

// Delete Exam
exports.deleteExam = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access Denied' });
        const exam = await Exam.findByIdAndDelete(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        // Optionally delete all results associated with this exam
        await Result.deleteMany({ examId: req.params.id });
        res.json({ message: 'Exam and associated results deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete Specifc Result
exports.deleteResult = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access Denied' });
        const result = await Result.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ message: 'Result not found' });
        res.json({ message: 'Result deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete Student
exports.deleteStudent = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access Denied' });
        const student = await User.findByIdAndDelete(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        // Delete all results for this student
        await Result.deleteMany({ studentId: req.params.id });
        res.json({ message: 'Student and all their results deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Toggle Block Student
exports.toggleBlockStudent = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access Denied' });
        const student = await User.findById(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        student.isBlocked = !student.isBlocked;
        await student.save();

        res.json({
            message: `Student ${student.isBlocked ? 'blocked' : 'unblocked'} successfully`,
            isBlocked: student.isBlocked
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Update Exam
exports.updateExam = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access Denied' });
        const { title, duration, passingMarks, questions, proctoringEnabled } = req.body;

        const exam = await Exam.findByIdAndUpdate(
            req.params.id,
            { title, duration, passingMarks, questions, proctoringEnabled },
            { new: true }
        );

        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        res.json({ message: 'Exam updated successfully', exam });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Toggle Exam Status
exports.toggleExamStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access Denied' });
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        exam.isActive = !exam.isActive;
        await exam.save();

        res.json({
            message: `Exam ${exam.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: exam.isActive
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
