import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
      <h1 className="text-5xl font-bold mb-4">Campus Paper Portal</h1>
      <p className="text-xl mb-8 max-w-2xl text-center">
        A centralized platform for managing, archiving, and discovering academic research papers, journals, and conference publications.
      </p>

      <div className="flex space-x-4">
        <Link href="/browse-papers" className="text-white hover:text-gray-200">
          Browse Papers
        </Link>
        <Link href="/events" className="text-white hover:text-gray-200">
          Events
        </Link>
        <Link href="/login" className="text-white hover:text-gray-200">
          Login
        </Link>
        <Link href="/register" className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-gray-100">
          Register
        </Link>
      </div>

      <div className="mt-12 text-sm opacity-80">
        <Link href="/papers" className="hover:underline">Browse Public Papers</Link>
      </div>
    </div>
  );
}
