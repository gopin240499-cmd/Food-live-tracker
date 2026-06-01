import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import useToast from '../hooks/useToast';
import Toast from '../components/Toast';
import Loader from '../components/Loader';
import { slideUp } from '../animations/variants';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Please fill in all fields', 'warning');
      return;
    }
    setLoading(true);
    try {
      const data = await register(name, email, password, role);
      showToast('Account created!', 'success');
      setTimeout(() => {
        navigate(data.role === 'customer' ? '/customer' : '/delivery');
      }, 500);
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center px-4">
      <Toast {...toast} onClose={hideToast} />
      <motion.div
        {...slideUp}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg shadow-orange-200">
            🛵
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            LiveTrack
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Sign Up</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">I am a</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
                    role === 'customer'
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  🍔 Customer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('delivery')}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
                    role === 'delivery'
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  🛵 Delivery Partner
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-200 transition-all duration-300 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader size="sm" text="" /> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-500 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
