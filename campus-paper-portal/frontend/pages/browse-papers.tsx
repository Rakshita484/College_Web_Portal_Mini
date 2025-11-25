import { useState, useEffect } from 'react';
import api from '../lib/api';
import Link from 'next/link';

export default function BrowsePapersPage() {
    const [papers, setPapers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filters, setFilters] = useState({
        keyword: '',
        department: '',
        year: '',
        type: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();
        fetchPapers();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error('Failed to fetch departments');
        }
    };

    const fetchPapers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.keyword) params.append('keyword', filters.keyword);
            if (filters.department) params.append('department', filters.department);
            if (filters.year) params.append('year', filters.year);
            if (filters.type) params.append('type', filters.type);

            const res = await api.get(`/papers/search?${params.toString()}`);
            setPapers(res.data);
        } catch (err) {
            console.error('Failed to fetch papers');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchPapers();
    };

    const handleDownload = (fileUrl) => {
        window.open(fileUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/" className="text-xl font-bold text-gray-800">
                            College Paper Portal
                        </Link>
                        <div className="flex space-x-4">
                            <Link href="/login" className="text-gray-600 hover:text-gray-900">
                                Login
                            </Link>
                            <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Register
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Research Papers</h1>

                {/* Search & Filters */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <input
                            type="text"
                            placeholder="Search by title, author, keywords..."
                            value={filters.keyword}
                            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <select
                            value={filters.department}
                            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((dept) => (
                                <option key={dept._id} value={dept._id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Years</option>
                            {[2024, 2023, 2022, 2021, 2020].map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Types</option>
                            <option value="Journal">Journal</option>
                            <option value="Conference">Conference</option>
                            <option value="Thesis">Thesis</option>
                        </select>

                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Papers List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading papers...</p>
                    </div>
                ) : papers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <p className="text-gray-600 text-lg">No papers found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {papers.map((paper) => (
                            <div key={paper._id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{paper.title}</h3>
                                        <p className="text-gray-600 mb-3">{paper.abstract}</p>

                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {paper.keywords?.map((keyword, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>📚 {paper.departmentId?.name || 'N/A'}</span>
                                            <span>📅 {paper.year}</span>
                                            <span>📄 {paper.type}</span>
                                            {paper.venue && <span>🏛️ {paper.venue}</span>}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDownload(paper.fileUrl)}
                                        className="ml-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
