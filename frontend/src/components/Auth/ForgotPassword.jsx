import { ArrowLeft, ArrowRight, Mail, Shield, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import '../../styles/pages/Login.css';

const ForgotPassword = ({ onBack, onResetTokenGenerated }) => {
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('email'); // 'email' | 'questions'
  const [questionsData, setQuestionsData] = useState(null);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);
  const [showDemoNote, setShowDemoNote] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Check if user has security questions configured
      const lookupRes = await api.auth.lookupSecurityQuestions(email);
      if (lookupRes.success && lookupRes.questionsConfigured && lookupRes.data?.question1) {
        setQuestionsData(lookupRes.data);
        setStage('questions');
        setLoading(false);
        return;
      }

      // Step 2: Fall back to email reset token
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
    } catch (err) {
      if (err.message?.includes('User not found')) {
        setError('No account found with this email address');
      } else {
        setError('Failed to process password reset. Please try again.');
      }
    }

    setLoading(false);
  };

  const handleQuestionsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!answer1.trim()) {
      setError('Please provide an answer to Question 1');
      return;
    }

    if (questionsData?.question2 && !answer2.trim()) {
      setError('Please provide an answer to Question 2');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.resetPasswordWithSecurityQuestions({
        email,
        answer1: answer1.trim(),
        answer2: answer2.trim(),
        newPassword
      });

      if (response.success) {
        setIsResetSuccess(true);
      } else {
        setError(response.error || 'Security question verification failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please verify your answers.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (typeof onBack === 'function') return onBack();
    navigate('/login');
  };

  if (isResetSuccess) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="hidden lg:flex auth-hero-panel auth-hero-gradient flex-col justify-between p-12 text-white">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">BankPro</h1>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6">Password Reset Complete</h2>
            <p className="text-blue-100 text-lg mb-8">
              Your password has been reset successfully using security questions. You can now log into your account.
            </p>
          </div>
          <div className="text-blue-200 text-sm">
            © {new Date().getFullYear()} BankPro. All rights reserved.
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Reset Successful!</h2>
              <p className="text-gray-600 mb-8">
                Your identity was verified via security questions and your account password has been updated.
              </p>
              <button
                onClick={handleBackToLogin}
                className="auth-primary-cta w-full text-white py-3.5 px-4 rounded-lg font-medium hover:shadow-lg focus:outline-none flex items-center justify-center transition-all duration-300"
              >
                Proceed to Login
                <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                    </p>
                  </div>
                )}

                <button
                  onClick={handleBackToLogin}
                  className="auth-primary-cta w-full text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg focus:outline-none flex items-center justify-center transition-all duration-300"
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
          <h2 className="text-4xl font-bold mb-6">
            {stage === 'questions' ? 'Security Verification' : 'Reset Your Password'}
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            {stage === 'questions'
              ? 'Answer your registered security questions to reset your account password instantly.'
              : "Enter your email address and we'll check your account security recovery options."}
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="text-blue-200" size={20} />
              <span className="text-blue-100">Secure verification</span>
            </div>
            <div className="flex items-center space-x-3">
              <KeyRound className="text-blue-200" size={20} />
              <span className="text-blue-100">Instant password reset</span>
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
            <h1 className="text-2xl font-bold text-gray-800">BankPro</h1>
            <p className="text-gray-600">Secure Banking Made Simple</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {stage === 'questions' ? 'Answer Security Questions' : 'Reset Password'}
              </h2>
              <p className="text-gray-500 text-sm">
                {stage === 'questions'
                  ? `Answering security questions for ${email}`
                  : 'Enter your registered email to continue'}
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-lg flex items-center text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {stage === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      required
                      placeholder="Enter your registered email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-primary-cta w-full text-white py-3.5 px-4 rounded-lg font-medium hover:shadow-lg focus:outline-none disabled:opacity-50 flex items-center justify-center transition-all duration-300"
                  disabled={loading || !email.trim()}
                >
                  {loading ? 'Checking Account...' : <>Continue <ArrowRight size={18} className="ml-2" /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleQuestionsSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Question 1
                  </label>
                  <div className="text-sm font-medium text-gray-800 mb-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    {questionsData?.question1}
                  </div>
                  <input
                    type="text"
                    value={answer1}
                    onChange={(e) => setAnswer1(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                    placeholder="Type answer to Question 1..."
                  />
                </div>

                {questionsData?.question2 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Question 2
                    </label>
                    <div className="text-sm font-medium text-gray-800 mb-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      {questionsData?.question2}
                    </div>
                    <input
                      type="text"
                      value={answer2}
                      onChange={(e) => setAnswer2(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                      placeholder="Type answer to Question 2..."
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative mb-3">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStage('email'); setError(''); }}
                    className="w-1/3 py-3 px-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="auth-primary-cta w-2/3 text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg focus:outline-none flex items-center justify-center transition-all duration-300 text-sm"
                    disabled={loading}
                  >
                    {loading ? 'Verifying Answers...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center">
                <button
                  onClick={handleBackToLogin}
                  className="auth-accent-link font-medium transition-colors duration-200 focus:outline-none focus:underline flex items-center text-sm"
                >
                  <ArrowLeft size={16} className="mr-1" />
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
