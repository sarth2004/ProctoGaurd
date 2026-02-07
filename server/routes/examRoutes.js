const express = require('express');
const router = express.Router();
const { createExam, getExams, verifyExamKey, submitExam, getExamResults, getStudentHistory, getStudentHistoryForAdmin, runCode, deleteExam, deleteResult, deleteStudent, toggleBlockStudent, updateExam, toggleExamStatus } = require('../controllers/examController');
const auth = require('../middleware/auth');

// Admin Routes
router.post('/create', auth, createExam);
router.get('/all', auth, getExams);
router.get('/:examId/results', auth, getExamResults);
router.get('/student/:studentId/history', auth, getStudentHistoryForAdmin);
router.delete('/:id', auth, deleteExam);
router.put('/:id', auth, updateExam);
router.patch('/:id/status', auth, toggleExamStatus);
router.delete('/results/:id', auth, deleteResult);
router.delete('/students/:id', auth, deleteStudent);
router.patch('/students/:id/block', auth, toggleBlockStudent);

// Student Routes
router.post('/verify-key', auth, verifyExamKey);
router.post('/submit', auth, submitExam);
router.post('/run-code', auth, runCode);
router.get('/student-history', auth, getStudentHistory);

module.exports = router;
