const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Result = require('./models/Result');
const Exam = require('./models/Exam');

dotenv.config();

async function checkDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const students = await User.find({ role: 'student' });
        console.log('Students in DB:', students.length);
        students.forEach(s => console.log(`- ${s.name} (${s.email})`));

        const results = await Result.find({});
        console.log('Total Results in DB:', results.length);

        const exams = await Exam.find({});
        console.log('Total Exams in DB:', exams.length);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDB();
