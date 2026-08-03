"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PillButton } from '@/components/brand/PillButton';
import { BezelCard } from '@/components/brand/BezelCard';
import { SectionLabel } from '@/components/brand/SectionLabel';

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
      <section role="region" aria-label="CMS login" className="flex flex-col items-center justify-center min-h-screen bg-background focus:outline-none px-4">
        <span className="text-xl font-heading font-light tracking-[0.3em] text-primary mb-10">DRMA</span>
        <BezelCard className="w-full max-w-sm" innerClassName="p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <SectionLabel className="mb-6">Dashboard</SectionLabel>
            <h1 className="text-3xl md:text-4xl font-heading font-light tracking-tight">
              CMS <span className="italic text-foreground/60">Login.</span>
            </h1>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="h-12 border border-transparent bg-foreground/5 px-4 rounded-xl font-light focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              autoFocus
            />
            <PillButton type="submit" fullWidth icon="right" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </PillButton>
          </form>
          {error && <p className="text-red-500 mt-4 text-sm text-center">{error}</p>}
        </BezelCard>
      </section>
    </>
  );
}
