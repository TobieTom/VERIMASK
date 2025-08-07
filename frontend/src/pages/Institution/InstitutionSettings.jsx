// src/pages/institution/Settings.jsx
import React, { useState } from 'react';
import { Bell, Lock, Shield, Users, Mail, Clock, AlertTriangle } from 'lucide-react';

const InstitutionSettings = () => {
  const [notifications, setNotifications] = useState({
    newDocuments: true,
    verificationUpdates: true,
    clientUpdates: false,
    systemUpdates: true,
    emailNotifications: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    loginNotifications: true,
    autoLogout: '30',
    ipRestriction: false,
    passwordExpiry: '90'
  });

  const [verificationSettings, setVerificationSettings] = useState({
    autoAssignment: true,
    requireNotes: true,
    allowBulkVerification: false,
    verificationTimeout: '24',
    maxDailyVerifications: '50',
    requiredChecks: ['identity', 'expiry', 'authenticity']
  });

  const [emailSettings, setEmailSettings] = useState({
    dailyDigest: true,
    verificationAlerts: true,
    clientReports: false,
    securityAlerts: true
  });

  const handleNotificationChange = (setting) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSecurityChange = (setting, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleVerificationChange = (setting, value) => {
    setVerificationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleEmailSettingChange = (setting) => {
    setEmailSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const saveSettings = () => {
    // Handle saving all settings
    console.log('Saving settings...', {
      notifications,
      securitySettings,
      verificationSettings,
      emailSettings
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Institution Settings</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage your institution's verification settings and preferences
            </p>
          </div>
          <button
            onClick={saveSettings}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Notification Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </h3>
              <div className="mt-6 space-y-4">
                {Object.entries(notifications).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="flex-grow text-sm text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <button
                      onClick={() => handleNotificationChange(key)}
                      className={`${
                        enabled
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </h3>
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">Add an extra layer of security</p>
                  </div>
                  <button
                    onClick={() => handleSecurityChange('twoFactorAuth', !securitySettings.twoFactorAuth)}
                    className={`${
                      securitySettings.twoFactorAuth
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        securitySettings.twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Auto Logout Timer</label>
                  <select
                    value={securitySettings.autoLogout}
                    onChange={(e) => handleSecurityChange('autoLogout', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Password Expiry</label>
                  <select
                    value={securitySettings.passwordExpiry}
                    onChange={(e) => handleSecurityChange('passwordExpiry', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Process Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Verification Process
              </h3>
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Auto-Assignment</p>
                    <p className="text-sm text-gray-500">Automatically assign verifications</p>
                  </div>
                  <button
                    onClick={() => handleVerificationChange('autoAssignment', !verificationSettings.autoAssignment)}
                    className={`${
                      verificationSettings.autoAssignment
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        verificationSettings.autoAssignment ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Verification Timeout</label>
                  <select
                    value={verificationSettings.verificationTimeout}
                    onChange={(e) => handleVerificationChange('verificationTimeout', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="12">12 hours</option>
                    <option value="24">24 hours</option>
                    <option value="48">48 hours</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Daily Verification Limit</label>
                  <select
                    value={verificationSettings.maxDailyVerifications}
                    onChange={(e) => handleVerificationChange('maxDailyVerifications', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="25">25 verifications</option>
                    <option value="50">50 verifications</option>
                    <option value="100">100 verifications</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Require Notes</p>
                    <p className="text-sm text-gray-500">Require notes for all verifications</p>
                  </div>
                  <button
                    onClick={() => handleVerificationChange('requireNotes', !verificationSettings.requireNotes)}
                    className={`${
                      verificationSettings.requireNotes
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        verificationSettings.requireNotes ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Email Preferences
              </h3>
              <div className="mt-6 space-y-4">
                {Object.entries(emailSettings).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="flex-grow text-sm text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <button
                      onClick={() => handleEmailSettingChange(key)}
                      className={`${
                        enabled
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionSettings;