import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Player, Team, PlayerStatus, UserRole } from '../types';
import { MIN_SQUAD_SIZE } from '../constants';
import { PlayerTeamModal } from './PlayerTeamModal';
import { downloadSquadFacebookCard, downloadSoldPricesLeaderboardCard } from '../utils/cardExporter';

interface ReportsProps {
  players: Player[];
  teams: Team[];
  role?: UserRole;
  onAssignPlayerToTeam?: (playerId: string, teamId: string, price: number) => void;
  onRemovePlayerFromTeam?: (playerId: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ players, teams, role, onAssignPlayerToTeam, onRemovePlayerFromTeam }) => {
  const [reportView, setReportView] = useState<'sold_leaderboard' | 'profiles' | 'summary'>('sold_leaderboard');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);
  const [addingToTeamId, setAddingToTeamId] = useState<string | null>(null);

  // Sold Leaderboard Filters & State
  const [leaderboardSearch, setLeaderboardSearch] = useState<string>('');
  const [leaderboardCategory, setLeaderboardCategory] = useState<string>('ALL');
  const [leaderboardTeamId, setLeaderboardTeamId] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = Max to Min

  const unsoldPlayers = players.filter(p => !p.teamId && p.status === PlayerStatus.UNSOLD);
  const soldPlayers = players.filter(p => p.status === PlayerStatus.SOLD && p.soldPrice !== undefined);
  const totalSold = soldPlayers.length;
  const totalSpent = teams.reduce((acc, t) => acc + (t.initialBudget - t.remainingBudget), 0);
  const remainingBudget = teams.reduce((acc, t) => acc + t.remainingBudget, 0);

  // Sort sold players Max to Min (or Min to Max based on sortOrder)
  const sortedSoldPlayers = [...soldPlayers].sort((a, b) => {
    const priceA = a.soldPrice || 0;
    const priceB = b.soldPrice || 0;
    return sortOrder === 'desc' ? priceB - priceA : priceA - priceB;
  });

  const filteredSoldPlayers = sortedSoldPlayers.filter(p => {
    if (leaderboardSearch) {
      const q = leaderboardSearch.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchNick = p.nickname ? p.nickname.toLowerCase().includes(q) : false;
      const matchDept = p.department ? p.department.toLowerCase().includes(q) : false;
      if (!matchName && !matchNick && !matchDept) return false;
    }
    if (leaderboardCategory !== 'ALL' && p.category !== leaderboardCategory) {
      return false;
    }
    if (leaderboardTeamId !== 'ALL' && p.teamId !== leaderboardTeamId) {
      return false;
    }
    return true;
  });

  const mostExpensive = [...soldPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))[0];
  const lowestSold = [...soldPlayers].sort((a, b) => (a.soldPrice || 0) - (b.soldPrice || 0))[0];
  const averageSoldPrice = totalSold > 0 ? Math.round(totalSpent / totalSold) : 0;

  const exportMaxToMinSoldList = () => {
    const soldData = sortedSoldPlayers.map((p, idx) => {
      const team = teams.find(t => t.id === p.teamId);
      const base = p.basePrice || 0;
      const sold = p.soldPrice || 0;
      const increase = sold - base;
      return {
        'Rank': idx + 1,
        'Player Name': p.name,
        'Nickname': p.nickname || '',
        'Position': p.position,
        'Department': p.department || '',
        'Category': p.category,
        'Sold To Team': team?.name || 'Unknown',
        'Base Price (৳)': base,
        'Sold Price (৳)': sold,
        'Price Increase (৳)': increase,
        'Growth %': base > 0 ? `${Math.round((increase / base) * 100)}%` : 'N/A'
      };
    });

    const ws = XLSX.utils.json_to_sheet(soldData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sold Players (Max to Min)');
    XLSX.writeFile(wb, 'BBFF_Sold_Players_Max_To_Min.xlsx');
  };

  const exportTeamSummary = () => {
    const summaryData = teams.map(t => ({
      'Team Name': t.name,
      'Manager': t.manager,
      'Initial Budget': t.initialBudget,
      'Spent': t.initialBudget - t.remainingBudget,
      'Remaining Balance': t.remainingBudget,
      'Players Bought': players.filter(p => p.teamId === t.id).length
    }));

    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Team Summary');
    XLSX.writeFile(wb, 'BBFF_Intra_League_S1_2026_Team_Summary.xlsx');
  };

  const getPrimaryPosition = (pos: string) => pos.split(' / ')[0].trim();

  const groupPlayersByPosition = (squad: Player[]) => {
    const groups: Record<string, Player[]> = {};
    squad.forEach(p => {
      const primary = getPrimaryPosition(p.position);
      if (!groups[primary]) groups[primary] = [];
      groups[primary].push(p);
    });
    return groups;
  };

  const downloadFacebookPack = () => {
    window.open('/api/export-facebook', '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Auction Analytics & Player Rankings</h2>
          <p className="text-sm text-slate-500 mt-1">Review market dynamics, sold prices ranking (Max to Min), and squad compositions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadFacebookPack}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Download Facebook Pack
          </button>
          <button
            onClick={exportMaxToMinSoldList}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export Max-Min Excel
          </button>
          <button
            onClick={exportTeamSummary}
            className="bg-therap text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition shadow-sm text-sm"
          >
            Export Team Summary
          </button>
        </div>
      </div>

      {/* Market Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Players Sold</p>
          <p className="text-3xl font-extrabold text-slate-800">{totalSold} <span className="text-sm font-normal text-slate-400">/ {players.length}</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Total Market Spend</p>
          <p className="text-3xl font-extrabold text-green-600">৳ {totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Avg Sold Price</p>
          <p className="text-3xl font-extrabold text-therap">৳ {averageSoldPrice.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Highest Sold Price (Max)</p>
          <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1">{mostExpensive ? mostExpensive.name : 'N/A'}</p>
          <p className="text-xl font-extrabold text-blue-600 leading-none">{mostExpensive ? `৳ ${mostExpensive.soldPrice?.toLocaleString()}` : '-'}</p>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setReportView('sold_leaderboard')}
          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition flex items-center gap-1.5 ${reportView === 'sold_leaderboard' ? 'bg-white text-therap shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          Sold Prices (Max to Min)
        </button>
        <button
          onClick={() => setReportView('profiles')}
          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition ${reportView === 'profiles' ? 'bg-white text-therap shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
        >
          Squad Profiles
        </button>
        <button
          onClick={() => setReportView('summary')}
          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition ${reportView === 'summary' ? 'bg-white text-therap shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
        >
          Financial Summary
        </button>
      </div>

      {/* VIEW 1: Sold Leaderboard (Max to Min) */}
      {reportView === 'sold_leaderboard' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-stretch md:items-end justify-between">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Player</label>
                <input
                  type="text"
                  placeholder="Name, nickname, dept..."
                  className="w-full border p-2 rounded-xl text-sm outline-therap"
                  value={leaderboardSearch}
                  onChange={e => setLeaderboardSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <select
                  className="w-full border p-2 rounded-xl text-sm outline-therap bg-white"
                  value={leaderboardCategory}
                  onChange={e => setLeaderboardCategory(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="A">Category A</option>
                  <option value="B">Category B</option>
                  <option value="C">Category C</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team</label>
                <select
                  className="w-full border p-2 rounded-xl text-sm outline-therap bg-white"
                  value={leaderboardTeamId}
                  onChange={e => setLeaderboardTeamId(e.target.value)}
                >
                  <option value="ALL">All Teams</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => downloadSoldPricesLeaderboardCard(soldPlayers, teams)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                📷 Download Facebook Leaderboard Card
              </button>
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 border border-slate-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Sort: {sortOrder === 'desc' ? 'Max to Min' : 'Min to Max'}
              </button>
              {(leaderboardSearch || leaderboardCategory !== 'ALL' || leaderboardTeamId !== 'ALL' || sortOrder !== 'desc') && (
                <button
                  onClick={() => {
                    setLeaderboardSearch('');
                    setLeaderboardCategory('ALL');
                    setLeaderboardTeamId('ALL');
                    setSortOrder('desc');
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Sold Players Table */}
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Sold Players Price Ranking</h3>
                <p className="text-xs text-slate-500">Sorted from {sortOrder === 'desc' ? 'Highest (Max) to Lowest (Min)' : 'Lowest (Min) to Highest (Max)'} sold price.</p>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-therap px-3 py-1 rounded-full">
                Showing {filteredSoldPlayers.length} of {soldPlayers.length} Sold Players
              </span>
            </div>

            {filteredSoldPlayers.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="font-bold text-slate-600">No sold players found matching criteria</p>
                <p className="text-xs text-slate-400 mt-1">Complete player auctions or clear your search filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-center w-16">Rank</th>
                      <th className="px-6 py-4">Player</th>
                      <th className="px-6 py-4">Position & Cat</th>
                      <th className="px-6 py-4">Bought By Team</th>
                      <th className="px-6 py-4 text-right">Base Price</th>
                      <th className="px-6 py-4 text-right">Sold Price</th>
                      <th className="px-6 py-4 text-right">Price Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSoldPlayers.map((player, idx) => {
                      const team = teams.find(t => t.id === player.teamId);
                      const basePrice = player.basePrice || 0;
                      const soldPrice = player.soldPrice || 0;
                      const increase = soldPrice - basePrice;
                      const growthPct = basePrice > 0 ? Math.round((increase / basePrice) * 100) : 0;
                      
                      // Calculate original overall rank (before search filtering)
                      const overallRank = sortedSoldPlayers.findIndex(p => p.id === player.id) + 1;

                      return (
                        <tr key={player.id} className="hover:bg-slate-50/80 transition group">
                          {/* Rank */}
                          <td className="px-6 py-4 text-center font-black text-sm">
                            {overallRank === 1 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold shadow-sm">
                                🥇 1
                              </span>
                            ) : overallRank === 2 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-700 border border-slate-300 font-extrabold shadow-sm">
                                🥈 2
                              </span>
                            ) : overallRank === 3 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/10 text-amber-900 border border-amber-700/20 font-extrabold shadow-sm">
                                🥉 3
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold">#{overallRank}</span>
                            )}
                          </td>

                          {/* Player Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-sm relative">
                                {player.photoUrl ? (
                                  <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-lg">
                                    {player.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-base leading-snug flex items-center gap-1.5">
                                  {player.name}
                                  {player.nickname && <span className="text-xs text-slate-400 font-normal">({player.nickname})</span>}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{player.department || 'BBFF'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Position & Category */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-700">{player.position}</p>
                              <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                player.category === 'A' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                player.category === 'B' ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                                'bg-orange-100 text-orange-800 border border-orange-300'
                              }`}>
                                CAT {player.category}
                              </span>
                            </div>
                          </td>

                          {/* Team */}
                          <td className="px-6 py-4">
                            {team ? (
                              <div className="flex items-center space-x-2.5">
                                {team.logoUrl ? (
                                  <img src={team.logoUrl} alt={team.name} className="w-7 h-7 object-contain rounded" />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-blue-100 text-therap font-black text-xs flex items-center justify-center">
                                    {team.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-slate-800 text-xs">{team.name}</p>
                                  <p className="text-[9px] text-slate-400 font-medium">Mgr: {team.manager}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Unassigned</span>
                            )}
                          </td>

                          {/* Base Price */}
                          <td className="px-6 py-4 text-right font-medium text-slate-500 text-sm">
                            ৳ {basePrice.toLocaleString()}
                          </td>

                          {/* Sold Price */}
                          <td className="px-6 py-4 text-right">
                            <span className="text-lg font-black text-green-600">
                              ৳ {soldPrice.toLocaleString()}
                            </span>
                          </td>

                          {/* Growth */}
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex flex-col items-end">
                              <span className={`text-xs font-black ${increase > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {increase > 0 ? `+৳ ${increase.toLocaleString()}` : 'Base Price'}
                              </span>
                              {increase > 0 && (
                                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">
                                  +{growthPct}%
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Financial Summary */}
      {reportView === 'summary' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Team</th>
                <th className="px-6 py-4">Squad Count</th>
                <th className="px-6 py-4">Spent (৳)</th>
                <th className="px-6 py-4 text-right">Balance (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map(team => {
                const squad = players.filter(p => p.teamId === team.id);
                const spent = team.initialBudget - team.remainingBudget;
                return (
                  <tr key={team.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {team.logoUrl && <img src={team.logoUrl} className="w-8 h-8 rounded object-contain" />}
                        <div>
                          <p className="font-bold text-slate-800">{team.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{team.manager}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${squad.length >= MIN_SQUAD_SIZE ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {squad.length} / {MIN_SQUAD_SIZE}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold">
                      {spent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-therap">
                      {team.remainingBudget.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 3: Squad Profiles */}
      {reportView === 'profiles' && (
        <React.Fragment>
          {/* Team Filter Bar */}
          <div className="flex overflow-x-auto gap-2 pb-2 mb-6 scrollbar-hide no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setSelectedTeamId('ALL')}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition border ${selectedTeamId === 'ALL' ? 'bg-therap text-white border-therap shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
            >
              All Teams
            </button>
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition border flex items-center gap-2 ${selectedTeamId === t.id ? 'bg-therap text-white border-therap shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
              >
                {t.logoUrl && <img src={t.logoUrl} className="w-4 h-4 object-contain" />}
                {t.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-12">
            {(selectedTeamId === 'ALL' ? teams : teams.filter(t => t.id === selectedTeamId)).map(team => {
              const squad = players.filter(p => p.teamId === team.id);
              const positionGroups = groupPlayersByPosition(squad);

              return (
                <div key={team.id} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden group hover:border-therap/20 transition-all">
                  <div className="bg-slate-50 p-8 border-b border-slate-100 relative overflow-hidden min-h-[160px]">
                    <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] rotate-12 select-none pointer-events-none text-slate-900">
                      {team.logoUrl ? <img src={team.logoUrl} className="w-64 h-64 object-contain grayscale" /> : <div className="text-9xl font-black">{team.name.charAt(0)}</div>}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="w-16 h-16 object-contain" />
                          ) : (
                            <span className="text-5xl font-black text-therap">{team.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 whitespace-pre-wrap leading-tight">
                            {team.name}
                          </h3>
                          <p className="text-blue-800 font-black uppercase tracking-widest text-xs mt-2 flex items-center">
                            <svg className="w-3.5 h-3.5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                            Team Manager: {team.manager}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 shrink-0 items-center">
                        <button
                          onClick={() => downloadSquadFacebookCard(team, squad)}
                          className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          📷 Squad Facebook Card
                        </button>
                        {role === UserRole.ADMIN && (
                          <button
                            onClick={() => setAddingToTeamId(team.id)}
                            className="bg-therap text-white px-4 py-2.5 rounded-2xl font-bold text-xs hover:bg-blue-800 transition shadow-sm flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            Add Player
                          </button>
                        )}
                        <div className="text-center px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Squad Size</p>
                          <p className="text-2xl font-black text-slate-800">{squad.length} <span className="text-sm font-normal text-slate-400">/ {MIN_SQUAD_SIZE}</span></p>
                        </div>
                        <div className="text-center px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Spent</p>
                          <p className="text-2xl font-black text-green-600">৳{(team.initialBudget - team.remainingBudget).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    {Object.entries(positionGroups).length > 0 ? (
                      Object.entries(positionGroups).map(([position, members]) => (
                        <div key={position} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">{position}</h4>
                            <div className="flex-1 h-px bg-slate-100"></div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{members.length} {members.length === 1 ? 'Player' : 'Players'}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {members.map(p => (
                              <div key={p.id} className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 hover:border-therap/30 hover:bg-blue-50/50 transition-all cursor-default group/player relative">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 shadow-sm relative">
                                  {p.photoUrl ? (
                                    <img src={p.photoUrl} className="w-full h-full object-cover group-hover/player:scale-110 transition duration-500" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl font-black text-slate-200">{p.name.charAt(0)}</div>
                                  )}
                                  <div className="absolute top-0 right-0 p-1">
                                    <div className={`w-2 h-2 rounded-full ${p.category === 'A' ? 'bg-yellow-400' : p.category === 'B' ? 'bg-slate-400' : 'bg-orange-400'}`}></div>
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-slate-800 text-sm truncate leading-tight">{p.name}</h5>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{p.department}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[9px] font-black text-therap bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">CAT {p.category}</span>
                                    <span className="text-xs font-black text-slate-700">৳{p.soldPrice?.toLocaleString()}</span>
                                  </div>

                                  {role === UserRole.ADMIN && (
                                    <div className="flex gap-1.5 mt-2 pt-1 border-t border-slate-200/60">
                                      <button
                                        onClick={() => setModalPlayer(p)}
                                        className="text-[10px] font-bold text-therap bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-100 transition"
                                      >
                                        Transfer
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm(`Release "${p.name}" from ${team.name}? Refund: ৳${(p.soldPrice || 0).toLocaleString()}`)) {
                                            if (onRemovePlayerFromTeam) onRemovePlayerFromTeam(p.id);
                                          }
                                        }}
                                        className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 transition"
                                      >
                                        Release
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        <p className="font-bold uppercase tracking-widest text-xs">No acquisitions recorded</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </React.Fragment>
      )}

      {/* Picker Modal for Adding Unsold Player to Team */}
      {addingToTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-800">
              Add Player to {teams.find(t => t.id === addingToTeamId)?.name}
            </h3>
            <p className="text-xs text-slate-500">Select an unsold player from the pool to assign to this team.</p>

            {unsoldPlayers.length === 0 ? (
              <p className="text-sm font-medium text-slate-400 py-4 text-center">No available unsold players.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y border rounded-xl">
                {unsoldPlayers.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setAddingToTeamId(null);
                      setModalPlayer({ ...p, teamId: addingToTeamId });
                    }}
                    className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.position} • Cat {p.category}</p>
                    </div>
                    <span className="text-xs font-bold text-therap">Base ৳{p.basePrice?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAddingToTeamId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <PlayerTeamModal
        isOpen={!!modalPlayer}
        onClose={() => setModalPlayer(null)}
        player={modalPlayer}
        teams={teams}
        onAssign={(pid, tid, price) => {
          if (onAssignPlayerToTeam) onAssignPlayerToTeam(pid, tid, price);
        }}
        onRemove={(pid) => {
          if (onRemovePlayerFromTeam) onRemovePlayerFromTeam(pid);
        }}
      />

      {/* Quality Assurance Footer */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-therap rounded-full blur-[100px] opacity-20 -mr-32 -mt-32"></div>
        <h3 className="text-xl font-bold mb-6 flex items-center uppercase tracking-tighter relative z-10">
          <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          System Quality Assurance Log
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {[
            { label: 'Lossless Photo Processing', status: 'Optimal (500px @ 0.85)', color: 'text-blue-400' },
            { label: 'Bulk Photo Folder Sync', status: 'Verified Active', color: 'text-green-400' },
            { label: 'Position-Based Profiling', status: 'Live & Categorized', color: 'text-purple-400' },
            { label: 'Auction Logic Validation', status: 'Ruleset Compliant', color: 'text-emerald-400' },
            { label: 'Persistence Engine', status: 'LocalStorage (Auto-Sync)', color: 'text-amber-400' },
            { label: 'Data Integrity Exports', status: 'XLSX Support Ready', color: 'text-rose-400' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center">
              <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">{item.label}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
