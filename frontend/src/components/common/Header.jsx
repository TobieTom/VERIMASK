// src/components/common/Header.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { Bell, User, LogOut, Menu as MenuIcon } from 'lucide-react';

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [notifications] = useState([
    { id: 1, message: 'New document verification request' },
    { id: 2, message: 'Document verified successfully' },
  ]);

  const handleLogout = () => {
    // Add logout logic here
    localStorage.removeItem('token'); // Remove auth token
    navigate('/login');
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={toggleSidebar}
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            
            <div className="flex-shrink-0 flex items-center ml-4">
              <img
                className="h-8 w-auto"
                src="/VeriMask-logo.svg"
                alt="VeriMask Logo"
              />
              <span className="ml-2 text-xl font-semibold text-gray-900">VeriMask</span>
            </div>
          </div>

          <div className="flex items-center">
            {/* Notifications Dropdown */}
            <Menu as="div" className="relative inline-block text-left mr-4">
              <Menu.Button className="flex items-center p-2 text-gray-400 hover:text-gray-500">
                <span className="sr-only">View notifications</span>
                <div className="relative">
                  <Bell className="h-6 w-6" />
                  {notifications.length > 0 && (
                    <div className="absolute top-0 right-0 -mt-1 -mr-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-xs text-white">{notifications.length}</span>
                    </div>
                  )}
                </div>
              </Menu.Button>

              <Menu.Items className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  {notifications.map((notification) => (
                    <Menu.Item key={notification.id}>
                      {({ active }) => (
                        <a
                          href="#"
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block px-4 py-3 text-sm text-gray-700 border-b border-gray-100`}
                        >
                          {notification.message}
                        </a>
                      )}
                    </Menu.Item>
                  ))}
                  <Menu.Item>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-center text-blue-600 hover:text-blue-500"
                    >
                      View all notifications
                    </a>
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>

            {/* Profile Dropdown */}
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="flex items-center space-x-3 p-2 rounded-full hover:bg-gray-100">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <div className="hidden md:flex md:items-center">
                  <span className="text-sm font-medium text-gray-700">John Doe</span>
                </div>
              </Menu.Button>

              <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="/profile"
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block px-4 py-2 text-sm text-gray-700`}
                      >
                        Your Profile
                      </a>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="/settings"
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block px-4 py-2 text-sm text-gray-700`}
                      >
                        Settings
                      </a>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                      >
                        <div className="flex items-center">
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign out
                        </div>
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;