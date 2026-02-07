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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Exam Portal
                    </h2>
                    <p className="text-gray-400 mt-2">Sign in to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAdminLogin(!isAdminLogin)}>
                        <div className={`w-5 h-5 rounded border border-gray-500 flex items-center justify-center ${isAdminLogin ? 'bg-purple-600 border-purple-600' : ''}`}>
                            {isAdminLogin && <div className="w-3 h-3 bg-white rounded-sm" />}
                        </div>
                        <span className="text-sm text-gray-400">Login as Admin</span>
                    </div>

                    {isAdminLogin && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="relative"
                        >
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={20} />
                            <input
                                type="password"
                                placeholder="Admin Secret Key"
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                className="w-full bg-purple-900/20 border border-purple-500/50 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 transition-colors text-purple-100 placeholder-purple-300/50"
                                required
                            />
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} />
                        Sign In
                    </button>
                </form>

                <p className="mt-6 text-center text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-400 hover:underline">
                        Register
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
