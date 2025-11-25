import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function AdminDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>({});
    const [papers, setPapers] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'admin') {
            router.push('/unauthorized');
            return;
        }
        setUser(parsedUser);
        fetchStats();
        fetchPapers();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/papers');
            const papers = res.data;

            // Calculate stats
            const total = papers.length;
            const approved = papers.filter((p: any) => p.status === 'approved').length;
            const pending = papers.filter((p: any) => p.status === 'pending').length;
            const rejected = papers.filter((p: any) => p.status === 'rejected').length;

            // Papers per department
            const deptCounts: any = {};
            papers.forEach((p: any) => {
                const deptName = p.departmentId?.name || 'Unknown';
                deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
            });

            const papersPerDept = Object.keys(deptCounts).map(name => ({
                name,
                count: deptCounts[name]
            }));

            // Status breakdown
            const statusData = [
                { name: 'Approved', value: approved },
                { name: 'Pending', value: pending },
                { name: 'Rejected', value: rejected }
            ];

            setStats({
                total,
                approved,
                pending,
                rejected,
                papersPerDept,
                statusData
            });
        } catch (err) {
            console.error('Failed to fetch stats');
        }
    };

    const fetchPapers = async () => {
        try {
            const res = await api.get('/papers');
            setPapers(res.data.slice(0, 5)); // Latest 5 papers
        } catch (err) {
            console.error('Failed to fetch papers');
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">{user.fullName}</span>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('user');
                                    router.push('/login');
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome, {user.fullName}!</h2>
                    <p className="text-gray-600">Manage the portal and view analytics</p>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Papers</h3>
                        <p className="text-3xl font-bold text-blue-600">{stats.total || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Approved</h3>
                        <p className="text-3xl font-bold text-green-600">{stats.approved || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending</h3>
                        <p className="text-3xl font-bold text-yellow-600">{stats.pending || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Rejected</h3>
                        <p className="text-3xl font-bold text-red-600">{stats.rejected || 0}</p>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Papers per Department */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Papers per Department</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.papersPerDept || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Status Breakdown */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Breakdown</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={stats.statusData || []}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {(stats.statusData || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Link
                        href="/dashboard/admin/annual-report"
                        className="block p-6 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition text-center"
                    >
                        <div className="text-4xl mb-2">📊</div>
                        <h3 className="text-xl font-bold mb-1">Annual Report</h3>
                        <p className="text-blue-100">Generate comprehensive reports</p>
                    </Link>

                    <Link
                        href="/admin/departments"
                        className="block p-6 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition text-center"
                    >
                        <div className="text-4xl mb-2">🏢</div>
                        <h3 className="text-xl font-bold mb-1">Departments</h3>
                        <p className="text-purple-100">Manage departments</p>
                    </Link>

                    <Link
                        href="/admin/users"
                        className="block p-6 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition text-center"
                    >
                        <div className="text-4xl mb-2">👥</div>
                        <h3 className="text-xl font-bold mb-1">Users</h3>
                        <p className="text-green-100">Manage users</p>
                    </Link>
                </div>

                {/* Recent Papers */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Submissions</h3>
                    <div className="space-y-3">
                        {papers.map((paper: any) => (
                            <div key={paper._id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <div>
                                    <p className="font-medium text-gray-900">{paper.title}</p>
                                    <p className="text-sm text-gray-600">{paper.departmentId?.name}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm ${paper.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        paper.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                    }`}>
                                    {paper.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
