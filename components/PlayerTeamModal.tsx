import React, { useState, useEffect } from 'react';
import { Player, Team } from '../types';

interface PlayerTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  teams: Team[];
  onAssign: (playerId: string, targetTeamId: string, price: number) => void;
  onRemove: (playerId: string) => void;
}

export const PlayerTeamModal: React.FC<PlayerTeamModalProps> = ({
  isOpen,
  onClose,
  player,
  teams,
  onAssign,
  onRemove
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (player) {
      setSelectedTeamId(player.teamId || '');
      setPrice(player.soldPrice !== undefined ? player.soldPrice : player.basePrice || 0);
      setErrorMsg('');
    }
  }, [player]);

  if (!isOpen || !player) return null;

  const currentTeam = teams.find(t => t.id === player.teamId);
  const targetTeam = teams.find(t => t.id === selectedTeamId);

  // Calculate budget impact
  const isTransfer = player.teamId && selectedTeamId && player.teamId !== selectedTeamId;
  const isSameTeam = player.teamId === selectedTeamId;

  let effectiveBudget = targetTeam ? targetTeam.remainingBudget : 0;
  if (isSameTeam && player.soldPrice) {
    // If updating price on same team, effective budget includes refunding old price
    effectiveBudget += player.soldPrice;
  }

  const remainingAfterTx = targetTeam ? effectiveBudget - price : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      // Unassign / Release player
      onRemove(player.id);
      onClose();
      return;
    }

    if (price < 0) {
      setErrorMsg('Price cannot be negative.');
      return;
    }

    if (targetTeam && remainingAfterTx < 0) {
      if (!confirm(`Warning: Team "${targetTeam.name}" budget will be exceeded by ৳${Math.abs(remainingAfterTx).toLocaleString()}. Proceed anyway?`)) {
        return;
      }
    }

    onAssign(player.id, selectedTeamId, price);
    onClose();
  };

  const handleRelease = () => {
    if (confirm(`Are you sure you want to release ${player.name} from ${currentTeam?.name || 'their team'}? This will refund ৳${(player.soldPrice || 0).toLocaleString()} to the team.`)) {
      onRemove(player.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-therap p-6 text-white flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
              {player.teamId ? 'Transfer / Update Team' : 'Assign to Team'}
            </span>
            <h3 className="text-xl font-bold">{player.name}</h3>
            <p className="text-xs text-blue-100">{player.position} • Base: ৳{player.basePrice?.toLocaleString()}</p>
          </div>
          {player.photoUrl && (
            <img src={player.photoUrl} alt={player.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Current Status */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
              <span className="font-bold text-slate-800">
                {currentTeam ? `Assigned to ${currentTeam.name}` : 'Unsold / Available'}
              </span>
            </div>
            {currentTeam && (
              <span className="text-xs font-black text-green-700 bg-green-100 px-2 py-1 rounded">
                ৳{(player.soldPrice || 0).toLocaleString()}
              </span>
            )}
          </div>

          {/* Target Team Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Select Destination Team
            </label>
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setErrorMsg('');
              }}
              className="w-full border border-slate-300 p-2.5 rounded-xl font-medium outline-therap bg-white text-slate-800"
            >
              <option value="">-- No Team (Release to Unsold Pool) --</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} (Manager: {t.manager} | Balance: ৳{t.remainingBudget.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Purchase / Transfer Price */}
          {selectedTeamId && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Purchase / Transfer Price (৳)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                className="w-full border border-slate-300 p-2.5 rounded-xl font-bold outline-therap text-slate-900"
                required
              />
            </div>
          )}

          {/* Financial Breakdown Preview */}
          {targetTeam && selectedTeamId && (
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>{targetTeam.name} Current Balance:</span>
                <span className="font-bold text-slate-800">৳{targetTeam.remainingBudget.toLocaleString()}</span>
              </div>

              {isTransfer && (
                <div className="flex justify-between text-slate-500 italic">
                  <span>Releasing from {currentTeam?.name} refunds:</span>
                  <span className="font-bold text-green-600">+৳{(player.soldPrice || 0).toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 font-medium">
                <span>Deduction for {player.name}:</span>
                <span className="font-bold text-red-600">-৳{price.toLocaleString()}</span>
              </div>

              <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-sm">
                <span>New {targetTeam.name} Balance:</span>
                <span className={remainingAfterTx < 0 ? "text-red-600" : "text-therap"}>
                  ৳{remainingAfterTx.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-therap text-white py-2.5 px-4 rounded-xl font-bold hover:bg-blue-800 transition shadow"
            >
              {selectedTeamId ? (isTransfer ? 'Confirm Transfer' : isSameTeam ? 'Update Price' : 'Assign Player') : 'Release Player'}
            </button>

            {player.teamId && (
              <button
                type="button"
                onClick={handleRelease}
                className="bg-red-50 text-red-600 border border-red-200 py-2.5 px-4 rounded-xl font-bold hover:bg-red-100 transition"
              >
                Release Player
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 text-slate-600 py-2.5 px-4 rounded-xl font-bold hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
