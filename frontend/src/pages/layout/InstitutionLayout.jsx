// src/layouts/InstitutionLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import InstitutionSidebar from '../../components/common/InstitutionSideBar';
import Footer from '../../components/common/Footer';
import { toast } from 'react-hot-toast';

const InstitutionLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Example of auth check for institution users
  // useEffect(() => {
  //   const token = localStorage.getItem('token');
  //   const userRole = localStorage.getItem('userRole');

  //   if (!token) {
  //     navigate('/login');
  //     return;
  //   }

  //   // Check if user is an institution
  //   if (userRole !== 'institution') {
  //     toast.error('Unauthorized access. Institution access only.');
  //     navigate('/login');
  //   }
  // }, [navigate]);

  // Function to toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Function to close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
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
          <InstitutionSidebar />
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
          {/* Content Container */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex-1">
            {/* Content Area - Renders child routes */}
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

export default InstitutionLayout;