"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/cms/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        router.push('/cms/dashboard');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Skip-to-content link — first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-foreground focus:text-background focus:text-xs focus:uppercase focus:tracking-widest focus:font-medium focus:rounded-full focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to Content
      </a>
      <main role="main" aria-label="CMS login" id="main-content" tabIndex={-1} className="flex flex-col items-center justify-center min-h-screen bg-background focus:outline-none">
        <h1 className="text-2xl mb-4 font-heading">CMS Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-80">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="border border-foreground/10 bg-background/5 p-3 rounded-xl"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground p-3 rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </main>
    </>
  );
}
