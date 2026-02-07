import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Shield, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, Play, Loader2, Bug } from 'lucide-react';
import toast from 'react-hot-toast';
import * as faceapi from 'face-api.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ExamPortal() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { examId } = useParams();
    const exam = state?.exam;

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(exam?.duration * 60 || 0);
    const [violations, setViolations] = useState([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [startTime] = useState(Date.now());
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState({}); // { qIndex: [{ passed, input, output, actual }] }
    const [verificationPhoto, setVerificationPhoto] = useState(null);

    const timerRef = useRef(null);
    const videoRef = useRef(null);
    const faceDetectionInterval = useRef(null);

    // Load Face-API Models
    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setIsModelLoaded(true);
                startVideo();
            } catch (error) {
                console.error("Error loading face-api models:", error);
                toast.error("Failed to initialize AI Proctoring. Check connection.");
            }
        };

        if (exam?.proctoringEnabled) {
            loadModels();
        }

        return () => {
            stopVideo();
            if (faceDetectionInterval.current) clearInterval(faceDetectionInterval.current);
        };
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch(err => {
                console.error("Error accessing webcam:", err);
                toast.error("Webcam access is required for this exam.");
            });
    };

    const stopVideo = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    // Real-time Face Detection
    useEffect(() => {
        if (isModelLoaded && exam?.proctoringEnabled && !isSubmitted) {
            faceDetectionInterval.current = setInterval(async () => {
                if (!videoRef.current) return;

                const detections = await faceapi.detectAllFaces(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions()
                );

                if (detections.length === 0) {
                    addViolation('Face Not Detected');
                } else if (detections.length > 1) {
                    addViolation('Multiple Faces Detected');
                }
            }, 5000); // Check every 5 seconds
        }

        return () => {
            if (faceDetectionInterval.current) clearInterval(faceDetectionInterval.current);
        };
    }, [isModelLoaded, exam, isSubmitted]);

    const captureVerificationPhoto = () => {
        if (!videoRef.current || verificationPhoto) return;

        try {
            const canvas = document.createElement('canvas');
            // Wait for video to be ready if needed
            if (!videoRef.current.videoWidth) return;

            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setVerificationPhoto(dataUrl);
            console.log("Verification photo captured");
        } catch (err) {
            console.error("Failed to capture verification photo:", err);
        }
    };

    // Auto-capture verification photo once proctoring starts
    useEffect(() => {
        if (isModelLoaded && exam?.proctoringEnabled && !verificationPhoto) {
            const timer = setTimeout(() => {
                captureVerificationPhoto();
            }, 3000); // Give 3 seconds for student to settle
            return () => clearTimeout(timer);
        }
    }, [isModelLoaded, exam, verificationPhoto]);

    const addViolation = (type) => {
        const newViolation = { type, timestamp: new Date() };
        setViolations(prev => [...prev, newViolation]);
        toast.error(`Security Warning: ${type}!`, {
            icon: '⚠️',
            style: { border: '1px solid #ef4444', padding: '16px', color: '#ef4444', background: '#000' }
        });
    };

    // Tab Switching Detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !isSubmitted) {
                addViolation('Tab Switched');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isSubmitted]);

    // Fullscreen Enforcement
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !isSubmitted) {
                addViolation('Left Fullscreen');
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [isSubmitted]);

    // Timer Logic
    useEffect(() => {
        if (timeLeft > 0 && !isSubmitted) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && !isSubmitted) {
            handleSubmit();
        }

        return () => clearInterval(timerRef.current);
    }, [timeLeft, isSubmitted]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (option) => {
        const currentQ = exam.questions[currentQuestionIndex];
        if (currentQ.type === 'MSQ') {
            const currentAns = answers[currentQuestionIndex] || [];
            if (currentAns.includes(option)) {
                setAnswers({ ...answers, [currentQuestionIndex]: currentAns.filter(a => a !== option) });
            } else {
                setAnswers({ ...answers, [currentQuestionIndex]: [...currentAns, option] });
            }
        } else {
            setAnswers({ ...answers, [currentQuestionIndex]: option });
        }
    };

    const handleRunCode = async () => {
        const currentQ = exam.questions[currentQuestionIndex];
        const studentCode = answers[currentQuestionIndex] || '';

        if (!studentCode.trim()) return toast.error('Please write some code first');

        setIsRunning(true);
        const publicTC = currentQ.testCases?.filter(tc => tc.isPublic) || [];

        try {
            const results = [];
            for (const tc of publicTC) {
                const res = await axios.post(`${API_URL}/api/exams/run-code`, {
                    code: studentCode,
                    input: tc.input
                });
                results.push({
                    passed: res.data.success && res.data.output.trim() === tc.output.trim(),
                    input: tc.input,
                    expected: tc.output,
                    actual: res.data.output
                });
            }
            setTestResults({ ...testResults, [currentQuestionIndex]: results });
            toast.success('Run Completed');
        } catch (err) {
            toast.error('Code execution failed');
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        if (isSubmitted) return;
        setIsSubmitted(true);
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);

        try {
            const response = await axios.post(`${API_URL}/api/exams/submit`, {
                examId: exam._id,
                answers,
                timeTaken,
                verificationPhoto
            });
            setResult(response.data);
            toast.success('Exam Submitted Successfully');
        } catch (error) {
            toast.error('Submission Failed');
            setIsSubmitted(false); // Let them try again?
        }
    };

    if (!exam) return <div className="text-white p-20 text-center">Invalid Exam Session. Please go back.</div>;

    if (isSubmitted && result) {
        return (
            <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-50 border border-gray-200 p-10 rounded-xl max-w-lg w-full text-center shadow-2xl shadow-gray-200/50"
                >
                    <div className="w-20 h-20 bg-green-600/5 text-green-600 rounded border border-green-600/10 flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 uppercase tracking-tight text-gray-900">Assessment Concluded</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-10">All responses have been securely archived.</p>

                    <div className="bg-white p-8 rounded-xl border border-gray-200 mb-10 grid grid-cols-2 gap-8 text-center shadow-sm">
                        <div>
                            <p className="text-gray-400 text-[9px] uppercase tracking-widest font-bold mb-2">Final Evaluation</p>
                            <p className="text-3xl font-bold text-blue-600 font-mono">{result.score} <span className="text-sm text-gray-300">/ {result.totalQuestions}</span></p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[9px] uppercase tracking-widest font-bold mb-2">Integrity Status</p>
                            <p className={`text-xl font-bold uppercase tracking-tight ${result.status === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>{result.status}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98] shadow-sm"
                    >
                        Return to Control Panel
                    </button>
                </motion.div>
            </div>
        )
    }

    const currentQuestion = exam.questions[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col">
            {/* Exam Header */}
            <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center z-40 shadow-xl shadow-gray-200/20">
                <div className="flex items-center gap-6">
                    <div className="bg-blue-600/5 text-blue-600 border border-blue-600/10 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm">
                        Live Protocol
                    </div>
                    <div className="h-4 w-[1px] bg-gray-100" />
                    <h1 className="text-sm font-bold text-gray-900 uppercase tracking-tight truncate max-w-[200px] md:max-w-md">{exam.title}</h1>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 bg-red-600/5 text-red-600 px-5 py-2.5 rounded-lg border border-red-600/10 shadow-sm transition-all hover:bg-red-600/10">
                        <Clock size={16} />
                        <span className="font-mono text-2xl font-bold tracking-tight">{formatTime(timeLeft)}</span>
                    </div>
                    {exam.proctoringEnabled && (
                        <div className="hidden md:flex items-center gap-2 bg-green-600/5 text-green-600 border border-green-600/10 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            <Shield size={14} /> Proctor Active
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 mt-24 mb-24 px-6 md:px-20 lg:px-40 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 h-full">
                    {/* Questions Section */}
                    <div className="lg:col-span-2">
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ x: 10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-gray-50 border border-gray-200 p-10 rounded-xl shadow-xl shadow-gray-200/30"
                        >
                            <div className="mb-10">
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Matrix Entry {currentQuestionIndex + 1} / {exam.questions.length}</p>
                                    <div className="flex gap-3">
                                        <span className="bg-white border border-gray-200 text-[10px] font-bold px-3 py-1 rounded text-gray-400 uppercase tracking-widest shadow-sm">{currentQuestion.type || 'MCQ'}</span>
                                        <span className="bg-blue-600/5 border border-blue-600/10 text-[10px] font-bold px-3 py-1 rounded text-blue-600 uppercase tracking-widest shadow-sm">{currentQuestion.weightage || 1} Marks</span>
                                    </div>
                                </div>
                                {currentQuestion.type === 'Coding' && currentQuestion.sampleInput && (
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8 shadow-inner">
                                        <p className="text-[10px] text-gray-300 uppercase font-bold tracking-widest mb-3">Kernel Parameters / Sample Input</p>
                                        <pre className="text-sm font-mono text-blue-600 whitespace-pre-wrap leading-relaxed">{currentQuestion.sampleInput}</pre>
                                    </div>
                                )}
                                <h2 className="text-xl font-bold text-gray-900 leading-relaxed uppercase tracking-tight">{currentQuestion.questionText}</h2>
                                {currentQuestion.type === 'MSQ' && <div className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest mt-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Multi-Select Subroutine Active
                                </div>}
                            </div>

                            <div className="space-y-4 text-left">
                                {currentQuestion.type === 'Coding' ? (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">Python Syntax Processor (3.x)</label>
                                            </div>
                                            <button
                                                onClick={handleRunCode}
                                                disabled={isRunning}
                                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                                            >
                                                {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                                                Execute Trace
                                            </button>
                                        </div>
                                        <textarea
                                            value={answers[currentQuestionIndex] || ''}
                                            onChange={(e) => setAnswers({ ...answers, [currentQuestionIndex]: e.target.value })}
                                            placeholder="# Initialize algorithm here..."
                                            className="w-full h-80 bg-white border border-gray-200 rounded-xl p-8 font-mono text-blue-600 focus:border-blue-700 focus:ring-4 focus:ring-blue-600/5 outline-none resize-none shadow-inner text-sm leading-relaxed selection:bg-blue-500/10 placeholder:text-gray-200"
                                        />

                                        {/* Test Results Display */}
                                        {testResults[currentQuestionIndex] && (
                                            <div className="space-y-4 pt-4">
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-3 ml-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200" /> Trace Results Console
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {testResults[currentQuestionIndex].map((tr, i) => (
                                                        <div key={i} className={`p-6 rounded-xl border transition-all ${tr.passed ? 'bg-green-600/5 border-green-600/20 shadow-sm' : 'bg-red-600/5 border-red-600/20 shadow-sm'}`}>
                                                            <div className="flex justify-between items-center mb-4">
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Case ID: 0x{i + 1}</span>
                                                                <span className={`text-[8px] font-bold px-3 py-0.5 rounded uppercase tracking-widest border ${tr.passed ? 'bg-green-600/10 text-green-600 border-green-600/20' : 'bg-red-600/10 text-red-600 border-red-600/20'}`}>
                                                                    {tr.passed ? 'Verified' : 'Failed'}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2 text-[10px] font-mono leading-relaxed">
                                                                <div className="flex gap-2">
                                                                    <span className="text-gray-300 font-bold w-12 shrink-0">INPUT:</span>
                                                                    <span className="text-gray-500">{tr.input || '(Empty)'}</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <span className="text-gray-300 font-bold w-12 shrink-0">TARGET:</span>
                                                                    <span className="text-green-600">{tr.expected}</span>
                                                                </div>
                                                                {!tr.passed && (
                                                                    <div className="flex gap-2 pt-1 border-t border-gray-100 mt-1">
                                                                        <span className="text-gray-300 font-bold w-12 shrink-0">OUTPUT:</span>
                                                                        <span className="text-red-500 italic">{tr.actual.trim() || '(Null)'}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-1">* Final validation involves a proprietary hidden test suite.</p>
                                    </div>
                                ) : (
                                    currentQuestion.options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionSelect(option)}
                                            className={`w-full text-left p-6 rounded-xl border transition-all flex items-center justify-between group relative overflow-hidden ${(currentQuestion.type === 'MSQ'
                                                ? answers[currentQuestionIndex]?.includes(option)
                                                : answers[currentQuestionIndex] === option)
                                                ? 'bg-blue-600/5 border-blue-600 shadow-lg shadow-blue-600/10'
                                                : 'bg-white border-gray-200 hover:border-gray-400 shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-center gap-5 relative z-10">
                                                <span className={`w-8 h-8 rounded border flex items-center justify-center font-mono font-bold transition-all ${(currentQuestion.type === 'MSQ'
                                                    ? answers[currentQuestionIndex]?.includes(option)
                                                    : answers[currentQuestionIndex] === option)
                                                    ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-400 group-hover:border-gray-300'
                                                    }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                <span className={`text-base font-bold uppercase tracking-tight transition-colors ${(currentQuestion.type === 'MSQ'
                                                    ? answers[currentQuestionIndex]?.includes(option)
                                                    : answers[currentQuestionIndex] === option)
                                                    ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-900'
                                                    }`}>{option}</span>
                                            </div>
                                            {(currentQuestion.type === 'MSQ'
                                                ? answers[currentQuestionIndex]?.includes(option)
                                                : answers[currentQuestionIndex] === option) && (
                                                    <div className="flex items-center gap-2 bg-blue-600/5 border border-blue-600/10 px-3 py-1 rounded text-[10px] font-bold text-blue-600 uppercase tracking-widest relative z-10">
                                                        <CheckCircle2 size={12} /> Committed
                                                    </div>
                                                )}
                                        </button>
                                    ))
                                )}
                                tunic
                            </div>
                        </motion.div>

                        <div className="flex justify-between mt-10">
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-20 transition-all shadow-lg shadow-gray-200/20"
                            >
                                <ChevronLeft size={16} /> Previous Trace
                            </button>
                            {currentQuestionIndex === exam.questions.length - 1 ? (
                                <button
                                    onClick={handleSubmit}
                                    className="px-12 py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-600/20 transition-all active:scale-[0.98]"
                                >
                                    Transmit Result
                                </button>
                            ) : (
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                                    className="flex items-center gap-2 px-10 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]"
                                >
                                    Next Phase <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Navigation Grids */}
                    <div className="space-y-6">
                        <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-lg shadow-gray-200/20">
                            <h3 className="font-bold mb-6 text-[10px] uppercase tracking-[0.25em] text-gray-300">Sync Palette</h3>
                            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
                                {exam.questions.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={`w-full aspect-square rounded-lg flex items-center justify-center font-bold text-[10px] transition-all border ${currentQuestionIndex === idx ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30' :
                                            answers[idx] ? 'bg-green-600/5 text-green-600 border-green-600/10' :
                                                'bg-gray-50 border-gray-100 text-gray-300 hover:border-gray-300'
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {violations.length > 0 && (
                            <div className="bg-red-600/5 border border-red-600/10 p-8 rounded-xl shadow-lg shadow-red-200/20">
                                <div className="flex items-center gap-3 text-red-600 mb-6">
                                    <AlertTriangle size={16} />
                                    <h4 className="font-bold text-[10px] uppercase tracking-widest">Integrity Alerts</h4>
                                </div>
                                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {violations.slice().reverse().map((v, i) => (
                                        <div key={i} className="text-[9px] font-bold uppercase tracking-widest text-red-600 bg-white p-3 rounded border border-red-100 flex justify-between items-center group hover:bg-red-50 transition-all shadow-sm">
                                            <span>{v.type.replace(/_/g, ' ')}</span>
                                            <span className="text-gray-300 font-mono text-[8px]">{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Webcam / Proctoring Overlay */}
            {exam.proctoringEnabled && (
                <div className="fixed bottom-10 right-10 w-56 h-40 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xl z-50 group">
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/80 border border-gray-100 backdrop-blur-md px-3 py-1 rounded shadow-sm z-10">
                        <div className={`w-1.5 h-1.5 rounded-full ${isModelLoaded ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`} />
                        <span className="text-[9px] font-bold text-gray-900 uppercase tracking-[0.2em]">
                            {isModelLoaded ? 'Sensor Live' : 'Initializing...'}
                        </span>
                    </div>

                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover grayscale brightness-110 contrast-125 transition-all group-hover:brightness-100 group-hover:grayscale-0"
                    />

                    {!isModelLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-300 gap-3">
                            <Shield size={24} className="animate-spin opacity-20" />
                            <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Booting Secure Layer</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
