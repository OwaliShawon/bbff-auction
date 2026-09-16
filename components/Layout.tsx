import React, { useState } from 'react';
import { Team, UserRole, Season } from '../types';
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
  seasons: Season[];
  activeSeasonId: string;
  setActiveSeasonId: (id: string) => void;
  currentSeasonId: string;
  onCreateNewSeason?: (name: string, year: number, keepTeams: boolean) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  role,
  setRole,
  teams,
  currentTeam,
  onTeamLogin,
  onTeamLogout,
  seasons,
  activeSeasonId,
  setActiveSeasonId,
  currentSeasonId,
  onCreateNewSeason
}) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isTeamLoginOpen, setIsTeamLoginOpen] = useState(false);
  const [isCreateSeasonModalOpen, setIsCreateSeasonModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamPin, setTeamPin] = useState('');
  const [error, setError] = useState('');
  const [teamError, setTeamError] = useState('');

  // New Season form fields
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonYear, setNewSeasonYear] = useState<number>(new Date().getFullYear() + 1);
  const [keepTeams, setKeepTeams] = useState(true);

  const selectedSeason = seasons.find(s => s.id === activeSeasonId) || seasons[0];
  const liveSeason = seasons.find(s => s.id === currentSeasonId) || seasons[0];
  const isArchivedMode = activeSeasonId !== currentSeasonId;

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
    if (pin === ADMIN_PIN) {
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

  const handleCreateSeasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;

    if (onCreateNewSeason) {
      onCreateNewSeason(newSeasonName.trim(), Number(newSeasonYear), keepTeams);
    }

    setIsCreateSeasonModalOpen(false);
    setNewSeasonName('');
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50">
      {/* Main App Header */}
      <header className="bg-therap text-white shadow-lg p-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center overflow-hidden border border-white/30 shrink-0">
              <img src="/bbff.jpeg" alt="BBFF Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-tight">BBFF Intra League Auction</h1>
              <p className="text-[10px] text-blue-200 uppercase font-extrabold tracking-widest">
                {selectedSeason ? selectedSeason.name : 'Season 1 - 2026'}
              </p>
            </div>
          </div>

          {/* Season Switcher for Mobile & Desktop */}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/20">
            <select
              value={activeSeasonId}
              onChange={(e) => setActiveSeasonId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer px-2 py-1"
            >
              {seasons.map(s => (
                <option key={s.id} value={s.id} className="text-slate-800 font-bold">
                  {s.name} {s.id === currentSeasonId ? '🟢 (Live)' : '📜 (Archived)'}
                </option>
              ))}
            </select>
            {role === UserRole.ADMIN && (
              <button
                onClick={() => {
                  setNewSeasonName(`Season ${seasons.length + 1} - ${new Date().getFullYear() + 1}`);
                  setNewSeasonYear(new Date().getFullYear() + 1);
                  setIsCreateSeasonModalOpen(true);
                }}
                title="Start a new season"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded-lg text-xs font-extrabold transition shadow-sm"
              >
                + New
              </button>
            )}
          </div>
        </div>

        <nav className="flex space-x-4 md:space-x-6 font-medium text-sm">
          <button
            onClick={() => setActiveTab('auction')}
            className={`hover:text-blue-200 transition ${activeTab === 'auction' ? 'border-b-2 border-white font-bold' : ''}`}
          >
            Auction Floor
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`hover:text-blue-200 transition ${activeTab === 'players' ? 'border-b-2 border-white font-bold' : ''}`}
          >
            Players
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`hover:text-blue-200 transition ${activeTab === 'teams' ? 'border-b-2 border-white font-bold' : ''}`}
          >
            Teams
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`hover:text-blue-200 transition ${activeTab === 'reports' ? 'border-b-2 border-white font-bold' : ''}`}
          >
            Reports
          </button>
        </nav>

        <div className="flex items-center space-x-3">
          {currentTeam && (
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm font-semibold border border-white/20">
              <span>{currentTeam.name}</span>
              <button onClick={onTeamLogout} className="text-xs uppercase tracking-wider text-blue-200 hover:text-white">Logout</button>
            </div>
          )}
          <button
            onClick={() => {
              setIsTeamLoginOpen(true);
              setSelectedTeamId(currentTeam?.id || teams[0]?.id || '');
              setTeamPin('');
              setTeamError('');
            }}
            className="bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/20 rounded-xl px-3 py-1.5 outline-none transition"
          >
            Team Login
          </button>
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            className="bg-blue-900 text-xs font-bold border border-blue-700 rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:bg-blue-800 transition"
          >
            <option value={UserRole.ADMIN}>Admin Mode</option>
            <option value={UserRole.VIEWER}>Viewer Mode</option>
          </select>
        </div>
      </header>

      {/* Historical Season Archived Notice Banner */}
      {isArchivedMode && (
        <div className="bg-amber-500 text-amber-950 p-3 text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-inner border-b border-amber-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          📜 You are viewing historical data for "{selectedSeason.name}". Live auction is on "{liveSeason.name}".
          <button
            onClick={() => setActiveSeasonId(currentSeasonId)}
            className="underline font-bold hover:text-white ml-2 uppercase"
          >
            Switch to Live Auction
          </button>
        </div>
      )}

      <main className="flex-1 w-full p-4 md:p-8">
        {children}
      </main>

      <footer className="bg-slate-100 p-4 text-center text-slate-500 text-xs border-t">
        &copy; {new Date().getFullYear()} BBFF Intra League • {selectedSeason ? selectedSeason.name : 'Season 1 - 2026'}. All Rights Reserved.
      </footer>

      {/* PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Admin Access</h3>
            <p className="text-xs text-gray-500 mb-4">Please enter the PIN to switch to Admin mode.</p>

            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-lg mb-2 focus:ring-2 focus:ring-therap focus:border-therap outline-none"
              placeholder="Enter Admin PIN"
              autoFocus
            />

            {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                className="px-4 py-2 bg-therap text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Login Modal */}
      {isTeamLoginOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Team Login</h3>
            <p className="text-xs text-gray-500 mb-4">Select your team name, then enter the team PIN to start bidding.</p>

            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Team Name</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-therap focus:border-therap outline-none bg-white font-medium"
            >
              <option value="" disabled>Select a team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Team PIN</label>
            <input
              type="password"
              value={teamPin}
              onChange={(e) => setTeamPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTeamLoginSubmit()}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-lg mb-2 focus:ring-2 focus:ring-therap focus:border-therap outline-none"
              placeholder="Enter team PIN"
              autoFocus
            />

            {teamError && <p className="text-red-500 text-xs mb-4">{teamError}</p>}

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setIsTeamLoginOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleTeamLoginSubmit}
                className="px-4 py-2 bg-therap text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start New Season Modal */}
      {isCreateSeasonModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <span>🏆</span> Start New League Season
            </h3>
            <p className="text-xs text-slate-500">
              This will archive the current active season ("{liveSeason.name}") and preserve all its historical sold prices, squads, and reports permanently in the database.
            </p>

            <form onSubmit={handleCreateSeasonSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Season Name</label>
                <input
                  type="text"
                  required
                  value={newSeasonName}
                  onChange={e => setNewSeasonName(e.target.value)}
                  placeholder="e.g. Season 2 - 2027"
                  className="w-full border p-2.5 rounded-xl text-sm outline-therap font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Season Year</label>
                <input
                  type="number"
                  required
                  value={newSeasonYear}
                  onChange={e => setNewSeasonYear(Number(e.target.value))}
                  placeholder="2027"
                  className="w-full border p-2.5 rounded-xl text-sm outline-therap font-medium"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="keepTeams"
                  checked={keepTeams}
                  onChange={e => setKeepTeams(e.target.checked)}
                  className="mt-1 w-4 h-4 text-therap rounded outline-none"
                />
                <label htmlFor="keepTeams" className="text-xs text-slate-700 font-medium cursor-pointer">
                  <span className="font-bold block text-slate-800">Carry over registered teams & managers</span>
                  Resets team purse balances to starting initial budget (৳150,000) while keeping team logins and manager PINs intact.
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSeasonModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-md"
                >
                  Create & Launch Season
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
