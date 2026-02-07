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
        <div className="min-h-screen bg-white text-gray-900 p-6 font-sans">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 pb-6 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">Logged in as {user?.name}</p>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all text-sm font-bold shadow-sm"
                >
                    <LogOut size={16} /> Logout
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Exams</p>
                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{exams.length}</h3>
                        </div>
                        <div className="p-2.5 bg-blue-600/5 rounded-lg text-blue-600 border border-blue-600/10 shadow-sm">
                            <FileText size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Students</p>
                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{students.length}</h3>
                        </div>
                        <div className="p-2.5 bg-blue-600/5 rounded-lg text-blue-600 border border-blue-600/10 shadow-sm">
                            <Users size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">System Status</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <h3 className="text-xl font-bold text-green-600 tracking-tight uppercase">Operational</h3>
                            </div>
                        </div>
                        <div className="p-2.5 bg-green-600/5 rounded-lg text-green-600 border border-green-600/10 shadow-sm">
                            <Layout size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 mb-8 border-b border-gray-200">
                {['exams', 'history', 'students'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 px-2 capitalize transition-all relative text-sm font-bold tracking-wide ${activeTab === tab ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab === 'exams' ? 'Active Exams' : tab === 'history' ? 'Exam History' : 'Students List'}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 shadow-sm"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            {activeTab === 'exams' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Live Proctored Exams</h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                        >
                            <Plus size={18} /> Create Exam
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {exams.map(exam => (
                            <motion.div
                                key={exam._id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:border-blue-200 transition-all group hover:shadow-md"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{exam.title}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                {exam.duration}m
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${exam.proctoringEnabled ? 'bg-green-600/5 text-green-600 border-green-600/10' : 'bg-gray-100/50 text-gray-500 border-gray-200'}`}>
                                                {exam.proctoringEnabled ? 'Proctored' : 'Standard'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${exam.isActive ? 'bg-blue-600/5 text-blue-600 border-blue-600/10' : 'bg-red-600/5 text-red-600 border-red-600/10'}`}>
                                                {exam.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <button
                                            onClick={() => handleToggleExamStatus(exam._id)}
                                            className={`p-1.5 rounded-lg border transition-all ${exam.isActive ? 'bg-green-600/5 text-green-600 border-green-600/10 hover:bg-green-600 hover:text-white' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-600 hover:text-white'}`}
                                            title={exam.isActive ? 'Deactivate Exam' : 'Activate Exam'}
                                        >
                                            <Power size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleEditExam(exam)}
                                            className="p-1.5 bg-blue-600/5 text-blue-600 border border-blue-600/10 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                            title="Edit Exam"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteExam(exam._id)}
                                            className="p-1.5 bg-red-600/5 text-red-600 border border-red-600/10 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            title="Delete Exam"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Access Key</p>
                                        <p className="text-xl font-mono text-gray-900 font-bold tracking-[0.2em]">{exam.examKey}</p>
                                    </div>
                                    <button
                                        onClick={() => fetchResults(exam._id)}
                                        className="bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                                    >
                                        View Results
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'history' && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-6">Past Completed Exams</h2>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                                    <th className="px-6 py-4">S.No</th>
                                    <th className="px-6 py-4">Exam Title</th>
                                    <th className="px-6 py-4">Created On</th>
                                    <th className="px-6 py-4">Questions</th>
                                    <th className="px-6 py-4">Duration</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {exams.map((exam, index) => (
                                    <tr key={exam._id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{exam.title}</td>
                                        <td className="px-6 py-4 text-gray-500 text-xs font-medium">{new Date(exam.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{exam.questions.length} Qs</td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{exam.duration}m</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${exam.isActive ? 'bg-green-600/5 text-green-600 border-green-600/10' : 'bg-red-600/5 text-red-600 border-red-600/10'}`}>
                                                {exam.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => fetchResults(exam._id)}
                                                    className="text-xs font-bold uppercase tracking-widest bg-blue-600/5 text-blue-600 border border-blue-600/10 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    Report
                                                </button>
                                                <button
                                                    onClick={() => handleToggleExamStatus(exam._id)}
                                                    className={`p-1.5 rounded border transition-all ${exam.isActive ? 'bg-green-600/5 text-green-600 border-green-600/10 hover:bg-green-600' : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-600'} hover:text-white`}
                                                    title={exam.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    <Power size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleEditExam(exam)}
                                                    className="p-1.5 bg-blue-600/5 text-blue-600 border border-blue-600/10 rounded hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                    title="Edit"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteExam(exam._id)}
                                                    className="p-1.5 bg-red-600/5 text-red-600 border border-red-600/10 rounded hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
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
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-6">Registered Students</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {students.map((student) => (
                            <motion.div
                                key={student._id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => {
                                    setSelectedStudent(student);
                                    fetchStudentHistory(student._id);
                                    setShowStudentHistoryModal(true);
                                }}
                                className="bg-white border border-gray-200 p-5 rounded-xl flex items-center gap-4 cursor-pointer hover:border-blue-500 transition-all group shadow-sm hover:shadow-md"
                            >
                                <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl transition-all group-hover:border-blue-200 uppercase shadow-inner">
                                    {student.name.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-bold text-gray-900 uppercase tracking-tight truncate">{student.name}</h3>
                                    <p className="text-gray-500 text-xs font-medium truncate">{student.email}</p>
                                    <div className="mt-2 text-[10px] font-bold uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded w-fit border border-gray-200 text-gray-400">
                                        ID: {student._id.slice(-6)}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleBlock(student._id); }}
                                        className={`p-2 rounded border transition-all ${student.isBlocked ? 'bg-green-600/5 text-green-600 border-green-600/10 hover:bg-green-600 hover:text-white' : 'bg-orange-600/5 text-orange-600 border-orange-600/10 hover:bg-orange-600 hover:text-white'}`}
                                        title={student.isBlocked ? 'Unblock' : 'Block'}
                                    >
                                        {student.isBlocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student._id); }}
                                        className="p-2 bg-red-600/5 text-red-600 border border-red-600/10 rounded hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                        title="Delete"
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
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="bg-white border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-8 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{isEditing ? 'Edit Exam' : 'Create New Exam'}</h3>
                                <button onClick={() => {
                                    setShowCreateModal(false);
                                    setIsEditing(false);
                                    setEditingExamId(null);
                                    setTitle('');
                                    setDuration(30);
                                    setPassingMarks(10);
                                    setProctoring(true);
                                    setQuestions([{ questionText: '', options: ['', '', '', ''], type: 'MCQ', weightage: 1, correctAnswer: '', correctAnswers: [] }]);
                                }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSaveExam} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Exam Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="Final Year Assessment"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:border-blue-600 outline-none text-sm transition-all text-gray-900 placeholder:text-gray-300"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Duration (Min)</label>
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={e => setDuration(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:border-blue-600 outline-none text-sm transition-all text-gray-900"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Passing Marks</label>
                                        <input
                                            type="number"
                                            value={passingMarks}
                                            onChange={e => setPassingMarks(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:border-blue-600 outline-none text-sm transition-all text-gray-900"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl group cursor-pointer shadow-sm hover:border-blue-200 transition-all font-sans" onClick={() => setProctoring(!proctoring)}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${proctoring ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                                        {proctoring && <Check size={12} className="text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900 tracking-tight uppercase">Enable AI Proctoring</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Capture snapshots and detect tab switching during exam.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Exam Questions</h4>
                                        <button
                                            type="button"
                                            onClick={handleAddQuestion}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 uppercase tracking-widest bg-blue-600/5 px-3 py-1.5 rounded border border-blue-600/10 transition-all shadow-sm"
                                        >
                                            <Plus size={14} /> Add Question
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {questions.map((q, qIndex) => (
                                            <div key={qIndex} className="bg-gray-50 p-6 rounded-xl border border-gray-200 relative group/q shadow-sm hover:border-gray-300 transition-all">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newQs = questions.filter((_, i) => i !== qIndex);
                                                        setQuestions(newQs);
                                                    }}
                                                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover/q:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                                <div className="flex gap-4 mb-6">
                                                    <div className="flex-1 space-y-1.5">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Question {qIndex + 1}</label>
                                                        <input
                                                            type="text"
                                                            placeholder="State the laws of thermodynamics..."
                                                            value={q.questionText}
                                                            onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 focus:border-blue-600 outline-none text-sm transition-all text-gray-900 placeholder:text-gray-300"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="w-48 space-y-1.5">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Type</label>
                                                        <select
                                                            value={q.type}
                                                            onChange={e => handleQuestionChange(qIndex, 'type', e.target.value)}
                                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer text-gray-900"
                                                        >
                                                            <option value="MCQ">MCQ</option>
                                                            <option value="MSQ">MSQ</option>
                                                            <option value="Coding">Coding</option>
                                                        </select>
                                                    </div>
                                                    <div className="w-32 space-y-1.5">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Points</label>
                                                        <select
                                                            value={q.weightage}
                                                            onChange={e => handleQuestionChange(qIndex, 'weightage', parseInt(e.target.value))}
                                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer text-gray-900"
                                                        >
                                                            <option value={1}>1 pt</option>
                                                            <option value={2}>2 pts</option>
                                                            <option value={5}>5 pts</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {q.type !== 'Coding' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {q.options.map((opt, oIndex) => (
                                                            <div key={oIndex} className="space-y-1.5 group/opt">
                                                                <div className="flex items-center justify-between px-1">
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Option {oIndex + 1}</label>
                                                                    {q.type === 'MSQ' && (
                                                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={q.correctAnswers?.includes(opt)}
                                                                                onChange={(e) => {
                                                                                    const newCorrect = e.target.checked
                                                                                        ? [...(q.correctAnswers || []), opt]
                                                                                        : q.correctAnswers?.filter(a => a !== opt);
                                                                                    handleQuestionChange(qIndex, 'correctAnswers', newCorrect);
                                                                                }}
                                                                                className="w-3 h-3 accent-blue-600"
                                                                            />
                                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Correct</span>
                                                                        </label>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    placeholder={`Choice ${oIndex + 1}`}
                                                                    value={opt}
                                                                    onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                                    className={`w-full bg-white border rounded-lg p-3 text-sm transition-all focus:outline-none text-gray-900 ${q.correctAnswer === opt && q.type === 'MCQ' ? 'border-green-600/50 shadow-sm shadow-green-600/10 focus:border-green-600' : 'border-gray-200 focus:border-blue-600'}`}
                                                                    required
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === 'Coding' && (
                                                    <div className="space-y-5 mt-4 pt-4 border-t border-gray-100">
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Test Case Automation</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newTC = [...(q.testCases || []), { input: '', output: '', isPublic: true }];
                                                                    handleQuestionChange(qIndex, 'testCases', newTC);
                                                                }}
                                                                className="text-[10px] font-bold text-blue-600 hover:text-white bg-blue-600/5 border border-blue-600/10 px-3 py-1 rounded hover:bg-blue-600 transition-all uppercase tracking-widest"
                                                            >
                                                                + Add Test Case
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {(q.testCases || []).map((tc, tcIndex) => (
                                                                <div key={tcIndex} className="bg-white p-4 rounded-xl border border-gray-200 relative group/tc shadow-sm">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newTC = q.testCases.filter((_, i) => i !== tcIndex);
                                                                            handleQuestionChange(qIndex, 'testCases', newTC);
                                                                        }}
                                                                        className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/tc:opacity-100 transition-opacity"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                    <div className="space-y-4">
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sample Input</label>
                                                                            <textarea
                                                                                value={tc.input}
                                                                                onChange={(e) => {
                                                                                    const newTC = [...q.testCases];
                                                                                    newTC[tcIndex].input = e.target.value;
                                                                                    handleQuestionChange(qIndex, 'testCases', newTC);
                                                                                }}
                                                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-mono outline-none h-16 resize-none focus:border-blue-600 transition-all text-gray-900"
                                                                                placeholder="e.g. 5"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Expected Output</label>
                                                                            <textarea
                                                                                value={tc.output}
                                                                                onChange={(e) => {
                                                                                    const newTC = [...q.testCases];
                                                                                    newTC[tcIndex].output = e.target.value;
                                                                                    handleQuestionChange(qIndex, 'testCases', newTC);
                                                                                }}
                                                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-mono outline-none h-16 resize-none focus:border-green-600 transition-all text-gray-900"
                                                                                placeholder="e.g. 25"
                                                                                required
                                                                            />
                                                                        </div>
                                                                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={tc.isPublic}
                                                                                onChange={(e) => {
                                                                                    const newTC = [...q.testCases];
                                                                                    newTC[tcIndex].isPublic = e.target.checked;
                                                                                    handleQuestionChange(qIndex, 'testCases', newTC);
                                                                                }}
                                                                                className="w-3 h-3 accent-blue-600"
                                                                            />
                                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mark as Public</span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {q.type === 'MCQ' && (
                                                    <div className="mt-6 pt-4 border-t border-gray-100 space-y-1.5">
                                                        <label className="text-[10px] font-bold text-green-600 uppercase tracking-widest ml-1">Correct Answer</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Copy the exact correct option text here..."
                                                            value={q.correctAnswer}
                                                            onChange={e => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                                                            className="w-full bg-white border border-green-600/20 rounded-lg p-3 focus:border-green-600 outline-none text-sm transition-all text-gray-900 placeholder:text-gray-300"
                                                            required
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all active:scale-[0.99] mt-10"
                                >
                                    {isEditing ? 'Update Assessment' : 'Publish Assessment'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Results Modal */}
            <AnimatePresence>
                {showResultsModal && selectedExamResults && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="bg-white border border-gray-200 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Exam Participation Report</h3>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Sorted by Rank (Highest Score First)</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => downloadCSV(selectedExamResults, "Exam")}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20"
                                    >
                                        <Download size={16} /> Export CSV
                                    </button>
                                    <button onClick={() => setShowResultsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedExamResults.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500 font-medium italic">
                                        No results yet for this exam.
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest font-bold border-b border-gray-100">
                                                    <th className="px-6 py-4">Rank</th>
                                                    <th className="px-6 py-4">Student</th>
                                                    <th className="px-6 py-4">Score</th>
                                                    <th className="px-6 py-4">Violations</th>
                                                    <th className="px-6 py-4">Proof</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {selectedExamResults.map((result, index) => (
                                                    <tr key={result._id} className="hover:bg-gray-50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <span className={`w-7 h-7 flex items-center justify-center rounded border font-mono font-bold text-xs ${index === 0 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shadow-sm' :
                                                                index === 1 ? 'bg-gray-100 text-gray-500 border-gray-200' :
                                                                    index === 2 ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                                                                        'bg-gray-50 text-gray-400 border-gray-200'
                                                                }`}>
                                                                {index + 1}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm uppercase tracking-tight group-hover:text-blue-600 transition-colors">{result.studentId.name}</p>
                                                                <p className="text-[10px] text-gray-500 font-medium font-mono">{result.studentId.email}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg font-mono font-bold text-gray-900">{result.score}</span>
                                                                <span className="text-gray-400 font-mono text-xs">/ {result.totalPossibleScore || result.totalQuestions}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedViolationResult(result);
                                                                    setShowViolationsModal(true);
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm ${result.violations.length > 5 ? 'bg-red-600/5 text-red-600 border-red-600/10 hover:bg-red-600 hover:text-white' :
                                                                    result.violations.length > 0 ? 'bg-yellow-600/5 text-yellow-600 border-yellow-600/10 hover:bg-yellow-600 hover:text-white' :
                                                                        'bg-green-600/5 text-green-600 border-green-600/10 cursor-default'
                                                                    }`}
                                                            >
                                                                {result.violations.length} Incident{result.violations.length !== 1 ? 's' : ''}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {result.verificationPhoto ? (
                                                                <button
                                                                    onClick={() => {
                                                                        setVerificationPhotoToShow(result.verificationPhoto);
                                                                        setShowPhotoModal(true);
                                                                    }}
                                                                    className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all active:scale-95 group/img relative shadow-sm"
                                                                >
                                                                    <img src={result.verificationPhoto} alt="Student" className="w-full h-full object-cover brightness-100 group-hover/img:brightness-90" />
                                                                    <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest italic">No Photo</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${result.status === 'Pass' ? 'bg-green-600/5 text-green-600 border-green-600/10' : 'bg-red-600/5 text-red-600 border-red-600/10'}`}>
                                                                {result.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleDeleteResult(result._id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Delete Result"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Student History Modal (Admin View) */}
            <AnimatePresence>
                {showStudentHistoryModal && selectedStudent && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="bg-white border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{selectedStudent.name}'s History</h3>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1 font-mono">{selectedStudent.email}</p>
                                </div>
                                <button onClick={() => setShowStudentHistoryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                                {studentHistory.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400 italic font-medium">No assessments attempted yet.</div>
                                ) : (
                                    studentHistory.map((record) => (
                                        <div key={record._id} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm group hover:border-blue-500 transition-all">
                                            <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-50">
                                                <div>
                                                    <h4 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{record.examId?.title || 'Unknown Assessment'}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                        {new Date(record.submittedAt).toLocaleDateString()} at {new Date(record.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${record.status === 'Pass' ? 'bg-green-600/5 text-green-600 border-green-600/10' : 'bg-red-600/5 text-red-600 border-red-600/10'}`}>
                                                        {record.status}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteResult(record._id)}
                                                        className="p-1.5 bg-red-600/5 text-red-600 border border-red-600/10 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                                                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.15em] mb-1">Score</p>
                                                    <p className="text-xl font-bold text-blue-600 font-mono">{record.score} <span className="text-xs text-gray-400 font-normal">/ {record.totalPossibleScore || record.totalQuestions}</span></p>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                                                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.15em] mb-1">Duration</p>
                                                    <p className="text-xl font-bold text-gray-700 font-mono">
                                                        {Math.floor((record.timeTaken || 0) / 60)}m <span className="text-sm">{(record.timeTaken || 0) % 60}s</span>
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                                                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.15em] mb-1">Violations</p>
                                                    <p className={`text-xl font-bold font-mono ${record.violations?.length > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                                        {record.violations?.length || 0}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                                                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.15em] mb-1">Status</p>
                                                    <p className={`text-xl font-bold uppercase tracking-tight ${record.status === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>{record.status}</p>
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
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="bg-white border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-600/5 text-red-600 rounded border border-red-600/10">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Security Incident Logs</h3>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">{selectedViolationResult.studentId.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowViolationsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/30">
                                {selectedViolationResult.violations.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="bg-green-600/5 text-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-600/10">
                                            <Check size={24} />
                                        </div>
                                        <h4 className="font-bold text-gray-900 uppercase tracking-tight">Integrity Maintained</h4>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">No violations recorded for this session.</p>
                                    </div>
                                ) : (
                                    [...selectedViolationResult.violations].reverse().map((v, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl group hover:border-red-200 transition-all shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded border ${v.type === 'tab_switch' ? 'bg-orange-600/5 text-orange-600 border-orange-600/10' : 'bg-red-600/5 text-red-600 border-red-600/10'}`}>
                                                    <AlertTriangle size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm uppercase tracking-tight">{v.type.replace(/_/g, ' ')}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono font-bold uppercase">
                                                        {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            {v.screenshot && (
                                                <a
                                                    href={v.screenshot}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-white bg-blue-600/5 hover:bg-blue-600 px-3 py-1.5 rounded border border-blue-600/10 transition-all shadow-sm"
                                                >
                                                    <Eye size={12} /> Evidence
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-white flex justify-end">
                                <button
                                    onClick={() => setShowViolationsModal(false)}
                                    className="px-6 py-2 bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm"
                                >
                                    Close Logs
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Photo Verification Modal */}
            <AnimatePresence>
                {showPhotoModal && verificationPhotoToShow && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="bg-white border border-gray-200 max-w-3xl w-full rounded-xl overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Identity Authentication Proof</h3>
                                <button onClick={() => setShowPhotoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-4 bg-gray-50">
                                <img
                                    src={verificationPhotoToShow}
                                    alt="Verification Proof"
                                    className="w-full h-auto rounded-lg shadow-xl border border-gray-200"
                                />
                            </div>
                            <div className="p-6 bg-white border-t border-gray-100 flex justify-center">
                                <button
                                    onClick={() => setShowPhotoModal(false)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-lg font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 shadow-blue-600/20"
                                >
                                    Confirm Evidence
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
