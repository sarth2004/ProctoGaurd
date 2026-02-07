import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Layout, Users, FileText, LogOut, Check, X, Shield, Download, Trash2, ShieldOff, AlertTriangle, Eye, Edit, Power, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
    const { user, logout, loading } = useAuth();
    const [exams, setExams] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedExamResults, setSelectedExamResults] = useState(null);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingExamId, setEditingExamId] = useState(null);
    const [activeTab, setActiveTab] = useState('exams'); // 'exams', 'history', 'students'
    const [students, setStudents] = useState([]);

    // Create Exam Form State
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(30);
    const [passingMarks, setPassingMarks] = useState(10);
    const [proctoring, setProctoring] = useState(true);
    const [questions, setQuestions] = useState([{ questionText: '', options: ['', '', '', ''], type: 'MCQ', weightage: 1, correctAnswer: '', correctAnswers: [] }]);

    // Student History Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentHistory, setStudentHistory] = useState([]);
    const [showStudentHistoryModal, setShowStudentHistoryModal] = useState(false);

    // Violation Log Modal State
    const [selectedViolationResult, setSelectedViolationResult] = useState(null);
    const [showViolationsModal, setShowViolationsModal] = useState(false);

    // Photo Verification Modal State
    const [verificationPhotoToShow, setVerificationPhotoToShow] = useState(null);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    const fetchExams = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/exams/all`);
            setExams(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchResults = async (examId) => {
        try {
            const res = await axios.get(`${API_URL}/api/exams/${examId}/results`);
            setSelectedExamResults(res.data);
            setShowResultsModal(true);
        } catch (error) {
            toast.error('Failed to fetch results');
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/auth/students`);
            setStudents(res.data);
        } catch (error) {
            console.error('Student fetch error:', error);
            toast.error('Failed to fetch students. Please refresh.');
        }
    };

    const downloadCSV = (results, examTitle) => {
        const headers = ["Rank", "Name", "Email", "Score", "Total", "Status", "Violations"];
        const rows = results.map((r, index) => [
            index + 1,
            r.studentId.name,
            r.studentId.email,
            r.score,
            r.totalQuestions,
            r.status,
            r.violations.length
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${examTitle}_results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (!loading && user) {
            fetchExams();
            fetchStudents();
        }
    }, [loading, user]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { questionText: '', options: ['', '', '', ''], type: 'MCQ', weightage: 1, correctAnswer: '', correctAnswers: [], sampleInput: '', expectedOutput: '' }]);
    };

    const fetchStudentHistory = async (studentId) => {
        try {
            const res = await axios.get(`${API_URL}/api/exams/student/${studentId}/history`);
            setStudentHistory(res.data);
        } catch (error) {
            toast.error('Failed to fetch student history');
        }
    };

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleDeleteExam = async (examId) => {
        if (!window.confirm('Are you sure you want to delete this exam and all its results? This action is permanent.')) return;
        try {
            await axios.delete(`${API_URL}/api/exams/${examId}`);
            toast.success('Exam Deleted');
            fetchExams();
        } catch (error) {
            toast.error('Failed to delete exam');
        }
    };

    const handleDeleteResult = async (resultId) => {
        if (!window.confirm('Delete this result record?')) return;
        try {
            await axios.delete(`${API_URL}/api/exams/results/${resultId}`);
            toast.success('Result Deleted');
            // Refresh current results modal
            if (activeExamForResults) fetchResults(activeExamForResults);
            // Refresh student history modal if open
            if (selectedStudent) fetchStudentHistory(selectedStudent._id);
        } catch (error) {
            toast.error('Failed to delete result');
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm('Are you sure you want to delete this student and all their history? This action is permanent.')) return;
        try {
            await axios.delete(`${API_URL}/api/exams/students/${studentId}`);
            toast.success('Student Deleted');
            fetchStudents();
        } catch (error) {
            toast.error('Failed to delete student');
        }
    };

    const handleToggleBlock = async (studentId) => {
        try {
            const res = await axios.patch(`${API_URL}/api/exams/students/${studentId}/block`);
            toast.success(res.data.message);
            fetchStudents();
        } catch (error) {
            toast.error('Failed to update student status');
        }
    };

    const handleSaveExam = async (e) => {
        e.preventDefault();
        try {
            const examData = { title, duration, passingMarks, questions, proctoringEnabled: proctoring };
            if (isEditing) {
                await axios.put(`${API_URL}/api/exams/${editingExamId}`, examData);
                toast.success('Exam Updated Successfully');
            } else {
                await axios.post(`${API_URL}/api/exams/create`, examData);
                toast.success('Exam Created Successfully');
            }
            setShowCreateModal(false);
            setIsEditing(false);
            setEditingExamId(null);
            // Reset form
            setTitle('');
            setDuration(30);
            setPassingMarks(10);
            setProctoring(true);
            setQuestions([{ questionText: '', options: ['', '', '', ''], type: 'MCQ', weightage: 1, correctAnswer: '', correctAnswers: [] }]);
            fetchExams();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save exam');
        }
    };

    const handleEditExam = (exam) => {
        setEditingExamId(exam._id);
        setTitle(exam.title);
        setDuration(exam.duration);
        setPassingMarks(exam.passingMarks);
        setProctoring(exam.proctoringEnabled);
        setQuestions(exam.questions);
        setIsEditing(true);
        setShowCreateModal(true);
    };

    const handleToggleExamStatus = async (examId) => {
        try {
            const res = await axios.patch(`${API_URL}/api/exams/${examId}/status`);
            toast.success(res.data.message);
            fetchExams();
        } catch (error) {
            toast.error('Failed to update exam status');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 pb-6 border-b border-gray-800">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-400">Welcome, {user?.name}</p>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                    <LogOut size={18} /> Logout
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400">Total Exams</p>
                            <h3 className="text-4xl font-bold mt-2">{exams.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                            <FileText size={24} />
                        </div>
                    </div>
                </div>
                {/* Active Students - Just a label for now */}
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400">Total Students</p>
                            <h3 className="text-4xl font-bold mt-2">
                                {students.length}
                            </h3>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                            <Users size={24} />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400">System Status</p>
                            <h3 className="text-xl font-bold mt-2 text-green-400">Active</h3>
                        </div>
                        <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                            <Layout size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 mb-8 border-b border-gray-800">
                {['exams', 'history', 'students'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 px-2 capitalize transition-all relative ${activeTab === tab ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {tab === 'exams' ? 'Active Exams' : tab === 'history' ? 'Exam History' : 'Students List'}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            {activeTab === 'exams' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Live Proctored Exams</h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2 rounded-lg hover:shadow-lg transition-all active:scale-95"
                        >
                            <Plus size={20} /> Create New Exam
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {exams.map(exam => (
                            <motion.div
                                key={exam._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl hover:border-gray-700 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                                            <span className="bg-gray-800 px-2 py-1 rounded">Duration: {exam.duration}m</span>
                                            <span className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
                                                <Shield size={14} className={exam.proctoringEnabled ? 'text-green-400' : 'text-gray-500'} />
                                                {exam.proctoringEnabled ? 'Proctored' : 'Standard'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${exam.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {exam.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleToggleExamStatus(exam._id)}
                                                className={`p-2 rounded-lg transition-all ${exam.isActive ? 'text-green-500 hover:bg-green-500/10' : 'text-gray-500 hover:bg-gray-500/10'}`}
                                                title={exam.isActive ? 'Deactivate Exam' : 'Activate Exam'}
                                            >
                                                {exam.isActive ? <Power size={16} /> : <Power size={16} className="opacity-30" />}
                                            </button>
                                            <button
                                                onClick={() => handleEditExam(exam)}
                                                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                                title="Edit Exam"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteExam(exam._id)}
                                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Delete Exam"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Exam Key</p>
                                            <p className="text-2xl font-mono text-blue-400 font-bold tracking-wider">{exam.examKey}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => fetchResults(exam._id)}
                                        className="flex-1 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 py-2 rounded-lg transition-colors text-sm font-bold"
                                    >
                                        Live Results
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'history' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold mb-6">Past Completed Exams</h2>
                    <div className="bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                                    <th className="px-6 py-4">S.No</th>
                                    <th className="px-6 py-4">Exam Title</th>
                                    <th className="px-6 py-4">Created On</th>
                                    <th className="px-6 py-4">Total Questions</th>
                                    <th className="px-6 py-4">Duration</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {exams.map((exam, index) => (
                                    <tr key={exam._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 font-mono">{index + 1}</td>
                                        <td className="px-6 py-4 font-bold">{exam.title}</td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">{new Date(exam.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{exam.questions.length} Questions</td>
                                        <td className="px-6 py-4 text-gray-400">{exam.duration} Minutes</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${exam.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {exam.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => fetchResults(exam._id)}
                                                className="text-blue-400 hover:text-blue-300 text-sm font-bold bg-blue-400/10 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Report
                                            </button>
                                            <button
                                                onClick={() => handleToggleExamStatus(exam._id)}
                                                className={`p-1.5 rounded-lg transition-all ${exam.isActive ? 'text-green-500 hover:bg-green-500/10' : 'text-gray-500 hover:bg-gray-500/10'}`}
                                                title={exam.isActive ? 'Deactivate Exam' : 'Activate Exam'}
                                            >
                                                <Power size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleEditExam(exam)}
                                                className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                                title="Edit Exam"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteExam(exam._id)}
                                                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Delete Exam"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold mb-6">Registered Students (Alphabetical)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {students.map((student) => (
                            <motion.div
                                key={student._id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => {
                                    setSelectedStudent(student);
                                    fetchStudentHistory(student._id);
                                    setShowStudentHistoryModal(true);
                                }}
                                className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-blue-500/50 transition-colors group"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xl uppercase">
                                    {student.name.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-bold truncate">{student.name}</h3>
                                    <p className="text-gray-500 text-xs truncate">{student.email}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${student.isBlocked ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {student.isBlocked ? 'Blocked' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleBlock(student._id); }}
                                        className={`p-1.5 rounded-lg transition-colors ${student.isBlocked ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'}`}
                                        title={student.isBlocked ? 'Unblock' : 'Block'}
                                    >
                                        {student.isBlocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student._id); }}
                                        className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Delete Student"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Exam Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold">{isEditing ? 'Edit Exam' : 'Create New Exam'}</h3>
                                <button onClick={() => {
                                    setShowCreateModal(false);
                                    setIsEditing(false);
                                    setEditingExamId(null);
                                    setTitle('');
                                    setDuration(30);
                                    setPassingMarks(10);
                                    setProctoring(true);
                                    setQuestions([{ questionText: '', options: ['', '', '', ''], type: 'MCQ', weightage: 1, correctAnswer: '', correctAnswers: [] }]);
                                }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSaveExam} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Exam Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Duration (Minutes)</label>
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={e => setDuration(e.target.value)}
                                            className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Passing Marks</label>
                                        <input
                                            type="number"
                                            value={passingMarks}
                                            onChange={e => setPassingMarks(e.target.value)}
                                            className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={proctoring}
                                        onChange={e => setProctoring(e.target.checked)}
                                        className="w-5 h-5 accent-blue-500"
                                    />
                                    <label className="text-gray-300">Enable AI Proctoring</label>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-lg font-semibold">Questions</h4>
                                        <button
                                            type="button"
                                            onClick={handleAddQuestion}
                                            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Plus size={16} /> Add Question
                                        </button>
                                    </div>

                                    {questions.map((q, qIndex) => (
                                        <div key={qIndex} className="bg-black/50 p-6 rounded-xl border border-gray-800">
                                            <div className="flex gap-4 mb-4">
                                                <input
                                                    type="text"
                                                    placeholder={`Question ${qIndex + 1}`}
                                                    value={q.questionText}
                                                    onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                                                    className="flex-1 bg-transparent border-b border-gray-700 p-2 focus:border-blue-500 outline-none"
                                                    required
                                                />
                                                <select
                                                    value={q.type}
                                                    onChange={e => handleQuestionChange(qIndex, 'type', e.target.value)}
                                                    className="bg-gray-800 text-sm border-none rounded p-2"
                                                >
                                                    <option value="MCQ">MCQ</option>
                                                    <option value="MSQ">MSQ</option>
                                                    <option value="Coding">Coding / Scenario</option>
                                                </select>
                                                <select
                                                    value={q.weightage}
                                                    onChange={e => handleQuestionChange(qIndex, 'weightage', parseInt(e.target.value))}
                                                    className="bg-gray-800 text-sm border-none rounded p-2"
                                                >
                                                    <option value={1}>1 Mark</option>
                                                    <option value={2}>2 Marks</option>
                                                </select>
                                            </div>

                                            {q.type !== 'Coding' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    {q.options.map((opt, oIndex) => (
                                                        <div key={oIndex} className="flex flex-col gap-1">
                                                            <input
                                                                type="text"
                                                                placeholder={`Option ${oIndex + 1}`}
                                                                value={opt}
                                                                onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                                className="w-full bg-gray-900 rounded p-3 text-sm border border-gray-800 focus:border-gray-600 outline-none"
                                                                required
                                                            />
                                                            {q.type === 'MSQ' && (
                                                                <label className="flex items-center gap-2 text-[10px] text-gray-500 px-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={q.correctAnswers?.includes(opt)}
                                                                        onChange={(e) => {
                                                                            const newCorrect = e.target.checked
                                                                                ? [...(q.correctAnswers || []), opt]
                                                                                : q.correctAnswers?.filter(a => a !== opt);
                                                                            handleQuestionChange(qIndex, 'correctAnswers', newCorrect);
                                                                        }}
                                                                    />
                                                                    Correct Answer?
                                                                </label>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {q.type === 'Coding' && (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Python Test Cases</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newTC = [...(q.testCases || []), { input: '', output: '', isPublic: true }];
                                                                handleQuestionChange(qIndex, 'testCases', newTC);
                                                            }}
                                                            className="text-[10px] bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full hover:bg-blue-600/30 transition-colors"
                                                        >
                                                            + Add Test Case
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {(q.testCases || []).length === 0 && (
                                                            <p className="text-[10px] text-gray-600 italic">No test cases added yet. Add at least one for auto-grading.</p>
                                                        )}
                                                        {(q.testCases || []).map((tc, tcIndex) => (
                                                            <div key={tcIndex} className="bg-black/50 p-4 rounded-xl border border-gray-800 space-y-3 relative group/tc">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newTC = q.testCases.filter((_, i) => i !== tcIndex);
                                                                        handleQuestionChange(qIndex, 'testCases', newTC);
                                                                    }}
                                                                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-500 opacity-0 group-hover/tc:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="text-[10px] text-gray-600 uppercase font-bold block mb-1">Input (Optional)</label>
                                                                        <textarea
                                                                            value={tc.input}
                                                                            onChange={(e) => {
                                                                                const newTC = [...q.testCases];
                                                                                newTC[tcIndex].input = e.target.value;
                                                                                handleQuestionChange(qIndex, 'testCases', newTC);
                                                                            }}
                                                                            className="w-full bg-gray-900 rounded p-2 text-xs border border-gray-800 focus:border-blue-500 outline-none h-16 resize-none"
                                                                            placeholder="e.g. 5"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-gray-600 uppercase font-bold block mb-1">Expected Output</label>
                                                                        <textarea
                                                                            value={tc.output}
                                                                            onChange={(e) => {
                                                                                const newTC = [...q.testCases];
                                                                                newTC[tcIndex].output = e.target.value;
                                                                                handleQuestionChange(qIndex, 'testCases', newTC);
                                                                            }}
                                                                            className="w-full bg-gray-900 rounded p-2 text-xs border border-gray-800 focus:border-green-600 outline-none h-16 resize-none"
                                                                            placeholder="e.g. 25"
                                                                            required
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer w-fit">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={tc.isPublic}
                                                                        onChange={(e) => {
                                                                            const newTC = [...q.testCases];
                                                                            newTC[tcIndex].isPublic = e.target.checked;
                                                                            handleQuestionChange(qIndex, 'testCases', newTC);
                                                                        }}
                                                                    />
                                                                    Visible to Student (Public Test Case)
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {q.type === 'MCQ' && (
                                                <div className="mt-4">
                                                    <label className="text-xs text-gray-500 block mb-1">Correct Answer (Matches Option Exactly)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Correct Answer"
                                                        value={q.correctAnswer}
                                                        onChange={e => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                                                        className="w-full bg-gray-900 rounded p-2 text-sm border border-gray-800 focus:border-green-900 outline-none"
                                                        required
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-900/20 transition-all"
                                >
                                    {isEditing ? 'Update Exam' : 'Publish Exam'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Results Modal */}
            <AnimatePresence>
                {showResultsModal && selectedExamResults && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 border border-gray-800 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold">Exam Results</h3>
                                    <p className="text-gray-400 text-sm">Sorted by Rank (Highest Score First)</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => downloadCSV(selectedExamResults, "Exam")}
                                        className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-600/30 transition-colors text-sm"
                                    >
                                        <Download size={18} /> Export CSV
                                    </button>
                                    <button onClick={() => setShowResultsModal(false)} className="text-gray-400 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedExamResults.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500">
                                        No results yet for this exam.
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-gray-400 text-sm border-b border-gray-800">
                                                <th className="pb-4 font-medium">Rank</th>
                                                <th className="pb-4 font-medium">Student</th>
                                                <th className="pb-4 font-medium">Email</th>
                                                <th className="pb-4 font-medium">Score</th>
                                                <th className="pb-4 font-medium">Violations</th>
                                                <th className="pb-4 font-medium">Photo</th>
                                                <th className="pb-4 font-medium">Status</th>
                                                <th className="pb-4 font-medium text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/50 text-sm">
                                            {selectedExamResults.map((result, index) => (
                                                <tr key={result._id} className="hover:bg-white/5 transition-colors">
                                                    <td className="py-4">
                                                        <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                            index === 1 ? 'bg-gray-400/20 text-gray-400' :
                                                                index === 2 ? 'bg-orange-500/20 text-orange-500' :
                                                                    'bg-gray-800 text-gray-500'
                                                            }`}>
                                                            {index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 font-medium">{result.studentId.name}</td>
                                                    <td className="py-4 text-gray-400">{result.studentId.email}</td>
                                                    <td className="py-4">
                                                        <span className="text-lg font-bold text-blue-400">{result.score}</span>
                                                        <span className="text-gray-500"> / {result.totalPossibleScore || result.totalQuestions}</span>
                                                    </td>
                                                    <td className="py-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedViolationResult(result);
                                                                setShowViolationsModal(true);
                                                            }}
                                                            className={`px-2 py-1 rounded-md text-xs font-bold transition-all hover:scale-105 active:scale-95 ${result.violations.length > 5 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' :
                                                                result.violations.length > 0 ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' :
                                                                    'bg-green-500/10 text-green-500'
                                                                }`}
                                                        >
                                                            {result.violations.length} Violations
                                                        </button>
                                                    </td>
                                                    <td className="py-4">
                                                        {result.verificationPhoto ? (
                                                            <button
                                                                onClick={() => {
                                                                    setVerificationPhotoToShow(result.verificationPhoto);
                                                                    setShowPhotoModal(true);
                                                                }}
                                                                className="w-10 h-10 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-all active:scale-95"
                                                            >
                                                                <img src={result.verificationPhoto} alt="Student" className="w-full h-full object-cover" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-600 text-xs italic">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4">
                                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${result.status === 'Pass' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                            }`}>
                                                            {result.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <button
                                                            onClick={() => handleDeleteResult(result._id)}
                                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                                            title="Delete Result"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Student History Modal (Admin View) */}
            <AnimatePresence>
                {showStudentHistoryModal && selectedStudent && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                                <div>
                                    <h3 className="text-2xl font-bold">{selectedStudent.name}'s History</h3>
                                    <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                                </div>
                                <button onClick={() => setShowStudentHistoryModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {studentHistory.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500">No exams taken yet.</div>
                                ) : (
                                    studentHistory.map((record) => (
                                        <div key={record._id} className="bg-black/30 border border-gray-800 p-6 rounded-2xl">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-lg">{record.examId?.title}</h4>
                                                    <p className="text-xs text-gray-500">{new Date(record.submittedAt).toLocaleDateString()} at {new Date(record.submittedAt).toLocaleTimeString()}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${record.status === 'Pass' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {record.status}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteResult(record._id)}
                                                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                        title="Delete Result"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 text-center">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Score</p>
                                                    <p className="text-xl font-bold text-blue-400">{record.score} / {record.totalPossibleScore || record.totalQuestions}</p>
                                                </div>
                                                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 text-center">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Time Taken</p>
                                                    <p className="text-xl font-bold text-purple-400">
                                                        {Math.floor((record.timeTaken || 0) / 60)}m {(record.timeTaken || 0) % 60}s
                                                    </p>
                                                </div>
                                                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 text-center">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Violations</p>
                                                    <p className="text-xl font-bold text-red-400">{record.violations?.length || 0}</p>
                                                </div>
                                                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 text-center">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Status</p>
                                                    <p className={`text-xl font-bold ${record.status === 'Pass' ? 'text-green-400' : 'text-red-400'}`}>{record.status}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Violation Log Modal */}
            <AnimatePresence>
                {showViolationsModal && selectedViolationResult && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-gray-900 border border-gray-800 w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Violation Log</h3>
                                        <p className="text-sm text-gray-500">{selectedViolationResult.studentId.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowViolationsModal(false)} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {selectedViolationResult.violations.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        No violations recorded for this session.
                                    </div>
                                ) : (
                                    [...selectedViolationResult.violations].reverse().map((v, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-black/40 border border-gray-800/50 rounded-2xl hover:border-gray-700 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${v.type === 'tab_switch' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    <AlertTriangle size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold capitalize">{v.type.replace(/_/g, ' ')}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(v.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                            {v.screenshot && (
                                                <a
                                                    href={v.screenshot}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-400/10 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Eye size={14} /> View Proof
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end">
                                <button
                                    onClick={() => setShowViolationsModal(false)}
                                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-colors"
                                >
                                    Close Log
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Photo Verification Modal */}
            <AnimatePresence>
                {showPhotoModal && verificationPhotoToShow && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-gray-900 border border-gray-800 max-w-3xl w-full rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="font-bold">Identity Verification Photo</h3>
                                <button onClick={() => setShowPhotoModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-4">
                                <img
                                    src={verificationPhotoToShow}
                                    alt="Verification Proof"
                                    className="w-full h-auto rounded-2xl shadow-lg border border-gray-800"
                                />
                            </div>
                            <div className="p-4 flex justify-center">
                                <button
                                    onClick={() => setShowPhotoModal(false)}
                                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl font-bold transition-all"
                                >
                                    Confirm & Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
