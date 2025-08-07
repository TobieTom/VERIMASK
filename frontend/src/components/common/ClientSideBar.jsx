// src/components/common/ClientSidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Upload, FileText, UserCircle, Settings, Activity } from 'lucide-react';

const ClientSidebar = () => {
  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/client/dashboard' },
    { name: 'My Documents', icon: FileText, path: '/client/documents' },
    { name: 'Profile', icon: UserCircle, path: '/client/profile' },
    { name: 'Settings', icon: Settings, path: '/client/settings' },
  ];

  return (
    <div className="h-full w-64 bg-white shadow-lg">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="mt-5 px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0`}
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Wallet Connected</p>
              <p className="text-xs text-gray-500 truncate">0x1234...5678</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSidebar;