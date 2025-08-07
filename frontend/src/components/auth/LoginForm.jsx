import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Wallet } from 'lucide-react';

const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('client');
  const navigate = useNavigate();
  
  // Form submission handler
  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      // Get backend URL from environment variable
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      // Prepare request data with role - backend expects username, not email
      const requestData = {
        username: data.email,  // Backend expects username field
        password: data.password,
        role: role
      };
      
      // Make the API call
      const response = await axios.post(`${backendUrl}/auth/token/`, requestData);
      
      // Handle successful login
      if (response.data.access) {
        // Store token in localStorage
        localStorage.setItem('user', JSON.stringify({
          token: response.data.access,
          refreshToken: response.data.refresh,
          ...response.data.user
        }));
        
        // Set default auth header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        
        toast.success('Login successful!');
        
        // Redirect based on role
        if (response.data.user.role === 'institution') {
          navigate('/institution/dashboard');
        } else {
          navigate('/client/dashboard');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Log the error response for debugging
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      let errorMessage = 'Login failed. Please check your credentials.';
      
      // If the server returned a specific error message, use it
      if (error.response && error.response.data) {
        if (error.response.data.detail) {
          errorMessage = Array.isArray(error.response.data.detail) 
            ? error.response.data.detail[0] 
            : error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet connection handler
  const handleWalletConnect = async () => {
    try {
      if (!window.ethereum) {
        toast.error('MetaMask not detected. Please install MetaMask to use this feature.');
        return;
      }
      
      // Request wallet connection
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        toast.error('No accounts found. Please check your MetaMask extension.');
        return;
      }
      
      const walletAddress = accounts[0];
      
      // Create a message for signing
      const message = `Login to eKYC app at ${new Date().toISOString().split('T')[0]}`;
      
      // Request message signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress]
      });
      
      // Now call the backend to verify the signature
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await axios.post(`${backendUrl}/auth/wallet/`, {
        walletAddress,
        message,
        signature
      });
      
      // Handle successful wallet authentication
      if (response.data.access) {
        // Store user data
        localStorage.setItem('user', JSON.stringify({
          token: response.data.access,
          refreshToken: response.data.refresh,
          walletAddress,
          ...response.data.user
        }));
        
        // Set auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        
        toast.success('Wallet connected successfully!');
        
        // Redirect based on role
        if (response.data.user.role === 'institution') {
          navigate('/institution/dashboard');
        } else {
          navigate('/client/dashboard');
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  return (
    <div>
      <div>
        <h2 className="mt-2 text-center text-lg font-medium text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-6">
        <div className="space-y-6">
          {/* Role selection tabs */}
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`px-4 py-2 text-sm font-medium flex-1 ${
                role === 'client'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:text-gray-500'
              } border border-gray-300 rounded-l-md`}
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => setRole('institution')}
              className={`px-4 py-2 text-sm font-medium flex-1 ${
                role === 'institution'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:text-gray-500'
              } border border-gray-300 border-l-0 rounded-r-md`}
            >
              Institution
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                {...register('password', {
                  required: 'Password is required',
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleWalletConnect}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Wallet className="h-5 w-5 mr-2" />
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;