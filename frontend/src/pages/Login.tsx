import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EduComposeLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  //   const handleLogin = () => {
  //     console.log("Login attempt:", { email, password });
  //   };

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
  };

  return (
    <div className='relative min-h-screen flex flex-col lg:flex-row bg-gradient-to-tr from-primary via-accent to-support overflow-hidden'>
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
            Edu<span className='text-secondary'>Compose</span>
          </h1>
          <p className='text-xl font-light mb-8'>
            Teacher's Companion for Essay Evaluation
          </p>
          <ul className='space-y-4'>
            <li className='flex items-start space-x-3'>
              <svg
                className='w-6 h-6 mt-1 flex-shrink-0'
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
                className='w-6 h-6 mt-1 flex-shrink-0'
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
                className='w-6 h-6 mt-1 flex-shrink-0'
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
            <h1 className='text-4xl font-bold mb-2 text-primary'>
              Edu<span className='text-accent'>Compose</span>
            </h1>
            <p className='text-gray-600'>
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
                <button className='font-medium text-primary hover:text-accent transition-colors'>
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <button
                // onClick={handleLogin}
                onClick={() => navigate("/dashboard")}
                className='w-full text-white py-3 rounded-lg font-semibold bg-gradient-to-r from-primary to-accent shadow-lg hover:from-accent hover:to-primary transition-all transform hover:-translate-y-0.5'
              >
                Login
              </button>
            </div>

            {/* Divider */}
            <div className='relative my-6'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-neutral3'></div>
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-4 text-gray-500 bg-white'>
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className='grid grid-cols-2 gap-4'>
              <button
                onClick={() => handleSocialLogin("Google")}
                className='flex items-center justify-center space-x-2 py-3 px-4 border border-neutral3 rounded-lg hover:bg-neutral2 transition-all'
              >
                <svg className='w-5 h-5' viewBox='0 0 24 24'>
                  <path
                    fill='#4285F4'
                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  />
                  <path
                    fill='#34A853'
                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  />
                  <path
                    fill='#FBBC05'
                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  />
                  <path
                    fill='#EA4335'
                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  />
                </svg>
                <span className='text-gray-700 font-medium'>Google</span>
              </button>
              <button
                onClick={() => handleSocialLogin("Facebook")}
                className='flex items-center justify-center space-x-2 py-3 px-4 border border-neutral3 rounded-lg hover:bg-neutral2 transition-all'
              >
                <svg className='w-5 h-5' fill='#1877F2' viewBox='0 0 24 24'>
                  <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                </svg>
                <span className='text-gray-700 font-medium'>Facebook</span>
              </button>
            </div>

            {/* Sign Up */}
            <p className='text-center text-gray-600 text-sm mt-6'>
              Don’t have an account?{" "}
              <button className='font-semibold text-primary hover:text-accent transition-colors'>
                Sign up now
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EduComposeLogin;
