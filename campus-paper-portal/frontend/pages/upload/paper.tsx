import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api';

interface Department {
    _id: string;
    name: string;
}

export default function UploadPaper() {
    const [title, setTitle] = useState('');
    const [abstract, setAbstract] = useState('');
    const [summary, setSummary] = useState('');
    const [authors, setAuthors] = useState(''); // Comma separated
    const [departmentId, setDepartmentId] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [type, setType] = useState('research_paper');
    const [venue, setVenue] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Fetch departments
        const fetchDepartments = async () => {
            try {
                // Assuming this endpoint exists or will exist
                const res = await api.get('/departments');
                setDepartments(res.data);
            } catch (err) {
                console.error('Failed to fetch departments', err);
                // Fallback or error handling
            }
        };
        fetchDepartments();
    }, []);

    const handleGenerateSummary = async () => {
        if (!abstract) {
            setError('Please enter an abstract first.');
            return;
        }
        setAiLoading(true);
        setError('');
        try {
            const res = await api.post('/ai/summary', { abstract });
            setSummary(res.data.summary);
        } catch (err: any) {
            console.error('AI Summary failed', err);
            setError('Failed to generate summary. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title || !abstract || !departmentId || !file || !authors) {
            setError('Please fill in all required fields.');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('abstract', abstract);
        formData.append('summary', summary);
        // Convert comma separated authors to JSON string array
        const authorsArray = authors.split(',').map(a => a.trim()).filter(a => a);
        formData.append('authors', JSON.stringify(authorsArray));
        formData.append('departmentId', departmentId);
        formData.append('year', year.toString());
        formData.append('type', type);
        formData.append('venue', venue);
        formData.append('file', file);

        try {
            await api.post('/papers', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            // Redirect based on role
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.role === 'admin') router.push('/dashboard/admin');
            else if (user.role === 'faculty') router.push('/dashboard/faculty');
            else if (user.role === 'alumni') router.push('/dashboard/alumni');
            else router.push('/dashboard/student');
        } catch (err: any) {
            console.error('Upload failed', err);
            setError(err.response?.data?.message || 'Failed to upload paper.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow-md">
                <h1 className="text-3xl font-bold mb-6 text-center">Upload Research Paper</h1>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Title */}
                    <div>
                        <label className="block font-medium mb-1">Title *</label>
                        <input
                            type="text"
                            className="w-full border rounded p-2"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    {/* Abstract */}
                    <div>
                        <label className="block font-medium mb-1">Abstract *</label>
                        <textarea
                            className="w-full border rounded p-2 h-32"
                            value={abstract}
                            onChange={e => setAbstract(e.target.value)}
                            required
                        />
                    </div>

                    {/* AI Summary Generator */}
                    <div className="bg-blue-50 p-4 rounded border border-blue-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block font-medium text-blue-800">Summary (Auto-generated or Manual)</label>
                            <button
                                type="button"
                                onClick={handleGenerateSummary}
                                disabled={aiLoading}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                            >
                                {aiLoading ? 'Generating...' : 'Generate Summary (AI)'}
                            </button>
                        </div>
                        <textarea
                            className="w-full border rounded p-2 h-24"
                            value={summary}
                            onChange={e => setSummary(e.target.value)}
                            placeholder="Click 'Generate Summary' to use AI, or type manually..."
                        />
                    </div>

                    {/* Authors */}
                    <div>
                        <label className="block font-medium mb-1">Authors (Comma separated) *</label>
                        <input
                            type="text"
                            className="w-full border rounded p-2"
                            value={authors}
                            onChange={e => setAuthors(e.target.value)}
                            placeholder="e.g. John Doe, Jane Smith"
                            required
                        />
                    </div>

                    {/* Department */}
                    <div>
                        <label className="block font-medium mb-1">Department *</label>
                        <select
                            className="w-full border rounded p-2"
                            value={departmentId}
                            onChange={e => setDepartmentId(e.target.value)}
                            required
                        >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                                <option key={dept._id} value={dept._id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Meta Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-medium mb-1">Year</label>
                            <input
                                type="number"
                                className="w-full border rounded p-2"
                                value={year}
                                onChange={e => setYear(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Type</label>
                            <select
                                className="w-full border rounded p-2"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="research_paper">Research Paper</option>
                                <option value="journal">Journal</option>
                                <option value="conference">Conference</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Venue</label>
                            <input
                                type="text"
                                className="w-full border rounded p-2"
                                value={venue}
                                onChange={e => setVenue(e.target.value)}
                                placeholder="e.g. IEEE Conference"
                            />
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block font-medium mb-1">Paper PDF *</label>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="w-full"
                            required
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Uploading...' : 'Submit Paper'}
                    </button>

                </form>
            </div>
        </div>
    );
}
