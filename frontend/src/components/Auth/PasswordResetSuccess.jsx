import { ArrowRight, CheckCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/Login.css';

const PasswordResetSuccess = ({ onBackToLogin }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="hidden lg:flex auth-hero-panel auth-hero-gradient flex-col justify-between p-12 text-white">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">BankPro</h1>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold mb-6">Password Reset Successful</h2>
          <p className="text-blue-100 text-lg mb-8">
            Your password has been successfully reset. You can now sign in with your new password and continue using your account securely.
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="text-blue-200" size={20} />
              <span className="text-blue-100">Secure authentication</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-blue-200" size={20} />
              <span className="text-blue-100">Password updated</span>
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
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-4">Password Reset Successful!</h2>
              <p className="text-gray-600 mb-8">
                Your password has been successfully updated. You can now sign in to your account with your new password.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-800 text-sm font-medium">
                    Your account is now secure with the new password
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (typeof onBackToLogin === 'function') return onBackToLogin();
                  navigate('/login');
                }}
                className="auth-primary-cta w-full text-white py-3.5 px-4 rounded-lg font-medium hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center transition-all duration-300"
              >
                Continue to Login
                <ArrowRight size={18} className="ml-2" />
              </button>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Make sure to keep your new password secure and don't share it with anyone.
                </p>
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

export default PasswordResetSuccess;
