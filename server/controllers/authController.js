const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role, secretKey } = req.body;

        if (role === 'admin' && secretKey !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ message: 'Invalid Admin Secret Key' });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'student',
        });

        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Login User
exports.loginUser = async (req, res) => {
    try {
        const { email, password, secretKey } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'Your account has been blocked. Please contact the administrator.' });
        }

        if (user.role === 'admin' && secretKey !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ message: 'Invalid Admin Secret Key' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get Current User (Me)
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user || user.isBlocked) {
            return res.status(403).json({ message: 'Account disabled or blocked' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get All Students (Admin Only)
exports.getStudents = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied' });
        }
        const students = await User.find({ role: 'student' })
            .select('-password')
            .sort({ name: 1 });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
