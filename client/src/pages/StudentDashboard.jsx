import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Key, Clock, FileText, Play, CheckCircle2, XCircle, ChevronRight, X, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StudentDashboard() {
    const { user, logout, loading } = useAuth();
    const [examKey, setExamKey] = useState('');
    const [joining, setJoining] = useState(false);
    const [history, setHistory] = useState([]);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const navigate = useNavigate();

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/exams/student-history`);
            setHistory(res.data);
        } catch (error) {
            console.error('History fetch error:', error);
            toast.error('Failed to fetch history');
        }
    };

    useEffect(() => {
        if (!loading && user) {
            fetchHistory();
        }
    }, [loading, user]);

    const handleJoinExam = async (e) => {
        e.preventDefault();
        setJoining(true);
        try {
            const res = await axios.post(`${API_URL}/api/exams/verify-key`, { examKey });
            toast.success(`Exam Found: ${res.data.title}`);
            // Navigate to Exam Portal with exam details
            navigate(`/exam/${res.data._id}`, { state: { exam: res.data } });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid Exam Key');
        } finally {
            setJoining(false);
        }
    };

    if (user?.isBlocked) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-gray-900 border border-red-500/30 p-10 rounded-3xl"
                >
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldOff size={40} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-red-500">Account Blocked</h2>
                    <p className="text-gray-400 mb-8">
                        Your account has been restricted by the administrator due to policy violations.
                        Please contact your instructor or the technical support team.
                    </p>
                    <button
                        onClick={logout}
                        className="w-full bg-gray-800 hover:bg-gray-700 py-4 rounded-xl font-bold transition-colors"
                    >
                        Sign Out
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 pb-6 border-b border-gray-800">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Student Portal
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

            <div className="max-w-4xl mx-auto mt-20 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gray-900/50 border border-gray-800 p-10 rounded-3xl shadow-2xl backdrop-blur-md"
                >
                    <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Key size={40} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Enter Exam Key</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                        Please enter the unique alphanumeric key provided by your instructor to start your examination.
                    </p>

                    <form onSubmit={handleJoinExam} className="max-w-md mx-auto space-y-4">
                        <input
                            type="text"
                            placeholder="E.g. A1B2C3"
                            value={examKey}
                            onChange={(e) => setExamKey(e.target.value.toUpperCase())}
                            className="w-full bg-black border border-gray-700 rounded-xl py-4 px-6 text-center text-2xl font-mono tracking-[0.5em] focus:border-blue-500 outline-none transition-all placeholder:tracking-normal placeholder:text-gray-700"
                            required
                        />
                        <button
                            disabled={joining}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {joining ? 'Verifying...' : (
                                <>
                                    <Play size={20} fill="currentColor" /> Start Exam
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 grid grid-cols-2 gap-4 text-left">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <Clock size={20} className="text-blue-400 mb-2" />
                            <h4 className="font-semibold text-sm">Strict Timing</h4>
                            <p className="text-xs text-gray-500 mt-1">Exams have fixed timers. Auto-submit on expiry.</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <Shield size={20} className="text-purple-400 mb-2" />
                            <h4 className="font-semibold text-sm">AI Proctoring</h4>
                            <p className="text-xs text-gray-500 mt-1">Movement and tab switching is monitored.</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Exam History Section */}
            <div className="max-w-6xl mx-auto mt-20">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                        <FileText size={24} />
                    </div>
                    <h2 className="text-2xl font-bold">Your Exam History</h2>
                </div>

                {history.length === 0 ? (
                    <div className="bg-gray-900/30 border border-gray-800 rounded-3xl p-12 text-center text-gray-500">
                        You haven't attempted any exams yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {history.map((record) => (
                            <motion.div
                                key={record._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl hover:border-gray-700 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg truncate mb-1">{record.examId?.title || 'Unknown Exam'}</h3>
                                        <p className="text-xs text-gray-500">{new Date(record.submittedAt).toLocaleDateString()} at {new Date(record.submittedAt).toLocaleTimeString()}</p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${record.status === 'Pass' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        {record.status}
                                    </div>
                                </div>

                                <div className="bg-black/50 p-4 rounded-xl border border-gray-800 mb-6 grid grid-cols-2 gap-2 text-center">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Score</p>
                                        <p className="text-xl font-bold text-blue-400">{record.score} / {record.totalPossibleScore || record.totalQuestions}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Violations</p>
                                        <p className="text-xl font-bold text-red-400">{record.violations?.length || 0}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedHistory(record);
                                        setShowReviewModal(true);
                                    }}
                                    className="w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    Review Answers <ChevronRight size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Answers Modal */}
            <AnimatePresence>
                {showReviewModal && selectedHistory && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                                <div>
                                    <h3 className="text-xl font-bold">{selectedHistory.examId?.title} - Review</h3>
                                    <p className="text-sm text-gray-500">Score: {selectedHistory.score} / {selectedHistory.totalPossibleScore || selectedHistory.totalQuestions}</p>
                                </div>
                                <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-white p-2">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                                {selectedHistory.examId?.questions.map((q, idx) => {
                                    const studentAns = selectedHistory.answers[idx];
                                    const isMSQ = q.type === 'MSQ';

                                    let isCorrect = false;
                                    if (isMSQ) {
                                        const sAns = Array.isArray(studentAns) ? studentAns : [];
                                        const cAns = q.correctAnswers || [];
                                        isCorrect = sAns.length === cAns.length &&
                                            sAns.every(val => cAns.includes(val)) &&
                                            cAns.every(val => sAns.includes(val));
                                    } else {
                                        isCorrect = studentAns === q.correctAnswer;
                                    }

                                    return (
                                        <div key={idx} className="bg-black/30 border border-gray-800 p-6 rounded-2xl">
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400 font-bold uppercase">{q.type || 'MCQ'}</span>
                                                        <span className="text-[10px] bg-blue-500/10 px-2 py-0.5 rounded text-blue-400 font-bold uppercase">{q.weightage || 1} Mark</span>
                                                    </div>
                                                    <h4 className="font-semibold text-lg">{idx + 1}. {q.questionText}</h4>
                                                </div>
                                                {isCorrect ? (
                                                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded shrink-0">
                                                        <CheckCircle2 size={14} /> Correct
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-red-500 text-xs font-bold bg-red-500/10 px-2 py-1 rounded shrink-0">
                                                        <XCircle size={14} /> Incorrect
                                                    </div>
                                                )}
                                            </div>

                                            {q.type === 'Coding' && (
                                                <div className="space-y-4">
                                                    <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Student Submission</p>
                                                        <pre className="text-sm font-mono text-blue-300 whitespace-pre-wrap bg-black/30 p-4 rounded-lg">
                                                            {studentAns || '(No Answer Provided)'}
                                                        </pre>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold text-gray-500 uppercase">Automated Grading Results</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {(q.testCases || []).map((tc, tcIdx) => {
                                                                // Note: Since we can't rerun code here without another API, 
                                                                // we just show the test cases and mark passed if everything matched in backend
                                                                return (
                                                                    <div key={tcIdx} className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-[9px] text-gray-500 font-bold uppercase">Test Case {tcIdx + 1} {tc.isPublic ? '(Public)' : '(Hidden)'}</span>
                                                                        </div>
                                                                        <div className="text-[10px] font-mono space-y-1">
                                                                            <p className="text-gray-500">Input: <span className="text-gray-400">{tc.input || '(None)'}</span></p>
                                                                            <p className="text-gray-500">Expected: <span className="text-green-500">{tc.output}</span></p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {q.type !== 'Coding' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {q.options.map((option, optIdx) => {
                                                        const isSelected = isMSQ
                                                            ? (Array.isArray(studentAns) && studentAns.includes(option))
                                                            : studentAns === option;

                                                        const isCorrectOpt = isMSQ
                                                            ? q.correctAnswers?.includes(option)
                                                            : q.correctAnswer === option;

                                                        return (
                                                            <div
                                                                key={optIdx}
                                                                className={`p-3 rounded-xl border text-sm transition-all ${isCorrectOpt ? 'bg-green-500/10 border-green-500/50 text-green-400' :
                                                                    isSelected ? 'bg-red-500/10 border-red-500/50 text-red-400' :
                                                                        'bg-gray-800/20 border-gray-800 text-gray-500'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="opacity-50 font-mono">{String.fromCharCode(65 + optIdx)}.</span>
                                                                    {option}
                                                                    {isSelected && !isCorrectOpt && <span className="text-[10px] font-bold uppercase ml-auto">(Your Answer)</span>}
                                                                    {isCorrectOpt && <span className="text-[10px] font-bold uppercase ml-auto">(Correct)</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Internal Icons for helper component
function Shield({ size, className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    )
}
