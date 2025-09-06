import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/Input';
// No icon import; using brand logo image
import { secureStorage } from '../../utils/secureStorage';

interface AuthFormProps {
  isAdmin?: boolean;
}

// Removed APK download promo per request

export const AuthForm: React.FC<AuthFormProps> = ({ isAdmin = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  
  const { login, register, adminLogin, resetPassword, profileLoading, authUser } = useAuth();
  
  // Load saved credentials on component mount and optionally auto-login
  React.useEffect(() => {
    const credentials = secureStorage.getCredentials();
    if (credentials && credentials.rememberMe) {
      setEmail(credentials.email);
      setPassword(credentials.password);
      setRememberMe(true);
      // Optional auto-login is intentionally disabled
    }
  }, []);
  
  // If user is already authenticated, show a message
  React.useEffect(() => {
    if (authUser) {
      console.log('User already authenticated, should redirect from login page');
    }
  }, [authUser]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage('');
    setError('');

    try {
      const result = await resetPassword(resetEmail);
      if (result.success) {
        setResetMessage('Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
        setResetEmail('');
      } else {
        setError(result.error || 'Failed to send password reset email');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let success = false;
      
      if (isAdmin) {
        success = await adminLogin(email, password);
        if (!success) {
          setError('Invalid admin credentials or insufficient permissions');
        }
      } else if (isLogin) {
        const result = await login(email, password);
        success = result.success;
        if (!success) {
          setError(result.error || 'Invalid email or password. Please check your credentials and try again.');
        } else {
          // Save or clear credentials based on remember me
          secureStorage.saveCredentials(email, password, rememberMe);
        }
      } else {
        const result = await register(email, password, phone, referralCode);
        success = result.success;
        if (!success) {
          setError(result.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
          {/* Subtle loading indicator for auth check */}
          {profileLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="flex items-center gap-3 text-blue-700 text-sm">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Checking authentication...</span>
              </div>
            </div>
          )}
          
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-6 overflow-hidden">
              <img
                src="/starline-logo.png"
                alt="Starline Networks"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className={`text-3xl font-extrabold mb-2 tracking-tight ${isAdmin ? 'text-gray-900' : 'text-[#4285F4]'}`}>
              {isAdmin ? 'Admin' : 'Starline Networks'}
            </h1>
            <p className="text-gray-600 text-base">
              {isAdmin ? 'Admin Dashboard Access' : (isLogin ? 'Welcome back!' : 'Create your account')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              required
            />

            {!isLogin && !isAdmin && (
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="Enter your phone number (optional)"
              />
            )}

            {!isLogin && !isAdmin && (
              <Input
                label="Referral Code"
                type="text"
                value={referralCode}
                onChange={setReferralCode}
                placeholder="Enter referral code (optional)"
              />
            )}

            {isLogin && !isAdmin && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#4285F4] bg-white border-gray-300 rounded focus:ring-[#4285F4] focus:ring-2"
                  />
                  <label htmlFor="rememberMe" className="text-gray-700 text-sm font-medium cursor-pointer hover:text-gray-900 transition-colors">
                    Remember me
                  </label>
                </div>
                {rememberMe && email && password && (
                  <div className="px-1 text-xs text-green-600 font-medium">
                    ✓ Credentials saved for quick login
                  </div>
                )}
              </div>
            )}

            {/* Forgot Password Link */}
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#4285F4] hover:text-[#3367D6] font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-center gap-3 text-red-700 text-sm">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-[#4285F4] hover:bg-[#3367D6] disabled:bg-gray-400 text-white font-semibold text-base rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  <span>Please wait...</span>
                </div>
              ) : (
                (isAdmin ? 'Admin Login' : (isLogin ? 'Sign In' : 'Sign Up'))
              )}
            </button>

            {!isAdmin && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[#4285F4] hover:text-[#3367D6] text-sm font-medium transition-colors duration-200 hover:underline"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl w-full max-w-md">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                value={resetEmail}
                onChange={setResetEmail}
                placeholder="Enter your email"
                required
                className="w-full"
              />

              {resetMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="flex items-center gap-3 text-green-700 text-sm">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span>{resetMessage}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="flex items-center gap-3 text-red-700 text-sm">
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setResetMessage('');
                    setError('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail}
                  className="flex-1 px-6 py-3 bg-[#4285F4] hover:bg-[#3367D6] disabled:bg-gray-300 text-white font-semibold rounded-2xl transition-colors"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};