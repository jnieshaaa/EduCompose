import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
  };

  return (
    <div className='relative min-h-screen flex flex-col lg:flex-row bg-gradient-to-tr from-primary via-primary-400 to-primary overflow-hidden'>
      {/* subtle overlay */}
      <div className='absolute inset-0 bg-black/5'></div>

      {/* top-left circle */}
      <div className='absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/3 -translate-y-1/3'></div>

      {/* bottom-right circle */}
      <div className='absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4'></div>

      {/* Left Panel - Branding */}
      <div className='flex-1 hidden lg:flex items-center justify-center p-12 relative overflow-hidden'>
        <div className='relative z-10 text-white max-w-md'>
          <h1 className='text-5xl font-bold mb-4 tracking-tight'>
            Edu<span className='text-primary-50'>Compose</span>
          </h1>
          <p className='text-xl font-semibold mb-8'>
            Teacher's Companion for Essay Evaluation
          </p>
          <ul className='space-y-4'>
            <li className='flex items-start space-x-3'>
              <svg
                className='w-6 h-6 flex-shrink-0'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                  clipRule='evenodd'
                />
              </svg>
              <p>AI-powered essay analysis and grading</p>
            </li>
            <li className='flex items-start space-x-3'>
              <svg
                className='w-6 h-6 flex-shrink-0'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                  clipRule='evenodd'
                />
              </svg>
              <p>Detailed feedback generation</p>
            </li>
            <li className='flex items-start space-x-3'>
              <svg
                className='w-6 h-6 flex-shrink-0'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                  clipRule='evenodd'
                />
              </svg>
              <p>Save time, improve learning outcomes</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className='flex-1 flex items-center justify-center p-8'>
        <div className='w-full max-w-md rounded-lg bg-neutral1 relative z-10'>
          {/* Mobile Logo */}
          <div className='lg:hidden text-center mb-8'>
            <h1 className='text-4xl font-bold mb-2 text-white'>
              Edu<span className='text-primary-50'>Compose</span>
            </h1>
            <p className='text-white font-semibold'>
              Teacher's Companion for Essay Evaluation
            </p>
          </div>

          <div className='rounded-2xl shadow-xl bg-white p-8 md:p-10'>
            <div className='mb-8'>
              <h2 className='text-3xl font-bold text-gray-800 mb-2'>
                Welcome Back
              </h2>
              <p className='text-gray-600'>Login to access your dashboard</p>
            </div>

            <div className='space-y-5'>
              {/* Email Input */}
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Email or Username
                </label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    id='email'
                    type='text'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='w-full pl-11 pr-4 py-3 border border-neutral3 rounded-lg bg-white text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all'
                    placeholder='Enter your email'
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    id='password'
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='w-full pl-11 pr-12 py-3 border border-neutral3 rounded-lg bg-white text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all'
                    placeholder='Enter your password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showPassword ? (
                      <EyeOff className='w-5 h-5' />
                    ) : (
                      <Eye className='w-5 h-5' />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className='flex items-center justify-between text-sm'>
                <label className='flex items-center cursor-pointer'>
                  <input
                    type='checkbox'
                    className='w-4 h-4 border-gray-300  rounded text-primary focus:ring-primary'
                  />
                  <span className='ml-2 text-gray-600'>Remember me</span>
                </label>
                <button className='font-semibold text-primary-500 hover:text-primary-50 transition-colors'>
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <button
                onClick={() => navigate("/dashboard")}
                className='w-full text-white py-3 rounded-lg font-semibold bg-primary shadow-lg hover:bg-primary-300 transition-all'
              >
                Login
              </button>
            </div>

            {/* Sign Up */}
            <p className='text-center text-gray-600 text-sm mt-6'>
              Don’t have an account?{" "}
              <button className='font-semibold text-primary-500 hover:text-primary-50 transition-colors'>
                Sign up now!
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
