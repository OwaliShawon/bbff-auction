
import React, { useState } from 'react';
import { UserRole } from '../types';
import { ADMIN_PIN } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, role, setRole }) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleRoleChange = (selectedRole: UserRole) => {
    if (selectedRole === UserRole.ADMIN) {
      setIsPinModalOpen(true);
      setPin('');
      setError('');
    } else {
      setRole(selectedRole);
    }
  };

  const handlePinSubmit = () => {
    if (pin === ADMIN_PIN) { // Hardcoded PIN
      setRole(UserRole.ADMIN);
      setIsPinModalOpen(false);
    } else {
      setError('Incorrect PIN');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="bg-therap text-white shadow-lg p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-therap font-bold">T</div>
          <h1 className="text-xl font-bold tracking-tight">Therap Football Auction</h1>
        </div>

        <nav className="hidden md:flex space-x-6 font-medium">
          <button
            onClick={() => setActiveTab('auction')}
            className={`hover:text-blue-200 transition ${activeTab === 'auction' ? 'border-b-2 border-white' : ''}`}
          >
            Auction Floor
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`hover:text-blue-200 transition ${activeTab === 'players' ? 'border-b-2 border-white' : ''}`}
          >
            Players
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`hover:text-blue-200 transition ${activeTab === 'teams' ? 'border-b-2 border-white' : ''}`}
          >
            Teams
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`hover:text-blue-200 transition ${activeTab === 'reports' ? 'border-b-2 border-white' : ''}`}
          >
            Reports
          </button>
        </nav>

        <div className="flex items-center space-x-4">
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            className="bg-blue-800 text-sm border-none rounded px-2 py-1 outline-none cursor-pointer hover:bg-blue-700 transition"
          >
            <option value={UserRole.ADMIN}>Admin Mode</option>
            <option value={UserRole.VIEWER}>Viewer Mode</option>
          </select>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {children}
      </main>

      <footer className="bg-slate-100 p-4 text-center text-slate-500 text-xs border-t">
        &copy; {new Date().getFullYear()} Therap Football Tournament. All Rights Reserved.
      </footer>

      {/* PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Admin Access</h3>
            <p className="text-sm text-gray-600 mb-4">Please enter the PIN to switch to Admin mode.</p>

            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              className="w-full border border-gray-300 rounded px-3 py-2 text-lg mb-2 focus:ring-2 focus:ring-therap focus:border-therap outline-none"
              placeholder="Enter PIN"
              autoFocus
            />

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                className="px-4 py-2 bg-therap text-white rounded hover:bg-blue-700 transition shadow-md"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
