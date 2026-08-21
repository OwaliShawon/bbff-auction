
import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Player, Team, AuctionState, UserRole, PlayerStatus, PlayerCategory, AuctionLogEntry } from '../types';
import { getDynamicIncrement, MIN_SQUAD_SIZE } from '../constants';

interface AuctionDashboardProps {
  players: Player[];
  teams: Team[];
  auction: AuctionState;
  role: UserRole;
  currentTeam: Team | null;
  onStartAuction: (id: string) => void;
  onIncreaseBid: (teamId: string, amount?: number) => void;
  onMatchBid: (teamId: string) => void;
  onFinalizeSale: () => void;
  onTieLottery: () => void;
  onSkipForNow: () => void;
  auctionLog: AuctionLogEntry[];
}

export const AuctionDashboard: React.FC<AuctionDashboardProps> = ({
  players, teams, auction, role, currentTeam, onStartAuction, onIncreaseBid, onMatchBid, onFinalizeSale, onTieLottery, onSkipForNow, auctionLog
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | PlayerCategory>('ALL');
  const [manualBids, setManualBids] = useState<Record<string, string>>({});

  const currentPlayer = players.find(p => p.id === auction.currentPlayerId);
  const unsoldPlayers = players.filter(p => (p.status === PlayerStatus.UNSOLD || p.status === PlayerStatus.DISTRIBUTED) && !p.soldPrice);
  const soldPlayers = players.filter(p => p.status === PlayerStatus.SOLD);

  const totalSold = soldPlayers.length + players.filter(p => p.category === PlayerCategory.M).length;

  const filteredQueue = unsoldPlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Grouping logic for the sidebar queue
  const groupedQueue = {
    [PlayerCategory.A]: filteredQueue.filter(p => p.category === PlayerCategory.A),
    [PlayerCategory.B]: filteredQueue.filter(p => p.category === PlayerCategory.B),
    [PlayerCategory.C]: filteredQueue.filter(p => p.category === PlayerCategory.C),
  };

  const biddingTeams = auction.biddingTeamIds.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];

  const handleManualBidSubmit = (teamId: string) => {
    const amount = parseInt(manualBids[teamId]);
    if (isNaN(amount)) return;
    onIncreaseBid(teamId, amount);
    setManualBids(prev => ({ ...prev, [teamId]: '' }));
  };

  const nextIncrement = currentPlayer ? getDynamicIncrement(currentPlayer.category, auction.currentBid) : 0;

  // Confetti Effect for Sold Players
  const prevLastAction = useRef<string | undefined>(auction.lastAction);

  useEffect(() => {
    if (prevLastAction.current !== 'SOLD' && auction.lastAction === 'SOLD') {
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        // Launch a few confetti from the left edge
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
        });
        // and a few from the right edge
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
    prevLastAction.current = auction.lastAction;
  }, [auction.lastAction]);

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      {/* Left Vertical Section - Tournament Progress */}
      <div className="hidden xl:flex flex-col w-60 shrink-0 sticky top-24 space-y-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-3">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-relaxed">Tournament<br />Progress</p>
          <div className="w-10 h-1 bg-therap rounded-full opacity-20"></div>
          <div>
            <h2 className="text-3xl font-black text-slate-800">{totalSold}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">/ {players.length} Players</p>
          </div>
        </div>

        {/* Auction Log Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-start text-left space-y-3 max-h-[400px]">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-relaxed w-full border-b pb-2">Auction Log</p>
          <div className="w-full flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {auctionLog.map((log) => (
              <div key={log.id} className="text-[9px] border-b border-slate-50 last:border-0 pb-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span className={`font-black uppercase tracking-wider ${log.action === 'SOLD' ? 'text-green-600' :
                    log.action === 'UNSOLD' ? 'text-red-500' :
                      log.action === 'SKIP' ? 'text-orange-400' :
                        log.action === 'BID' ? 'text-blue-500' :
                          'text-slate-500'
                    }`}>{log.action}</span>
                  <span className="text-slate-300 text-[8px]">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <p className="text-slate-600 font-medium leading-tight">
                  {log.action === 'START' && <span>Started <span className="font-bold text-slate-800">{log.playerName}</span></span>}
                  {log.action === 'BID' && <span><span className="font-bold text-slate-800">{log.teamName}</span> bid <span className="font-bold text-therap">৳{log.amount}</span> for {log.playerName}</span>}
                  {log.action === 'SOLD' && <span>Sold <span className="font-bold text-slate-800">{log.playerName}</span> to <span className="font-bold text-slate-800">{log.teamName}</span> for <span className="font-bold text-therap">৳{log.amount}</span></span>}
                  {log.action === 'UNSOLD' && <span><span className="font-bold text-slate-800">{log.playerName}</span> Unsold</span>}
                  {log.action === 'SKIP' && <span>Skipped <span className="font-bold text-slate-800">{log.playerName}</span></span>}
                </p>
              </div>
            ))}
            {auctionLog.length === 0 && (
              <p className="text-[9px] text-slate-300 italic text-center py-2">No activity yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-6">
        {/* Top Stats - Mobile/Tablet Only */}
        <div className="xl:hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Tournament Progress</p>
            <h2 className="text-3xl font-black text-slate-800">Players</h2>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black text-therap">
              {totalSold} <span className="text-xl text-slate-300">/ {players.length}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Main Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200 min-h-[500px]">
              <div className="bg-therap p-4 text-white font-bold flex justify-between items-center px-8 uppercase tracking-widest">
                <span>{auction.isActive ? 'Live Auction' : (currentPlayer ? 'Auction Closed' : 'Awaiting Next Player')}</span>
                {currentPlayer && <span className="text-sm font-black">ROUND: {currentPlayer.auctionRound || 1}</span>}
              </div>

              <div className="p-8 flex flex-col gap-6 h-full">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start w-full">
                  {/* PhotoCard with Orange Ribbon Frame */}
                  <div className="w-64 h-80 bg-white rounded-lg overflow-hidden border-[6px] border-orange-500 shadow-xl flex items-center justify-center relative shrink-0">
                    <div className="absolute inset-0 border-[1px] border-orange-200 pointer-events-none"></div>
                    {currentPlayer?.photoUrl ? (
                      <img src={currentPlayer.photoUrl} alt={currentPlayer.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-400 text-center p-4">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        No Photo
                      </div>
                    )}
                    {currentPlayer && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-black px-3 py-1 rounded-full font-bold text-[10px] uppercase shadow-md z-10">
                        CAT {currentPlayer.category}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-6 text-center md:text-left">
                    {currentPlayer ? (
                      <>
                        <div>
                          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">{currentPlayer.name}</h2>
                          <p className="text-lg text-slate-500 font-medium">{currentPlayer.position} • {currentPlayer.department}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-[10px] uppercase text-slate-400 font-black mb-1 tracking-wider">Base Price</p>
                            <p className="text-3xl font-bold text-slate-700">৳ {currentPlayer.basePrice}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <p className="text-[10px] uppercase text-blue-400 font-black mb-1 tracking-wider">Current Bid</p>
                            <p className="text-3xl font-bold text-therap">৳ {auction.currentBid}</p>
                            <p className="text-[9px] text-blue-400 font-black">Min Increment: +৳{nextIncrement}</p>
                          </div>
                        </div>

                        <div className="bg-green-50/50 border-2 border-dashed border-blue-400 p-4 rounded-xl space-y-3 relative">
                          <div className="flex justify-between items-center">
                            <p className="text-green-800 font-black text-[10px] uppercase flex items-center tracking-widest">
                              Highest Bidder(s):
                            </p>
                            {biddingTeams.length >= 2 && role === UserRole.ADMIN && (
                              <button
                                onClick={onTieLottery}
                                className="text-[9px] bg-yellow-400 hover:bg-yellow-500 text-black font-black px-2 py-1 rounded uppercase shadow-sm"
                              >
                                Run Lottery
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
                            {biddingTeams.map((team, index) => (
                              <div
                                key={team.id}
                                className={`flex items-center bg-white px-3 py-2 rounded-full border-2 transition select-none ${index === 0 ? 'border-green-500 ring-2 ring-green-100 shadow-sm' : 'border-slate-100 opacity-90'}`}
                              >
                                <span className={`text-xs font-black ${index === 0 ? 'text-green-900' : 'text-slate-600'}`}>
                                  {team.name} {index === 0 && <span className="text-[10px] ml-1 uppercase text-green-500 font-bold tracking-tighter">(Lead)</span>}
                                </span>
                              </div>
                            ))}
                            {biddingTeams.length === 0 && (
                              <span className="text-slate-400 text-xs italic ml-1">No bids yet</span>
                            )}
                          </div>
                        </div>


                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 italic py-12">
                        <svg className="w-24 h-24 mb-6 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <p className="text-xl font-medium">Ready to Auction</p>
                      </div>
                    )}
                  </div>
                </div>

                {currentPlayer && !auction.isActive && auction.lastAction && (
                  <div className={`p-6 mb-6 rounded-xl text-center border-4 border-double shadow-lg ${auction.lastAction === 'SOLD' ? 'bg-green-100 border-green-500 text-green-800' :
                    auction.lastAction === 'UNSOLD' ? 'bg-red-100 border-red-500 text-red-800' :
                      'bg-orange-100 border-orange-500 text-orange-800'
                    }`}>
                    <h2 className="text-4xl font-black uppercase tracking-widest mb-2">
                      {auction.lastAction}
                    </h2>
                    {auction.lastAction === 'SOLD' && auction.biddingTeamIds[0] && (
                      <div className="text-2xl font-bold flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
                        <span>Sold To</span>
                        <span className="bg-white text-green-700 px-6 py-2 rounded-xl border-4 border-green-200 shadow-lg font-black text-3xl transform -rotate-2">
                          {teams.find(t => t.id === auction.biddingTeamIds[0])?.name}
                        </span>
                        <span>for <span className="text-therap font-black text-3xl">৳{auction.currentBid}</span></span>
                      </div>
                    )}
                  </div>
                )}

                {currentPlayer && role !== UserRole.ADMIN && currentTeam && auction.isActive && (
                  <div className="pt-4 border-2 border-blue-500 rounded-xl p-4 w-full">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">My Team Bidding</p>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{currentTeam.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Manager: {currentTeam.manager}</p>
                        </div>
                        <p className="text-[10px] font-black text-therap uppercase tracking-widest">Bal: ৳{currentTeam.remainingBudget}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onMatchBid(currentTeam.id)}
                          disabled={auction.biddingTeamIds.length === 0}
                          className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        >
                          Match
                        </button>
                        <button
                          onClick={() => onIncreaseBid(currentTeam.id)}
                          className="flex-1 bg-therap text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-800 disabled:opacity-40 transition shadow-sm"
                        >
                          {auction.biddingTeamIds.length === 0 ? 'Start' : `+ ৳${nextIncrement}`}
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder="AMT"
                          value={manualBids[currentTeam.id] || ''}
                          onChange={(e) => setManualBids({ ...manualBids, [currentTeam.id]: e.target.value })}
                          className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-therap"
                        />
                        <button
                          onClick={() => handleManualBidSubmit(currentTeam.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-700 disabled:opacity-40 transition shadow-sm shrink-0"
                        >
                          Bid
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentPlayer && role === UserRole.ADMIN && auction.isActive && (
                  <div className="pt-4 border-2 border-blue-500 rounded-xl p-4 w-full">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">Quick Bidding Controls</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teams.map(t => {
                        const isLead = auction.biddingTeamIds[0] === t.id;
                        return (
                          <div key={t.id} className={`p-3 rounded-xl border transition ${isLead ? 'bg-blue-50 border-therap shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center mb-3 px-1">
                              <span className="text-xs font-bold text-slate-800 truncate">{t.name}</span>
                              <span className="ml-auto text-[9px] font-black text-therap">Bal: ৳{t.remainingBudget}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => onMatchBid(t.id)}
                                  disabled={isLead || auction.biddingTeamIds.length === 0}
                                  className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                >
                                  Match
                                </button>
                                <button
                                  onClick={() => onIncreaseBid(t.id)}
                                  className="flex-1 bg-therap text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-800 disabled:opacity-40 transition shadow-sm"
                                >
                                  {auction.biddingTeamIds.length === 0 ? 'Start' : `+ ৳${nextIncrement}`}
                                </button>
                              </div>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  placeholder="AMT"
                                  value={manualBids[t.id] || ''}
                                  onChange={(e) => setManualBids({ ...manualBids, [t.id]: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-therap"
                                />
                                <button
                                  onClick={() => handleManualBidSubmit(t.id)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-700 disabled:opacity-40 transition shadow-sm shrink-0"
                                >
                                  Bid
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={onFinalizeSale}
                        className={`flex-1 text-white py-4 rounded-xl font-bold text-xl transition shadow-lg active:scale-[0.98] ${auction.biddingTeamIds.length === 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                        {auction.biddingTeamIds.length === 0 ? 'MARK UNSOLD' : 'SOLD / FINALIZE'}
                      </button>
                      <button
                        onClick={onSkipForNow}
                        className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition shadow-sm whitespace-nowrap"
                        title="Skip this player for now without marking as unsold"
                      >
                        Skip For Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Redesigned for 50/50 Split */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden lg:h-[800px] flex flex-col sticky top-24">

            {/* Top Section: Players Queue (50%) - Divided by Category */}
            <div className="h-1/2 flex flex-col border-b">
              <div className="p-3 bg-slate-50 border-b shrink-0">
                <h3 className="text-therap font-black text-[10px] uppercase tracking-widest mb-3 px-1">Players Queue</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none transition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold px-2 py-2 outline-none text-slate-600 w-24"
                  >
                    <option value="ALL">ALL CATS</option>
                    <option value={PlayerCategory.A}>CAT A</option>
                    <option value={PlayerCategory.B}>CAT B</option>
                    <option value={PlayerCategory.C}>CAT C</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {(Object.keys(groupedQueue) as PlayerCategory[]).map(cat => (
                  groupedQueue[cat].length > 0 && (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center space-x-2 px-1">
                        <div className={`w-2 h-2 rounded-full ${cat === PlayerCategory.A ? 'bg-yellow-400' : cat === PlayerCategory.B ? 'bg-slate-400' : 'bg-orange-400'}`}></div>
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category {cat}</h4>
                        <div className="flex-1 h-px bg-slate-100"></div>
                        <span className="text-[8px] font-bold text-slate-300">{groupedQueue[cat].length}</span>
                      </div>
                      {groupedQueue[cat].map(p => (
                        <div
                          key={p.id}
                          onClick={() => role === UserRole.ADMIN && onStartAuction(p.id)}
                          className={`p-2.5 rounded-lg border flex items-center justify-between group transition ${auction.currentPlayerId === p.id ? 'border-therap bg-blue-50 shadow-sm' : 'border-slate-100 hover:border-slate-300 bg-white shadow-sm'} ${role === UserRole.ADMIN ? 'cursor-pointer hover:shadow-md' : ''}`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-100 overflow-hidden shrink-0">
                              {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-100 text-xs text-slate-400 font-bold">?</div>}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 text-xs truncate leading-tight">{p.name}</h4>
                              <p className="text-[9px] text-slate-400 font-bold truncate uppercase leading-tight mt-0.5">
                                {p.status === PlayerStatus.DISTRIBUTED ? 'DISTRIBUTED' : `${p.position}`}
                                {p.auctionRound === 2 && ' • R2'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
                {filteredQueue.length === 0 && (
                  <p className="text-center text-slate-400 text-[10px] py-4 uppercase font-bold tracking-widest">No players found</p>
                )}
              </div>
            </div>

            {/* Bottom Section: Teams Overview (50%) - Simplified Squad Column */}
            <div className="h-1/2 flex flex-col border-t-4 border-slate-100 border-blue-500 border-dashed">
              <div className="p-3 bg-slate-50 border-b shrink-0">
                <h3 className="text-therap font-black text-[10px] uppercase tracking-widest px-1">Teams Overview</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[8px] font-black tracking-widest border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5">Team</th>
                      <th className="px-2 py-2.5 text-center">Squad</th>
                      <th className="px-3 py-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teams.map(team => {
                      const squad = players.filter(p => p.teamId === team.id);
                      return (
                        <tr key={team.id} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-2 min-w-[100px]">
                            <p className="font-bold text-slate-800 text-[10px] truncate leading-tight">{team.name}</p>
                            <p className="text-[8px] text-slate-400 truncate font-medium">{team.manager}</p>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-[11px] font-black ${squad.length >= MIN_SQUAD_SIZE ? 'text-green-600' : 'text-slate-600'}`}>
                              {squad.length}/{MIN_SQUAD_SIZE}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-black text-therap text-[10px] whitespace-nowrap">
                            ৳ {team.remainingBudget}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
