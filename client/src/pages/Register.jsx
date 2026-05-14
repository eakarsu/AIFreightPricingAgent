import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/client';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await register(name, email, password);
      if (r.data?.token) {
        localStorage.setItem('token', r.data.token);
        localStorage.setItem('user', JSON.stringify(r.data.user));
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create your account</h1>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <input required placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300" />
            <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300" />
            <input required type="password" minLength={6} placeholder="Password (min 6)" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300" />
            <button disabled={loading} type="submit" className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold disabled:opacity-60">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
