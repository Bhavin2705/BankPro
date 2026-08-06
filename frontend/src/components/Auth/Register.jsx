import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react';
import '../../styles/pages/Register.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { register } from '../../utils/auth';
import AuthLayout from '../Layout/AuthLayout';

const Register = ({ onLogin, switchToLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    pin: '',
    confirmPin: '',
    initialDeposit: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [pinStrength, setPinStrength] = useState(0);
  const [emailExists, setEmailExists] = useState(false);
  const [emailCheckInProgress, setEmailCheckInProgress] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [phoneCheckInProgress, setPhoneCheckInProgress] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!formData.password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (formData.password.length >= 8) strength += 1;
    if (/[A-Z]/.test(formData.password)) strength += 1;
    if (/[a-z]/.test(formData.password)) strength += 1;
    if (/\d/.test(formData.password)) strength += 1;
    if (/[@$!%*?&]/.test(formData.password)) strength += 1;

    setPasswordStrength(strength);
  }, [formData.password]);

  useEffect(() => {
    if (!formData.pin) {
      setPinStrength(0);
      return;
    }

    const pin = formData.pin;
    const isRepeating = /^(\d)\1+$/.test(pin);
    const isSequential = '01234567890'.includes(pin) || '9876543210'.includes(pin);

    if (pin.length < 4 || isRepeating || isSequential) {
      setPinStrength(1); // Weak
    } else if (pin.length >= 6) {
      setPinStrength(3); // Strong
    } else {
      setPinStrength(2); // Medium
    }
  }, [formData.pin]);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const checkEmailExists = async (email) => {
    if (!isValidEmail(email)) {
      setEmailExists(false);
      setEmailCheckInProgress(false);
      return;
    }

    setEmailCheckInProgress(true);
    try {
      const response = await api.users.checkEmail(email);
      setEmailExists(response.exists);
    } catch (err) {
      
      setError('Failed to verify email. Please try again.');
    } finally {
      setEmailCheckInProgress(false);
    }
  };

  const checkPhoneExists = async (phone) => {
    setPhoneCheckInProgress(true);
    try {
      const response = await api.users.checkPhone(phone);
      const canRegister = response.canRegister;
      setPhoneExists(!canRegister);

      if (!canRegister) {
        setError(`Maximum ${response.maxAllowed} accounts allowed per phone number. Current count: ${response.count}`);
      } else {
        if (error.includes('Maximum') && error.includes('accounts allowed')) {
          setError('');
        }
      }
    } catch (err) {
      
      setError('Failed to verify phone number. Please try again.');
    } finally {
      setPhoneCheckInProgress(false);
    }
  };

  useEffect(() => {
    if (formData.email) {
      const delayDebounceFn = setTimeout(() => {
        checkEmailExists(formData.email);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [formData.email]);

  useEffect(() => {
    if (formData.phone) {
      const delayDebounceFn = setTimeout(() => {
        checkPhoneExists(formData.phone);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [formData.phone]);

  const handleSignIn = () => {
    if (typeof switchToLogin === 'function') {
      switchToLogin();
      return;
    }
    navigate('/login');
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.password.trim() !== '' &&
      formData.confirmPassword.trim() !== '' &&
      formData.pin.trim() !== '' &&
      formData.confirmPin.trim() !== '' &&
      formData.password === formData.confirmPassword &&
      formData.pin === formData.confirmPin &&
      !emailExists &&
      !emailCheckInProgress &&
      !phoneExists &&
      !phoneCheckInProgress
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (emailExists) {
      setError('This email is already registered. Please sign in instead.');
      setLoading(false);
      return;
    }

    if (phoneExists) {
      setError('Maximum accounts allowed per phone number reached. Please use a different phone number or sign in to existing account.');
      setLoading(false);
      return;
    }

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

    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      setLoading(false);
      return;
    }

    if (!/^\d{4,6}$/.test(formData.pin)) {
      setError('PIN must be a 4-6 digit number');
      setLoading(false);
      return;
    }

    if (/^(\d)\1+$/.test(formData.pin)) {
      setError('PIN cannot be all the same digits (e.g., 1111)');
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        pin: formData.pin,
      });

      if (result.success) {
        onLogin(result.user);
        navigate(`/dashboard?welcome=${formData.name}`, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      
      setError('Registration failed. Please try again.');
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

  const getPinStrengthColor = () => {
    if (pinStrength <= 1) return 'bg-red-500';
    if (pinStrength === 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPinStrengthText = () => {
    if (pinStrength <= 1) return 'Weak';
    if (pinStrength === 2) return 'Medium';
    return 'Strong';
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value) || value === '') {
      setFormData({
        ...formData,
        name: value,
      });
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 10) {
      setFormData({
        ...formData,
        phone: value,
      });
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 6) {
      setFormData({
        ...formData,
        pin: value,
      });
    }
  };

  const handleConfirmPinChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 6) {
      setFormData({
        ...formData,
        confirmPin: value,
      });
    }
  };

  const handleInitialDepositChange = (e) => {
    const value = e.target.value;
    if (/^[\d.]*$/.test(value)) {
      setFormData({
        ...formData,
        initialDeposit: value,
      });
    }
  };

  return (
    <div className="auth-page min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
      <div 
        className="hidden lg:flex auth-hero-panel auth-hero-gradient flex-col justify-between p-12 text-white"
      >
        <div className="flex items-center space-x-2">
          <Building2 size={32} className="text-blue-200" />
          <h1 className="text-2xl font-bold">BankPro</h1>
        </div>
        <div className="max-w-md">
          <h2 className="text-4xl font-bold mb-6">Join Thousands of Secure Users</h2>
          <p className="text-blue-100 text-lg mb-8">
            Create your account today and experience seamless banking with industry-leading security features and 24/7 support.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold">1</span>
              </div>
              <span className="text-blue-100">Quick registration process</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
              <span className="text-blue-100">Instant account access</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
              <span className="text-blue-100">Start banking immediately</span>
            </div>
          </div>
        </div>
        <div className="text-blue-200 text-sm">
          © {new Date().getFullYear()} BankPro. All rights reserved.
        </div>
      </div>
      <div className="auth-page-main auth-form-panel w-full flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 lg:bg-none">
        <div className={`auth-form-wrap w-full max-w-md transition-all duration-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center mb-2 lg:hidden">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Building2 size={32} className="text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">BankPro</h1>
            </div>
            <p className="text-gray-600">Secure Banking Made Simple</p>
          </div>
          <div className="auth-form-card bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100 flex flex-col max-h-[75vh]">
            <div className="text-center mb-8 flex-shrink-0">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
              <p className="text-gray-500">Join thousands of secure users today</p>
            </div>
            {error && (
              <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-lg flex items-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}
            <div className="auth-scroll-body overflow-y-auto flex-1 pr-2">
              <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    className="auth-white-input w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.name}
                    onChange={handleNameChange}
                    required
                    placeholder="Enter your full name"
                    pattern="[a-zA-Z\s]*"
                    title="Name should only contain letters and spaces"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    className="auth-white-input w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email address"
                  />
                </div>
                {emailExists && (
                  <p className="text-red-500 text-sm mt-2" aria-live="polite">
                    This email is already registered. Please sign in instead.
                  </p>
                )}
                {emailCheckInProgress && (
                  <p className="text-blue-500 text-sm mt-2" aria-live="polite">
                    Checking email availability...
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    className="auth-white-input w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    required
                    placeholder="Enter your phone number"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Please enter a 10-digit phone number"
                  />
                </div>
                {phoneExists && (
                  <p className="text-red-500 text-sm mt-2" aria-live="polite">
                    Maximum accounts allowed per phone number reached. Please use a different phone number.
                  </p>
                )}
                {phoneCheckInProgress && (
                  <p className="text-blue-500 text-sm mt-2" aria-live="polite">
                    Checking phone number availability...
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="auth-white-input w-full pl-10 pr-12 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
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
                        className={`register-strength-fill register-password-strength-${passwordStrength} h-1.5 rounded-full ${getPasswordStrengthColor()}`}
                      ></div>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    className="auth-white-input w-full pl-10 pr-12 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-[25%] text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction PIN</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showPin ? 'text' : 'password'}
                    name="pin"
                    className="auth-white-input w-full pl-10 pr-12 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.pin}
                    onChange={handlePinChange}
                    required
                    placeholder="Set a 4-6 digit PIN"
                    inputMode="numeric"
                    pattern="[0-9]{4,6}"
                    maxLength="6"
                    title="PIN must be 4-6 digits"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
                    title={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.pin && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">PIN strength:</span>
                      <span
                        className={`text-xs font-medium ${pinStrength <= 1
                          ? 'text-red-500'
                          : pinStrength <= 2
                            ? 'text-yellow-500'
                            : 'text-green-500'
                          }`}
                      >
                        {getPinStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`register-strength-fill register-pin-strength-${pinStrength} h-1.5 rounded-full ${getPinStrengthColor()}`}
                      ></div>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Use a 4-6 digit PIN for deposits and withdrawals. Avoid patterns like 1111.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm PIN</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPin ? 'text' : 'password'}
                    name="confirmPin"
                    className="auth-white-input w-full pl-10 pr-12 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.confirmPin}
                    onChange={handleConfirmPinChange}
                    required
                    placeholder="Confirm your PIN"
                    inputMode="numeric"
                    pattern="[0-9]{4,6}"
                    maxLength="6"
                    title="PIN must be 4-6 digits"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-1/2 -translate-y-[25%] text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
                    title={showConfirmPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showConfirmPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.pin && formData.confirmPin && formData.pin !== formData.confirmPin && (
                  <p className="text-red-500 text-sm mt-2">PINs do not match</p>
                )}
              </div>
              <button
                type="submit"
                className="auth-primary-cta w-full text-white py-3.5 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={!isFormValid() || loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </button>
            </form>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-gray-500">Already have an account?</span>
                <button
                  onClick={handleSignIn}
                  className="auth-accent-link font-medium transition-colors duration-200 focus:outline-none focus:underline"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-500 lg:hidden bg-transparent">
            © {new Date().getFullYear()} BankPro. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
