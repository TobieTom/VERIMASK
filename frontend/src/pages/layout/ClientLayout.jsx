// src/pages/layout/ClientLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';
import Header from '../../components/common/Header';
import ClientSidebar from '../../components/common/ClientSidebar';
import Footer from '../../components/common/Footer';
import { Wallet, AlertTriangle } from 'lucide-react';

const ClientLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { wallet, connectWallet, isConnecting } = useWallet();

  // Function to toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Function to close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  // Connect wallet if not connected
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  // Wallet connection banner
  const WalletBanner = () => {
    if (wallet) return null; // Don't show if wallet is connected
    
    return (
      <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <p className="text-sm text-yellow-700">
              Please connect your wallet to use blockchain features
            </p>
          </div>
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Wallet Banner */}
      <WalletBanner />
      
      {/* Header */}
      <Header toggleSidebar={toggleSidebar} />

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-30 w-64 transform overflow-y-auto 
            bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <ClientSidebar />
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
            onClick={handleOverlayClick}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex-1">
            {/* Wallet Status (only show when connected) */}
            {wallet && (
              <div className="mt-4 mb-2 flex items-center justify-end">
                <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                  <Wallet className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-xs text-gray-600 font-mono">
                    {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 4)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Content Area */}
            <div className="py-6">
              <Outlet />
            </div>
          </div>

          {/* Footer */}
          <Footer className="mt-auto" />
        </div>
      </div>
    </div>
  );
};

export default ClientLayout;