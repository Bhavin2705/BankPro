import { ArrowRight, Eye, EyeOff, Shield, Smartphone, Users } from 'lucide-react';
import '../../styles/pages/Login.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, loginWithAccount } from '../../utils/auth';
import AuthLayout from '../Layout/AuthLayout';
import ForgotPassword from './ForgotPassword';
import PasswordResetSuccess from './PasswordResetSuccess';
import ResetPassword from './ResetPassword';

const Login = ({ onLogin, switchToRegister }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showAccountSelection, setShowAccountSelection] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = selectedAccountId
        ? await loginWithAccount(formData.email, formData.password, selectedAccountId, twoFactorRequired ? otp : undefined)
        : await login(formData.email, formData.password, twoFactorRequired ? otp : undefined);

      if (result.success) {
        onLogin(result.user);
        navigate('/dashboard', { replace: true });
      } else if (result.requiresTwoFactor) {
        setTwoFactorRequired(true);
        setError(result.message || 'Enter the OTP sent to your email.');
      } else if (result.needsAccountSelection) {
        setAvailableAccounts(result.accounts);
        setShowAccountSelection(true);
        setError(''); // Clear any previous errors
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      
      setError('Login failed. Please try again.');
    }

    setLoading(false);
  };

  const handleAccountSelection = async (accountId) => {
    setLoading(true);
    setError('');

    try {
      const result = await loginWithAccount(formData.email, formData.password, accountId);

      if (result.success) {
        onLogin(result.user);
        navigate('/dashboard', { replace: true });
      } else if (result.requiresTwoFactor) {
        setSelectedAccountId(accountId);
        setTwoFactorRequired(true);
        setShowAccountSelection(false);
        setError(result.message || 'Enter the OTP sent to your email.');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      
      setError('Login failed. Please try again.');
    }

    setLoading(false);
  };

  const handleBackToLogin = () => {
    setShowAccountSelection(false);
    setAvailableAccounts([]);
    setTwoFactorRequired(false);
    setOtp('');
    setSelectedAccountId('');
    setShowForgotPassword(false);
    setShowResetPassword(false);
    setShowResetSuccess(false);
    setResetToken('');
    setResetEmail('');
    setError('');
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleResetTokenGenerated = (token, email) => {
    setResetToken(token);
    setResetEmail(email);
    setShowForgotPassword(false);
    setShowResetPassword(true);
  };

  const handleResetSuccess = () => {
    setShowResetPassword(false);
    setShowResetSuccess(true);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const result = selectedAccountId
        ? await loginWithAccount(formData.email, formData.password, selectedAccountId)
        : await login(formData.email, formData.password);

      if (result.requiresTwoFactor) {
        setError('A new OTP has been sent to your registered email.');
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('Failed to resend OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleCreateAccount = () => {
    if (typeof switchToRegister === 'function') {
      switchToRegister();
      return;
    }
    navigate('/register');
  };

  if (showResetSuccess) {
    return <PasswordResetSuccess onBackToLogin={handleBackToLogin} />;
  }

  if (showAccountSelection) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Account</h2>
                <p className="text-gray-600">Multiple accounts found for this phone number. Please select which account to login to.</p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {availableAccounts.map((account) => (
                  <div
                    key={account._id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleAccountSelection(account._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{account.name}</h3>
                        <p className="text-sm text-gray-600">Account: {account.accountNumber}</p>
                        <p className="text-sm text-gray-600">Bank: {account.bankDetails?.bankName || 'BankPro'}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors mb-4"
                disabled={loading}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <ResetPassword
        resetToken={resetToken}
        email={resetEmail}
        onBack={handleBackToLogin}
        onSuccess={handleResetSuccess}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={handleBackToLogin}
        onResetTokenGenerated={handleResetTokenGenerated}
      />
    );
  }

  return (
    <div className="auth-page min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
      <div 
        className="hidden lg:flex auth-hero-panel auth-hero-gradient flex-col justify-between p-12 text-white"
      >
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">BankPro</h1>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold mb-6">Secure Banking Made Simple</h2>
          <p className="text-blue-100 text-lg mb-8">
            Access your accounts, manage payments, and control your finances with our advanced security features.
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="text-blue-200" size={20} />
              <span className="text-blue-100">256-bit encryption</span>
            </div>
            <div className="flex items-center space-x-3">
              <Smartphone className="text-blue-200" size={20} />
              <span className="text-blue-100">Multi-factor authentication</span>
            </div>
          </div>
        </div>

        <div className="text-blue-200 text-sm">
          © {new Date().getFullYear()} BankPro. All rights reserved.
        </div>
      </div>

      <div className="auth-page-main auth-form-panel w-full flex items-center justify-center p-6">
        <div className={`auth-form-wrap w-full max-w-md transition-all duration-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center mb-2 lg:hidden">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">BankPro</h1>
            </div>
            <p className="text-gray-600">Secure Banking Made Simple</p>
          </div>

          <div className="auth-form-card bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
              <p className="text-gray-500">Sign in to access your account</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-lg flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email address"
                    disabled={twoFactorRequired}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 pr-12"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    disabled={twoFactorRequired}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-[25%] text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  {!twoFactorRequired && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm auth-accent-link transition-colors duration-200 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </div>

              {twoFactorRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OTP Code</label>
                  <input
                    type="text"
                    name="otp"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="Enter 6-digit OTP"
                  />
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-sm auth-accent-link transition-colors duration-200 font-medium"
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="auth-primary-cta w-full text-white py-3.5 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </>
                ) : (
                  <>
                    {twoFactorRequired ? 'Verify OTP' : 'Sign In'}
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-gray-500">Don't have an account?</span>
                <button
                  onClick={handleCreateAccount}
                  className="auth-accent-link font-medium transition-colors duration-200 focus:outline-none focus:underline"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500 lg:hidden">
            © {new Date().getFullYear()} BankPro. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
