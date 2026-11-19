import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const initialEmail = currentPath.includes('manager')
    ? 'manager@sparkhotel.com'
    : currentPath.includes('front-office')
      ? 'fo001@sparkhotel.com'
      : 'admin@sparkhotel.com';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('SparkHotel@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const buttonLabel = useMemo(() => {
    const target = email.toLowerCase().trim();
    if (target.includes('manager') || target === 'mgr001') return 'Sign In to Manager Panel';
    if (target.includes('fo00') || target.includes('reception') || target.includes('front')) {
      return 'Sign In to Front Office Panel';
    }
    return 'Sign In to Admin Panel';
  }, [email]);

  const redirectByRole = (user: any) => {
    const search = window.location.search || '?propertyId=a0000001-0000-4000-a000-000000000001';
    if (user?.roles.includes('admin') || user?.email === 'admin@sparkhotel.com') {
      if (currentPath.includes('manager')) {
        navigate(`/manager${search}`);
      } else {
        navigate(`/admin${search}`);
      }
    } else if (user?.roles.includes('manager')) {
      navigate(`/manager${search}`);
    } else {
      navigate(`/front-office${search}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = login(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
        setLoading(false);
      } else {
        redirectByRole(res.user);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1a2e] via-[#102a43] to-[#0b3c49] flex flex-col justify-center items-center p-4 sm:p-6 text-white">
      {/* Header & Logo */}
      <div className="w-full max-w-md mb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 text-2xl font-bold shadow-lg shadow-teal-500/20 mb-3 backdrop-blur-md">
          ⚡
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Hotel Spark
        </h1>
        <p className="text-teal-300 text-xs font-semibold tracking-wide uppercase mt-1">
          Single Hotel Management System · Karimnagar
        </p>
        <p className="text-xs text-gray-300 max-w-sm mx-auto mt-1">
          Staff & Administrative Console access for front office, housekeeping, billing, and hotel management.
        </p>
      </div>

      {/* Login Form Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md text-gray-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Staff Sign In</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enter your hotel staff credentials to continue</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase tracking-wider border border-teal-200">
            Authorized Staff
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Email Address / Staff ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail size={16} />
              </div>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ADM001 or admin@sparkhotel.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Password
              </label>
              <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                <ShieldCheck size={12} className="text-teal-600" /> Authorized Access
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter staff password"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Authenticating…' : buttonLabel}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="pt-4 mt-6 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-teal-600" /> Single Hotel Isolated System
          </span>
          <span>Hotel Spark · Karimnagar</span>
        </div>
      </div>
    </div>
  );
}
