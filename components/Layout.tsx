
import React, { useState } from 'react';
import { Team, UserRole } from '../types';
import { ADMIN_PIN } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  teams: Team[];
  currentTeam: Team | null;
  onTeamLogin: (teamId: string, pin: string) => Team | null;
  onTeamLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, role, setRole, teams, currentTeam, onTeamLogin, onTeamLogout }) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isTeamLoginOpen, setIsTeamLoginOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamPin, setTeamPin] = useState('');
  const [error, setError] = useState('');
  const [teamError, setTeamError] = useState('');

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

  const handleTeamLoginSubmit = () => {
    const team = onTeamLogin(selectedTeamId, teamPin);
    if (team) {
      setTeamError('');
      setSelectedTeamId('');
      setTeamPin('');
      setIsTeamLoginOpen(false);
    } else {
      setTeamError('Invalid team PIN');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="bg-therap text-white shadow-lg p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center overflow-hidden border border-white/30">
            <img src="/bbff.jpeg" alt="BBFF Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Intra BBFF League Auction</h1>
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
          {currentTeam && (
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm font-semibold">
              <span>{currentTeam.name}</span>
              <button onClick={onTeamLogout} className="text-xs uppercase tracking-wider text-blue-100 hover:text-white">Logout</button>
            </div>
          )}
          <button
            onClick={() => {
              setIsTeamLoginOpen(true);
              setSelectedTeamId(currentTeam?.id || teams[0]?.id || '');
              setTeamPin('');
              setTeamError('');
            }}
            className="bg-white/10 hover:bg-white/20 text-sm border border-white/20 rounded px-3 py-1 outline-none transition"
          >
            Team Login
          </button>
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

      <main className="flex-1 w-full p-4 md:p-8">
        {children}
      </main>

      <footer className="bg-slate-100 p-4 text-center text-slate-500 text-xs border-t">
        &copy; {new Date().getFullYear()} Intra BBFF League. All Rights Reserved.
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

      {isTeamLoginOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Team Login</h3>
            <p className="text-sm text-gray-600 mb-4">Select your team name, then enter the team PIN to start bidding.</p>

            <label className="block text-sm font-medium text-slate-700 mb-1">Team Name</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-base mb-3 focus:ring-2 focus:ring-therap focus:border-therap outline-none bg-white"
            >
              <option value="" disabled>Select a team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            <label className="block text-sm font-medium text-slate-700 mb-1">Team PIN</label>
            <input
              type="password"
              value={teamPin}
              onChange={(e) => setTeamPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTeamLoginSubmit()}
              className="w-full border border-gray-300 rounded px-3 py-2 text-lg mb-2 focus:ring-2 focus:ring-therap focus:border-therap outline-none"
              placeholder="Enter team PIN"
              autoFocus
            />

            {teamError && <p className="text-red-500 text-sm mb-4">{teamError}</p>}

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setIsTeamLoginOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTeamLoginSubmit}
                className="px-4 py-2 bg-therap text-white rounded hover:bg-blue-700 transition shadow-md"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
