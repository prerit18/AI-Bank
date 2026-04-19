import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 mb-6">
          <span className="text-4xl">🏦</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Welcome to AI-Bank</h1>
        <p className="text-lg text-gray-500 mb-10">
          The modern UK digital bank. Open an account, manage your money, and make
          payments — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
          >
            Open an Account
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 bg-white text-indigo-600 font-semibold rounded-xl border-2 border-indigo-200 hover:border-indigo-400 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
