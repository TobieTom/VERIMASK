import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Wallet } from 'lucide-react';

const RegisterForm = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('client');
  const [walletAddress, setWalletAddress] = useState('');
  const navigate = useNavigate();
  
  // Form submission handler
  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      // Get backend URL from environment variable
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      // Prepare request data
      const requestData = {
        email: data.email,
        fullName: data.fullName,
        password: data.password,
        role: role,
        walletAddress: walletAddress || undefined, // Only include if set
      };
      
      console.log("Registration data:", requestData);
      
      // Make the API call
      const response = await axios.post(`${backendUrl}/auth/register/`, requestData);
      
      console.log("Registration response:", response.data);
      
      // Handle successful registration
      if (response.data.access) {
        // Store token in localStorage
        localStorage.setItem('user', JSON.stringify({
          token: response.data.access,
          refreshToken: response.data.refresh,
          ...response.data.user
        }));
        
        // Set default auth header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        
        toast.success('Registration successful!');
        
        // Redirect based on role
        if (response.data.user.role === 'institution') {
          navigate('/institution/dashboard');
        } else {
          navigate('/client/dashboard');
        }
      } else {
        // If registration succeeded but no tokens were returned, go to login
        toast.success('Registration successful! Please log in.');
        navigate('/login');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Log the error response for debugging
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      let errorMessage = 'Registration failed. Please try again.';
      
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
  const connectWallet = async () => {
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
      
      const address = accounts[0];
      setWalletAddress(address);
      toast.success('Wallet connected successfully!');
      
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  return (
    <div>
      <div>
        <h2 className="mt-2 text-center text-lg font-medium text-gray-900">
          Create your account
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
                Full Name
              </label>
              <input
                type="text"
                {...register('fullName', { required: 'Full name is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.fullName && (
                <p className="mt-2 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

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
                    message: 'Invalid email address'
                  }
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
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: (val) => {
                    if (watch('password') != val) {
                      return "Passwords do not match";
                    }
                  }
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Wallet Connection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Wallet Connection (Optional)
              </label>
              {walletAddress ? (
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-sm text-gray-700">Connected Wallet:</p>
                  <p className="text-sm font-mono text-gray-500 truncate">
                    {walletAddress}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={connectWallet}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Connect MetaMask
                </button>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                {...register('terms', { required: 'You must accept the terms and conditions' })}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the terms and conditions
              </label>
            </div>
            {errors.terms && (
              <p className="mt-2 text-sm text-red-600">{errors.terms.message}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;