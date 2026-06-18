"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check (In production, use secure auth like NextAuth)
    if (password === process.env.NEXT_PUBLIC_CMS_PASSWORD) {
      document.cookie = "cms_authenticated=true; path=/";
      router.push('/cms/dashboard');
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl mb-4">CMS Login</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="border p-2"
        />
        <button type="submit" className="bg-primary text-white p-2">Login</button>
      </form>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
