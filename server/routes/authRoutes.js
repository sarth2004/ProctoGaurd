const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, getStudents } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', auth, getMe);
router.get('/students', auth, getStudents);

module.exports = router;
