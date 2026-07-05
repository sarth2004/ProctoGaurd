import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-surface border border-border text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shadow-sm flex items-center justify-center relative overflow-hidden"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
            <div className="relative w-5 h-5">
                <motion.div
                    initial={false}
                    animate={{
                        y: theme === 'light' ? 0 : 30,
                        opacity: theme === 'light' ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute inset-0"
                >
                    <Sun size={20} className="text-orange-500" />
                </motion.div>

                <motion.div
                    initial={false}
                    animate={{
                        y: theme === 'dark' ? 0 : -30,
                        opacity: theme === 'dark' ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute inset-0"
                >
                    <Moon size={20} className="text-blue-400" />
                </motion.div>
            </div>
        </motion.button>
    );
}
