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
      {/* Note: the shared ClientLayout already renders the "Skip to Content"
          link and the <main role="main" id="main-content"> landmark as the
          first focusable element / page wrapper. Rendering them again here
          would create duplicate IDs and nested <main> elements (invalid
          HTML5), so this page renders its content directly into that
          shared main landmark as a labelled region. */}
      <section role="region" aria-label="CMS login" className="flex flex-col items-center justify-center min-h-screen bg-background focus:outline-none">
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
      </section>
    </>
  );
}
