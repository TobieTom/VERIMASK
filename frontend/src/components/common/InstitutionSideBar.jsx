import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  CheckSquare, 
  Users, 
  Clock, 
  FileCheck, 
  History,
  Settings, 
  UserCircle,
  Activity 
} from 'lucide-react';

const InstitutionSidebar = () => {
  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/institution/dashboard' },
    { name: 'Pending Verifications', icon: Clock, path: '/institution/pending' },
    { name: 'Verified Documents', icon: FileCheck, path: '/institution/verified' },
    { name: 'Verification History', icon: History, path: '/institution/history' },
    { name: 'Verification Document', icon: History, path: '/institution/verification' },
    { name: 'Clients', icon: Users, path: '/institution/clients' },
    { name: 'Settings', icon: Settings, path: '/institution/settings' },
    { name: 'Blockchain Status', icon: Activity, path: '/institution/blockchain-status' },
  ];

  const stats = [
    { name: 'Pending', value: '12' },
    { name: 'Verified Today', value: '25' },
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Institution Status</p>
              <p className="text-xs text-green-500">Active</p>
            </div>
            <div className="h-4 w-4 rounded-full bg-green-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionSidebar;