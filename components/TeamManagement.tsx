
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Team, UserRole } from '../types';
import { DEFAULT_TEAM_BUDGET } from '../constants';
import { generateUUID } from '../utils';

interface TeamManagementProps {
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  role: UserRole;
  onUpdateLogo: (id: string, url: string) => void;
  onClearAll: () => void;
}

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

const generateTeamPin = () => Math.floor(1000 + Math.random() * 9000).toString();

export const TeamManagement: React.FC<TeamManagementProps> = ({ teams, setTeams, role, onUpdateLogo, onClearAll }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '', manager: '', pin: '', initialBudget: DEFAULT_TEAM_BUDGET });
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const team: Team = {
      ...newTeam,
      id: generateUUID(),
      pin: newTeam.pin.trim() || generateTeamPin(),
      remainingBudget: newTeam.initialBudget
    };
    setTeams([...teams, team]);
    setNewTeam({ name: '', manager: '', pin: '', initialBudget: DEFAULT_TEAM_BUDGET });
    setShowForm(false);
  };

  const handleLogoUpload = async (teamId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file, 400, 400);
        onUpdateLogo(teamId, resizedBase64);
      } catch (error) {
        console.error("Error resizing logo:", error);
        alert("Failed to process logo.");
      }
    }
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    const normalized: Team = {
      ...editingTeam,
      name: editingTeam.name.trim(),
      manager: editingTeam.manager.trim(),
      pin: editingTeam.pin.trim(),
      initialBudget: Number(editingTeam.initialBudget) || 0,
      remainingBudget: Number(editingTeam.remainingBudget) || 0,
    };

    setTeams(teams.map(team => (team.id === normalized.id ? normalized : team)));
    setEditingTeam(null);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const importedTeams: Team[] = data.map(item => {
          const name = item['Team Name'] || item['Name'] || 'New Team';
          const manager = item['Team Manager'] || item['Manager Name'] || item['Manager'] || item['Owner Name'] || item['Owner'] || item['Dept'] || item['Department'] || 'Unknown Manager';
          const pin = String(item['Team PIN'] || item['PIN'] || item['Passcode'] || generateTeamPin()).trim();
          const budget = Number(item['Initial Budget'] || item['Starting Budget'] || item['Budget'] || DEFAULT_TEAM_BUDGET);

          return {
            id: generateUUID(),
            name: String(name).trim(),
            manager: String(manager).trim(),
            pin,
            initialBudget: isNaN(budget) ? DEFAULT_TEAM_BUDGET : budget,
            remainingBudget: isNaN(budget) ? DEFAULT_TEAM_BUDGET : budget
          };
        });

        if (importedTeams.length === 0) {
          alert("No valid team data found.");
          return;
        }

        setTeams(importedTeams);
        alert(`Successfully imported ${importedTeams.length} teams!`);
      } catch (err) {
        alert("Error parsing Team Excel file.");
      } finally {
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Team Registry</h2>
        {role === UserRole.ADMIN && (
          <div className="flex flex-wrap gap-3">
            {/* <button
              onClick={onClearAll}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition shadow-sm text-sm"
            >
              Clear All Teams
            </button>
            <button
              onClick={() => excelInputRef.current?.click()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow flex items-center text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              Import Teams
            </button>
            <input
              type="file"
              ref={excelInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
            /> */}
            <button
              onClick={() => setShowForm(true)}
              className="bg-therap text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition shadow text-sm"
            >
              + Register Team
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col group transition hover:shadow-lg">
            <div className="p-6 flex flex-col space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight truncate">{team.name}</h3>
                  <p className="text-slate-500 text-sm font-medium">{team.manager}</p>
                  {role === UserRole.ADMIN && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">PIN: {team.pin}</p>
                  )}
                </div>
                <div className="relative w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ml-4 group">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-therap font-black text-2xl">{team.name.charAt(0)}</span>
                  )}
                  {role === UserRole.ADMIN && (
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={(e) => handleLogoUpload(team.id, e)}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4 space-y-2 border-t border-slate-50">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Balance</span>
                  <span className="text-therap">৳ {team.remainingBudget}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-therap"
                    style={{ width: `${(team.remainingBudget / team.initialBudget) * 100}%` }}
                  ></div>
                </div>
                {role === UserRole.ADMIN && (
                  <button
                    type="button"
                    onClick={() => setEditingTeam({ ...team })}
                    className="w-full mt-3 bg-slate-100 text-slate-700 py-2 rounded font-bold text-sm hover:bg-slate-200 transition"
                  >
                    Edit Team
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
          <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          <p className="text-lg font-medium">Registry is empty</p>
          <p className="text-sm">Import Teams via Excel or register them manually.</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-md">
            <h3 className="text-xl font-bold mb-4">Register New Team</h3>
            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Team Name</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={newTeam.name}
                  onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Team Manager</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={newTeam.manager}
                  onChange={e => setNewTeam({ ...newTeam, manager: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Team PIN</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={newTeam.pin}
                  onChange={e => setNewTeam({ ...newTeam, pin: e.target.value })}
                  placeholder="Leave blank to auto-generate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Starting Budget (৳)</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded mt-1"
                  value={newTeam.initialBudget}
                  onChange={e => setNewTeam({ ...newTeam, initialBudget: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button type="submit" className="flex-1 bg-therap text-white py-2 rounded font-bold">Register</button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-md">
            <h3 className="text-xl font-bold mb-4">Edit Team</h3>
            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Team Name</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={editingTeam.name}
                  onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Team Manager</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={editingTeam.manager}
                  onChange={e => setEditingTeam({ ...editingTeam, manager: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Team PIN</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={editingTeam.pin}
                  onChange={e => setEditingTeam({ ...editingTeam, pin: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Initial Budget (৳)</label>
                  <input
                    type="number"
                    className="w-full border p-2 rounded mt-1"
                    value={editingTeam.initialBudget}
                    onChange={e => setEditingTeam({ ...editingTeam, initialBudget: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Remaining Budget (৳)</label>
                  <input
                    type="number"
                    className="w-full border p-2 rounded mt-1"
                    value={editingTeam.remainingBudget}
                    onChange={e => setEditingTeam({ ...editingTeam, remainingBudget: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-2 pt-2">
                <button type="submit" className="flex-1 bg-therap text-white py-2 rounded font-bold">Save Changes</button>
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
