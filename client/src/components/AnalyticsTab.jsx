import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Loader2, TrendingUp, Users, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AnalyticsTab({ exams }) {
    const [selectedExamId, setSelectedExamId] = useState('overall');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);

    const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const url = selectedExamId === 'overall'
                ? `${API_URL}/api/exams/analytics/overview`
                : `${API_URL}/api/exams/analytics/${selectedExamId}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setAnalyticsData(res.data);
        } catch (error) {
            console.error('Analytics fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [selectedExamId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!analyticsData) return <div className="p-10 text-center text-text-secondary">No analytics data available.</div>;

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center bg-surface border border-border p-6 rounded-xl shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-text-primary uppercase tracking-tight">Performance Intelligence</h2>
                    <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-1">Data-driven insights for academic integrity</p>
                </div>
                <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="bg-background border border-border rounded-lg px-4 py-2 text-sm font-bold text-text-primary outline-none focus:border-blue-600 transition-all cursor-pointer shadow-sm"
                >
                    <option value="overall">Overall System Stats</option>
                    {exams.map(exam => (
                        <option key={exam._id} value={exam._id}>{exam.title}</option>
                    ))}
                </select>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-border p-5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-blue-600" />
                        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total Students</h4>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-mono">{analyticsData.totalAttempts || 0}</p>
                </div>
                <div className="bg-surface border border-border p-5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-green-600" />
                        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Avg. Score</h4>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-mono">{analyticsData.avgScore?.toFixed(1) || 0}%</p>
                </div>
                <div className="bg-surface border border-border p-5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Pass Rate</h4>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-mono">{analyticsData.passRate?.toFixed(1) || 0}%</p>
                </div>
                <div className="bg-surface border border-border p-5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className="text-red-500" />
                        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Avg. Violations</h4>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-mono">{analyticsData.avgViolations?.toFixed(1) || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Distribution */}
                <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-text-primary text-sm uppercase tracking-tight mb-6">Score Distribution</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="range" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                                    cursor={{ fill: 'var(--background)', opacity: 0.4 }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Breakdown (Pass/Fail) */}
                <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-text-primary text-sm uppercase tracking-tight mb-6">Result Status</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analyticsData.statusBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {analyticsData.statusBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Violation Breakdown */}
                <div className="bg-surface border border-border p-6 rounded-xl shadow-sm lg:col-span-2">
                    <h3 className="font-bold text-text-primary text-sm uppercase tracking-tight mb-6">Security Integrity Analysis</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.violationTypes} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                                <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis dataKey="type" type="category" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} width={100} />
                                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
