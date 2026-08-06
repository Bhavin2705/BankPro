import { ArrowLeft, ArrowRight, Mail, Shield } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import '../../styles/pages/Login.css';

const ForgotPassword = ({ onBack, onResetTokenGenerated }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDemoNote, setShowDemoNote] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.auth.forgotPassword({ email });

      if (response.success) {
        if (response.data) {
          if (typeof onResetTokenGenerated === 'function') {
            onResetTokenGenerated(response.data, email);
          }
          setShowDemoNote(true);
        } else {
          setIsSubmitted(true);
          setShowDemoNote(false);
        }
      } else {
        setError(response.error || 'Failed to send reset instructions');
      }
    } catch (error) {
      if (error.message.includes('User not found')) {
        setError('No account found with this email address');
      } else {
        setError('Failed to send reset instructions. Please try again.');
      }
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError(''); // Clear error when user starts typing
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="hidden lg:flex auth-hero-panel auth-hero-gradient flex-col justify-between p-12 text-white">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">BankPro</h1>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6">Check Your Email</h2>
            <p className="text-blue-100 text-lg mb-8">
              We've sent password reset instructions to your email address. Please check your inbox and follow the link to reset your password.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Shield className="text-blue-200" size={20} />
                <span className="text-blue-100">Secure password reset</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="text-blue-200" size={20} />
                <span className="text-blue-100">Email verification required</span>
              </div>
            </div>
          </div>

          <div className="text-blue-200 text-sm">
            © {new Date().getFullYear()} BankPro. All rights reserved.
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                  We've sent password reset instructions to <strong>{email}</strong>.
                  Please check your inbox and follow the link to reset your password.
                </p>

                {showDemoNote && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> For demo purposes, the reset token has been generated.
                      In a real application, this would be sent to your email.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (typeof onBack === 'function') return onBack();
                    navigate('/login');
                  }}
                  className="auth-primary-cta w-full text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center transition-all duration-300"
                >
                  <ArrowLeft size={18} className="mr-2" />
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="hidden lg:flex auth-hero-panel auth-hero-gradient flex-col justify-between p-12 text-white">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">BankPro</h1>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold mb-6">Reset Your Password</h2>
          <p className="text-blue-100 text-lg mb-8">
            Enter your email address and we'll send you instructions to reset your password securely.
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="text-blue-200" size={20} />
              <span className="text-blue-100">Secure reset process</span>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="text-blue-200" size={20} />
              <span className="text-blue-100">Email verification</span>
            </div>
          </div>
        </div>

        <div className="text-blue-200 text-sm">
          © {new Date().getFullYear()} BankPro. All rights reserved.
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-2 lg:hidden">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">BankPro</h1>
            </div>
            <p className="text-gray-600">Secure Banking Made Simple</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h2>
              <p className="text-gray-500">Enter your email to receive reset instructions</p>
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
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    required
                    placeholder="Enter your registered email"
                    disabled={loading}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  We'll send password reset instructions to this email address.
                </p>
              </div>

              <button
                type="submit"
                className="auth-primary-cta w-full text-white py-3.5 px-4 rounded-lg font-medium hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300"
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Instructions...
                  </>
                ) : (
                  <>
                    Send Reset Instructions
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

export default ForgotPassword;
