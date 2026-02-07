import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await login(email, password, secretKey);
            toast.success(`Welcome back, ${data.user.name}`);
            if (data.user.role === 'admin') navigate('/admin/dashboard');
            else navigate('/student/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login Failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 px-4">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md bg-gray-50 rounded-xl p-8 border border-gray-200 shadow-2xl shadow-gray-200/50"
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Digitron Exam Portal
                    </h2>
                    <p className="text-gray-500 mt-2 text-sm uppercase tracking-wider font-semibold">Sign in to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-600 transition-all text-sm text-gray-900 placeholder:text-gray-300 shadow-sm"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-600 transition-all text-sm text-gray-900 placeholder:text-gray-300 shadow-sm"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 py-1 px-1 group cursor-pointer" onClick={() => setIsAdminLogin(!isAdminLogin)}>
                        <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isAdminLogin ? 'bg-blue-600 border-blue-600 shadow-sm' : 'bg-white border-gray-300 group-hover:border-gray-400 shadow-sm'}`}>
                            {isAdminLogin && <LogIn size={12} className="text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-600">Login as Administrator</span>
                    </div>

                    {isAdminLogin && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-1.5 pt-1"
                        >
                            <label className="text-xs font-bold text-blue-600 uppercase ml-1">Admin Secret Key</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                                <input
                                    type="password"
                                    placeholder="Enter secret key"
                                    value={secretKey}
                                    onChange={(e) => setSecretKey(e.target.value)}
                                    className="w-full bg-white border border-blue-200 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-600 transition-all text-sm text-blue-700 placeholder-blue-300 shadow-sm"
                                    required
                                />
                            </div>
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-600/20 text-sm uppercase tracking-widest mt-2 active:scale-[0.98]"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-blue-600 hover:text-blue-500 font-bold ml-1">
                            Create Account
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
