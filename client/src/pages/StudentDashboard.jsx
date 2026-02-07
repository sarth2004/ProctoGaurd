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
            <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-gray-50 border border-red-100 p-10 rounded-xl shadow-2xl shadow-red-500/10"
                >
                    <div className="w-20 h-20 bg-red-600/5 text-red-600 rounded-lg flex items-center justify-center mx-auto mb-6 border border-red-600/10 shadow-sm">
                        <ShieldOff size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-4 text-gray-900 uppercase tracking-tight">Security Restriction</h2>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">
                        Your access to the portal has been restricted by the administration.
                        Please contact technical support if you believe this is an error.
                    </p>
                    <button
                        onClick={logout}
                        className="w-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98] shadow-sm"
                    >
                        Sign Out
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 p-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                        Assessment Portal
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none">Session Active: {user?.name}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm"
                >
                    <LogOut size={14} /> Terminate
                </button>
            </header>

            <div className="max-w-4xl mx-auto mt-20 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gray-50 border border-gray-200 p-10 rounded-xl shadow-2xl shadow-gray-200/50"
                >
                    <div className="w-16 h-16 bg-blue-600/5 text-blue-600 rounded border border-blue-600/10 flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Key size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 uppercase tracking-tight">Access Assessment</h2>
                    <p className="text-gray-500 text-xs mb-8 max-w-md mx-auto font-bold uppercase tracking-widest">
                        Input the secure alphanumeric token provided by your supervisor.
                    </p>

                    <form onSubmit={handleJoinExam} className="max-w-md mx-auto space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="X X X X X X"
                                value={examKey}
                                onChange={(e) => setExamKey(e.target.value.toUpperCase())}
                                className="w-full bg-white border border-gray-200 rounded-xl py-5 px-6 text-center text-3xl font-mono tracking-[0.5em] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all placeholder:tracking-normal placeholder:text-gray-200 text-blue-600 shadow-sm"
                                required
                            />
                        </div>
                        <button
                            disabled={joining}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {joining ? 'Authenticating...' : (
                                <>
                                    <Play size={16} fill="currentColor" /> Initialize Assessment
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 grid grid-cols-2 gap-4 text-left">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className="text-blue-600" />
                                <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-900">Chronometer Mode</h4>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold leading-relaxed uppercase tracking-wider">Fixed duration protocol. Auto-submission enforced upon expiry.</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield size={16} className="text-purple-600" />
                                <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-900">Proctor Guard</h4>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold leading-relaxed uppercase tracking-wider">Atmosphere and browser integrity monitored by AI engine.</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Exam History Section */}
            <div className="max-w-6xl mx-auto mt-24 mb-12">
                <div className="flex items-center justify-between mb-10 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/5 rounded border border-blue-600/10 text-blue-600 shadow-sm">
                            <FileText size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Academic History</h2>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{history.length} Completed Records</p>
                </div>

                {history.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-20 text-center text-gray-400 italic font-medium">
                        No examination records found in the database.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {history.map((record) => (
                            <motion.div
                                key={record._id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white border border-gray-200 p-6 rounded-xl hover:border-blue-500 transition-all group relative overflow-hidden shadow-sm"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                                    <div className={`absolute top-0 right-0 w-full h-full opacity-[0.05] ${record.status === 'Pass' ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="font-bold text-gray-900 text-base truncate uppercase tracking-tight group-hover:text-blue-600 transition-colors">{record.examId?.title || 'Unknown Exam'}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            {new Date(record.submittedAt).toLocaleDateString()} at {new Date(record.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${record.status === 'Pass' ? 'bg-green-600/5 text-green-600 border-green-600/10' : 'bg-red-600/5 text-red-600 border-red-600/10'}`}>
                                        {record.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center shadow-sm">
                                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-1">Score</p>
                                        <p className="text-lg font-bold text-blue-600 font-mono">{record.score} <span className="text-xs text-gray-400">/ {record.totalPossibleScore || record.totalQuestions}</span></p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center shadow-sm">
                                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-1">Alerts</p>
                                        <p className={`text-lg font-bold font-mono ${record.violations?.length > 0 ? 'text-red-500' : 'text-gray-300'}`}>{record.violations?.length || 0}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedHistory(record);
                                        setShowReviewModal(true);
                                    }}
                                    className="w-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-blue-600 hover:border-blue-600 hover:text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group/btn shadow-sm"
                                >
                                    Review Report <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Answers Modal */}
            <AnimatePresence>
                {showReviewModal && selectedHistory && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="bg-white border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Assessment Review</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-none">{selectedHistory.examId?.title}</p>
                                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                                        <p className="text-blue-600 text-[10px] font-bold uppercase tracking-widest leading-none">Score: {selectedHistory.score} / {selectedHistory.totalPossibleScore || selectedHistory.totalQuestions}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-10 text-left bg-gray-50/50">
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
                                        <div key={idx} className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm relative group">
                                            <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
                                                <div className={`absolute top-0 right-0 w-full h-full opacity-[0.03] ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`} />
                                            </div>

                                            <div className="flex justify-between items-start gap-6 mb-8">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="text-[9px] bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-gray-400 font-bold uppercase tracking-widest">{q.type || 'MCQ'}</span>
                                                        <span className="text-[9px] bg-blue-600/5 border border-blue-600/10 px-2 py-0.5 rounded text-blue-600 font-bold uppercase tracking-widest">{q.weightage || 1} Pts</span>
                                                        <span className="text-[9px] text-gray-300 font-mono font-bold uppercase ml-2">Question ID: #{idx + 1}</span>
                                                    </div>
                                                    <h4 className="font-bold text-lg text-gray-900 leading-relaxed uppercase tracking-tight">{q.questionText}</h4>
                                                </div>
                                                {isCorrect ? (
                                                    <div className="flex items-center gap-2 text-green-600 text-[10px] font-bold uppercase tracking-widest bg-green-600/5 border border-green-600/10 px-4 py-2 rounded shrink-0 shadow-sm">
                                                        <CheckCircle2 size={14} /> Validated
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-widest bg-red-600/5 border border-red-600/10 px-4 py-2 rounded shrink-0 shadow-sm">
                                                        <XCircle size={14} /> Failed
                                                    </div>
                                                )}
                                            </div>

                                            {q.type === 'Coding' && (
                                                <div className="space-y-6">
                                                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                                                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">Submitted Syntax</p>
                                                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                                                        </div>
                                                        <pre className="text-sm font-mono text-blue-600 whitespace-pre-wrap bg-white p-6 rounded-lg border border-gray-100 shadow-inner">
                                                            {studentAns || '(No Input Detected)'}
                                                        </pre>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Test Suite Analytics</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {(q.testCases || []).map((tc, tcIdx) => (
                                                                <div key={tcIdx} className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 group/tc hover:border-blue-200 transition-all shadow-sm">
                                                                    <div className="flex justify-between items-center mb-4">
                                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Case {tcIdx + 1} • {tc.isPublic ? 'Visible' : 'Encrypted'}</span>
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                                                    </div>
                                                                    <div className="text-[10px] font-mono space-y-2">
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="text-gray-500 font-bold w-12 shrink-0">INPUT:</span>
                                                                            <span className="text-gray-400 break-all">{tc.input || '(Empty)'}</span>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="text-gray-500 font-bold w-12 shrink-0">TARGET:</span>
                                                                            <span className="text-green-600 break-all">{tc.output}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {q.type !== 'Coding' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                                className={`p-5 rounded-xl border transition-all relative overflow-hidden shadow-sm ${isCorrectOpt ? 'bg-green-600/5 border-green-600/20 text-green-600' :
                                                                    isSelected ? 'bg-red-600/5 border-red-600/20 text-red-600' :
                                                                        'bg-gray-50 border-gray-200 text-gray-500'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-4 relative z-10">
                                                                    <span className={`w-6 h-6 flex items-center justify-center rounded border text-[10px] font-mono font-bold ${isCorrectOpt ? 'border-green-600/20 bg-green-600/10' :
                                                                        isSelected ? 'border-red-600/20 bg-red-600/10' :
                                                                            'border-gray-200 bg-white'
                                                                        }`}>
                                                                        {String.fromCharCode(65 + optIdx)}
                                                                    </span>
                                                                    <span className="text-sm font-bold uppercase tracking-tight">{option}</span>

                                                                    {isSelected && (
                                                                        <div className="ml-auto flex items-center gap-1.5">
                                                                            {!isCorrectOpt && <span className="text-[8px] font-bold uppercase tracking-widest text-red-600/60">Mistake</span>}
                                                                            <div className={`w-1 h-1 rounded-full ${isCorrectOpt ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                        </div>
                                                                    )}
                                                                    {isCorrectOpt && !isSelected && (
                                                                        <div className="ml-auto flex items-center gap-1.5">
                                                                            <span className="text-[8px] font-bold uppercase tracking-widest text-green-600/60">Expected</span>
                                                                            <div className="w-1 h-1 rounded-full bg-green-500" />
                                                                        </div>
                                                                    )}
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
