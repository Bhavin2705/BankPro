import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import '../../styles/pages/ResetPassword.css';
import '../../styles/pages/Login.css';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../utils/api';

const ResetPassword = ({ resetToken, email, onBack, onSuccess }) => {
  const params = useParams();
  const navigate = useNavigate();
  const tokenFromUrl = params.token || resetToken;
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[@$!%*?&]/.test(password)) strength += 1;
    return strength;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      setLoading(false);
      return;
    }

    try {
      const response = await api.auth.resetPassword(tokenFromUrl, {
        password: formData.password
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Failed to reset password');
      }
    } catch (error) {
      if (error.message.includes('Invalid or expired token')) {
        setError('Reset link has expired or is invalid. Please request a new one.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user starts typing

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  useEffect(() => {
    const verify = async () => {
      if (!tokenFromUrl) {
        navigate('/forgot-password', { replace: true });
        return;
      }

      try {
        const res = await api.auth.verifyResetToken(tokenFromUrl);
        if (!(res && res.success)) {
          navigate('/forgot-password', { replace: true });
        }
      } catch {
        navigate('/forgot-password', { replace: true });
      }
    };
    verify();
  }, []);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
      <div
        className="hidden-mobile lg:w-1/2 auth-hero-panel auth-hero-gradient flex-col justify-between p-12 text-white"
      >
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">BankPro</h1>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold mb-6">Secure Password Reset</h2>
          <p className="text-blue-100 text-lg mb-8">
            Create a new secure password for your account. Make sure it's strong and unique for your security.
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="text-blue-200" size={20} />
              <span className="text-blue-100">256-bit encryption</span>
            </div>
            <div className="flex items-center space-x-3">
              <Lock className="text-blue-200" size={20} />
              <span className="text-blue-100">Secure password storage</span>
            </div>
          </div>
        </div>

        <div className="text-blue-200 text-sm">
          © {new Date().getFullYear()} BankPro. All rights reserved.
        </div>
      </div>

      <div className="full-width-mobile flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-2 mobile-header">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">BankPro</h1>
            </div>
            <p className="text-gray-600">Secure Banking Made Simple</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Create New Password</h2>
              <p className="text-gray-500">
                Resetting password for <strong>{email}</strong>
              </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="w-full pl-10 pr-12 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a new secure password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Password strength:</span>
                      <span
                        className={`text-xs font-medium ${passwordStrength <= 2
                          ? 'text-red-500'
                          : passwordStrength <= 3
                            ? 'text-yellow-500'
                            : 'text-green-500'
                          }`}
                      >
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`reset-password-strength-fill reset-password-strength-${passwordStrength} h-1.5 rounded-full ${getPasswordStrengthColor()}`}
                      ></div>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    className="w-full pl-10 pr-12 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password && formData.password !== formData.confirmPassword && (
                  <p className="mt-2 text-sm text-red-500">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                className="auth-primary-cta w-full text-white py-3.5 px-4 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={loading || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center">
                <button
                  onClick={onBack}
                  className="auth-accent-link font-medium transition-colors duration-200 focus:outline-none focus:underline flex items-center"
                >
                  <ArrowLeft size={16} className="mr-1" />
                  Back to Login
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

export default ResetPassword;
