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
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-900/50 border border-gray-800 p-10 rounded-3xl max-w-lg w-full text-center"
                >
                    <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Exam Completed</h2>
                    <p className="text-gray-400 mb-8">Your responses have been recorded.</p>

                    <div className="bg-black/50 p-6 rounded-2xl border border-gray-800 mb-8 grid grid-cols-2 gap-4">
                        <div className="text-left">
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Your Score</p>
                            <p className="text-3xl font-bold text-blue-400">{result.score} / {result.totalQuestions}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Status</p>
                            <p className={`text-3xl font-bold ${result.status === 'Pass' ? 'text-green-500' : 'text-red-500'}`}>{result.status}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-full bg-gray-800 hover:bg-gray-700 py-4 rounded-xl font-bold transition-all"
                    >
                        Return to Dashboard
                    </button>
                </motion.div>
            </div>
        )
    }

    const currentQuestion = exam.questions[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Exam Header */}
            <header className="fixed top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex justify-between items-center z-40">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-widest">Live Exam</div>
                    <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">{exam.title}</h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-lg border border-red-500/20">
                        <Clock size={18} />
                        <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
                    </div>
                    {exam.proctoringEnabled && (
                        <div className="hidden md:flex items-center gap-2 text-green-500 text-sm font-medium">
                            <Shield size={16} /> Proctoring Active
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
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-gray-900/30 border border-gray-800 p-8 rounded-3xl"
                        >
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-gray-500 text-sm font-bold uppercase">Question {currentQuestionIndex + 1} of {exam.questions.length}</p>
                                    <div className="flex gap-2">
                                        <span className="bg-gray-800 text-[10px] font-bold px-2 py-0.5 rounded text-gray-400 uppercase">{currentQuestion.type || 'MCQ'}</span>
                                        <span className="bg-blue-500/10 text-[10px] font-bold px-2 py-0.5 rounded text-blue-400 uppercase">{currentQuestion.weightage || 1} Mark</span>
                                    </div>
                                </div>
                                {currentQuestion.type === 'Coding' && currentQuestion.sampleInput && (
                                    <div className="bg-black/50 p-4 rounded-xl border border-gray-800 mb-6">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Scenario / Sample Input</p>
                                        <pre className="text-sm font-mono text-blue-300 whitespace-pre-wrap">{currentQuestion.sampleInput}</pre>
                                    </div>
                                )}
                                <h2 className="text-2xl font-medium leading-relaxed">{currentQuestion.questionText}</h2>
                                {currentQuestion.type === 'MSQ' && <p className="text-xs text-blue-400 mt-2 italic">* Multiple Selection Allowed</p>}
                            </div>

                            <div className="space-y-4 text-left">
                                {currentQuestion.type === 'Coding' ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-gray-800">
                                            <label className="text-xs text-gray-500 uppercase font-bold">Python Code (3.x)</label>
                                            <button
                                                onClick={handleRunCode}
                                                disabled={isRunning}
                                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                            >
                                                {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                                                Run Public Tests
                                            </button>
                                        </div>
                                        <textarea
                                            value={answers[currentQuestionIndex] || ''}
                                            onChange={(e) => setAnswers({ ...answers, [currentQuestionIndex]: e.target.value })}
                                            placeholder="# Write your Python code here... (e.g. print('Hello World'))"
                                            className="w-full h-80 bg-black/50 border border-gray-800 rounded-2xl p-6 font-mono text-blue-100 focus:border-blue-500 outline-none resize-none shadow-inner text-sm"
                                        />

                                        {/* Test Results Display */}
                                        {testResults[currentQuestionIndex] && (
                                            <div className="space-y-3 mt-6">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                                    <Bug size={14} /> Test Case Results
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {testResults[currentQuestionIndex].map((tr, i) => (
                                                        <div key={i} className={`p-4 rounded-xl border ${tr.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Test Case {i + 1}</span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${tr.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                    {tr.passed ? 'Passed' : 'Failed'}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1 text-[11px] font-mono">
                                                                <p className="text-gray-500">Input: <span className="text-gray-300">{tr.input || '(Empty)'}</span></p>
                                                                <p className="text-gray-500">Expected: <span className="text-green-500">{tr.expected}</span></p>
                                                                {!tr.passed && <p className="text-gray-500">Actual: <span className="text-red-500">{tr.actual.trim() || '(No Output)'}</span></p>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-gray-600 italic">* Automated grading is based on multiple test cases (including hidden ones).</p>
                                    </div>
                                ) : (
                                    currentQuestion.options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionSelect(option)}
                                            className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between group ${(currentQuestion.type === 'MSQ'
                                                ? answers[currentQuestionIndex]?.includes(option)
                                                : answers[currentQuestionIndex] === option)
                                                ? 'bg-blue-600/20 border-blue-500'
                                                : 'bg-white/5 border-gray-800 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold border ${(currentQuestion.type === 'MSQ'
                                                    ? answers[currentQuestionIndex]?.includes(option)
                                                    : answers[currentQuestionIndex] === option)
                                                    ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-700 text-gray-400 group-hover:border-gray-500'
                                                    }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                <span className="text-lg">{option}</span>
                                            </div>
                                            {(currentQuestion.type === 'MSQ'
                                                ? answers[currentQuestionIndex]?.includes(option)
                                                : answers[currentQuestionIndex] === option) && <CheckCircle2 size={24} className="text-blue-500" />}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        <div className="flex justify-between mt-8">
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-all font-bold"
                            >
                                <ChevronLeft size={20} /> Previous
                            </button>
                            {currentQuestionIndex === exam.questions.length - 1 ? (
                                <button
                                    onClick={handleSubmit}
                                    className="px-10 py-3 rounded-xl bg-green-600 hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-900/20"
                                >
                                    Finish & Submit
                                </button>
                            ) : (
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-bold"
                                >
                                    Next <ChevronRight size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Navigation Grids */}
                    <div className="space-y-6">
                        <div className="bg-gray-900/30 border border-gray-800 p-6 rounded-3xl">
                            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-gray-500">Question Palette</h3>
                            <div className="grid grid-cols-5 gap-3">
                                {exam.questions.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${currentQuestionIndex === idx ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''
                                            } ${answers[idx] ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-gray-800 text-gray-400'
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {violations.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl">
                                <div className="flex items-center gap-2 text-red-500 mb-2">
                                    <AlertTriangle size={18} />
                                    <h4 className="font-bold">Security Alerts</h4>
                                </div>
                                <p className="text-xs text-red-500/70 mb-4 font-medium uppercase tracking-tighter">Violations: {violations.length}</p>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {violations.slice().reverse().map((v, i) => (
                                        <div key={i} className="text-[10px] text-red-400 bg-red-500/5 p-2 rounded border border-red-500/10">
                                            {v.type} at {new Date(v.timestamp).toLocaleTimeString()}
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
                <div className="fixed bottom-6 right-6 w-48 h-36 bg-gray-900 rounded-2xl border-2 border-green-500/30 overflow-hidden shadow-2xl z-50">
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isModelLoaded ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                            {isModelLoaded ? 'Live Monitor' : 'Initializing...'}
                        </span>
                    </div>

                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover grayscale brightness-75 transition-all"
                    />

                    {!isModelLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <Shield size={24} className="text-gray-500 animate-spin" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
