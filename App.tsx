import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { generateUUID } from './utils';
import { Player, Team, AuctionState, UserRole, PlayerStatus, PlayerCategory, AuctionLogEntry, AuctionLogAction, Season } from './types';
import {
  CATEGORY_BASE_PRICES,
  INITIAL_TEAMS,
  getDynamicIncrement,
  CAT_A_MAX_SPEND,
  MIN_SQUAD_SIZE,
  MIN_CAT_A,
  MIN_CAT_B,
  MIN_CAT_C,
  CAT_B_END_SQUAD_THRESHOLD,
  CAT_B_MIN_REMAINING_BUDGET,
  MAX_CAT_A_PLUS_B
} from './constants';
import { Layout } from './components/Layout';
import { AuctionDashboard } from './components/AuctionDashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { TeamManagement } from './components/TeamManagement';
import { Reports } from './components/Reports';
import { LotteryResultModal } from './components/LotteryResultModal';

const DEFAULT_SEASON_ID = 'season-1-2026';
const INITIAL_SEASON: Season = {
  id: 'season-1-2026',
  name: 'Season 1 - 2026',
  year: 2026,
  isArchived: false,
  createdAt: 1773600000000,
  players: [],
  teams: INITIAL_TEAMS,
  auction: { currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false },
  auctionLog: []
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auction' | 'players' | 'teams' | 'reports'>('auction');
  const [role, setRole] = useState<UserRole>(UserRole.VIEWER);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  // Multi-Season States
  const [seasons, setSeasons] = useState<Season[]>([INITIAL_SEASON]);
  const [currentSeasonId, setCurrentSeasonId] = useState<string>(DEFAULT_SEASON_ID);
  const [activeSeasonId, setActiveSeasonId] = useState<string>(DEFAULT_SEASON_ID);

  // Live active season state
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [auction, setAuction] = useState<AuctionState>({
    currentPlayerId: null,
    currentBid: 0,
    biddingTeamIds: [],
    isActive: false
  });
  const [auctionLog, setAuctionLog] = useState<AuctionLogEntry[]>([]);

  const [lotteryResult, setLotteryResult] = useState<{
    winnerId: string;
    winnerName: string;
    calculation: string;
    teamList: { index: number; name: string }[];
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Socket.IO Connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (
      import.meta.env.DEV
        ? `http://${window.location.hostname}:7002`
        : window.location.origin
    );

    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Auction Server');
    });

    socket.on('init_state', (data: any) => {
      if (data.seasons && Array.isArray(data.seasons) && data.seasons.length > 0) {
        setSeasons(data.seasons);
      }
      if (data.currentSeasonId) {
        setCurrentSeasonId(data.currentSeasonId);
        setActiveSeasonId(prev => prev ? prev : data.currentSeasonId);
      }
      if (data.players) setPlayers(data.players);
      if (data.teams) setTeams(data.teams);
      if (data.auction) setAuction(data.auction);
      if (data.auctionLog) setAuctionLog(data.auctionLog);
    });

    socket.on('state_update', (data: any) => {
      if (data.seasons && Array.isArray(data.seasons) && data.seasons.length > 0) {
        setSeasons(data.seasons);
      }
      if (data.currentSeasonId) {
        setCurrentSeasonId(data.currentSeasonId);
      }
      if (data.players) setPlayers(data.players);
      if (data.teams) setTeams(data.teams);
      if (data.auction) setAuction(data.auction);
      if (data.auctionLog) setAuctionLog(data.auctionLog);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Broadcast helper
  const broadcastUpdate = (key: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit('update_data', { [key]: data });
    }
  };

  const handleSetPlayers = (newPlayers: Player[] | ((prev: Player[]) => Player[])) => {
    setPlayers(prev => {
      const resolved = typeof newPlayers === 'function' ? newPlayers(prev) : newPlayers;
      broadcastUpdate('players', resolved);
      return resolved;
    });
  };

  const handleSetTeams = (newTeams: Team[] | ((prev: Team[]) => Team[])) => {
    setTeams(prev => {
      const resolved = typeof newTeams === 'function' ? newTeams(prev) : newTeams;
      broadcastUpdate('teams', resolved);
      return resolved;
    });
  };

  const handleSetAuction = (newAuction: AuctionState | ((prev: AuctionState) => AuctionState)) => {
    setAuction(prev => {
      const resolved = typeof newAuction === 'function' ? newAuction(prev) : newAuction;
      broadcastUpdate('auction', resolved);
      return resolved;
    });
  };

  const handleSetAuctionLog = (newLog: AuctionLogEntry[] | ((prev: AuctionLogEntry[]) => AuctionLogEntry[])) => {
    setAuctionLog(prev => {
      const resolved = typeof newLog === 'function' ? newLog(prev) : newLog;
      broadcastUpdate('auctionLog', resolved);
      return resolved;
    });
  };

  // Multi-Season Creation Handler
  const handleCreateNewSeason = (seasonName: string, year: number, keepTeams: boolean) => {
    const newSeasonId = `season-${seasons.length + 1}-${year}`;

    // Archive current active season
    const updatedSeasons = seasons.map(s => {
      if (s.id === currentSeasonId) {
        return {
          ...s,
          isArchived: true,
          players: players,
          teams: teams,
          auction: auction,
          auctionLog: auctionLog
        };
      }
      return s;
    });

    const resetTeams: Team[] = keepTeams ? teams.map(t => ({
      ...t,
      remainingBudget: t.initialBudget || 150000
    })) : INITIAL_TEAMS;

    const newSeason: Season = {
      id: newSeasonId,
      name: seasonName,
      year: year,
      isArchived: false,
      createdAt: Date.now(),
      players: [],
      teams: resetTeams,
      auction: { currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false },
      auctionLog: []
    };

    const finalSeasons = [...updatedSeasons, newSeason];

    setSeasons(finalSeasons);
    setCurrentSeasonId(newSeasonId);
    setActiveSeasonId(newSeasonId);
    setPlayers([]);
    setTeams(resetTeams);
    setAuction({ currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false });
    setAuctionLog([]);

    // Broadcast full season switch to socket
    if (socketRef.current) {
      socketRef.current.emit('update_data', {
        seasons: finalSeasons,
        currentSeasonId: newSeasonId,
        players: [],
        teams: resetTeams,
        auction: { currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false },
        auctionLog: []
      });
    }
  };

  // Determine displayed season data (Active vs Historical Archived)
  const isViewingLiveSeason = activeSeasonId === currentSeasonId;
  const displayedSeason = seasons.find(s => s.id === activeSeasonId) || seasons[0];

  const displayedPlayers = isViewingLiveSeason ? players : (displayedSeason?.players || []);
  const displayedTeams = isViewingLiveSeason ? teams : (displayedSeason?.teams || []);
  const displayedAuction = isViewingLiveSeason ? auction : (displayedSeason?.auction || { currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false });
  const displayedAuctionLog = isViewingLiveSeason ? auctionLog : (displayedSeason?.auctionLog || []);
  const effectiveRole = isViewingLiveSeason ? role : UserRole.VIEWER; // Read-only mode for past seasons

  const currentTeam = displayedTeams.find(team => team.id === currentTeamId) || null;

  const handleTeamLogin = (teamId: string, pin: string): Team | null => {
    const matchedTeam = displayedTeams.find(team => team.id === teamId) || null;
    const normalizedPin = pin.trim();
    if (!matchedTeam) return null;
    if (matchedTeam.pin !== normalizedPin) return null;
    setCurrentTeamId(matchedTeam.id);
    setActiveTab('auction');
    return matchedTeam;
  };

  const handleTeamLogout = () => {
    setCurrentTeamId(null);
  };

  const addLogEntry = (action: AuctionLogAction, player: Player, amount?: number, teamId?: string) => {
    const entry: AuctionLogEntry = {
      id: generateUUID(),
      timestamp: Date.now(),
      action,
      playerId: player.id,
      playerName: player.name,
      playerCategory: player.category,
      amount,
      teamId,
      teamName: teamId ? teams.find(t => t.id === teamId)?.name : undefined
    };

    handleSetAuctionLog(prev => [entry, ...prev]);
  };

  // Player Management
  const addPlayer = (playerData: any) => {
    const newPlayer: Player = {
      ...playerData,
      id: generateUUID(),
      basePrice: CATEGORY_BASE_PRICES[playerData.category as PlayerCategory] || 1000,
      status: PlayerStatus.UNSOLD
    };
    handleSetPlayers(prev => [...prev, newPlayer]);
  };

  const updatePlayer = (updatedPlayer: Player) => {
    handleSetPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
  };

  const deletePlayer = (playerId: string) => {
    handleSetPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const updatePlayerPhoto = (playerId: string, photoUrl: string) => {
    handleSetPlayers(prev => prev.map(p => p.id === playerId ? { ...p, photoUrl } : p));
  };

  // Team Management
  const updateTeamLogo = (teamId: string, logoUrl: string) => {
    handleSetTeams(prev => prev.map(t => t.id === teamId ? { ...t, logoUrl } : t));
  };

  const deleteTeam = (teamId: string) => {
    handleSetTeams(prev => prev.filter(t => t.id !== teamId));
    handleSetPlayers(prev => prev.map(p => p.teamId === teamId ? { ...p, teamId: undefined, status: PlayerStatus.UNSOLD, soldPrice: undefined } : p));
  };

  // Auction Logic
  const handleStartAuction = (playerId: string) => {
    if (!isViewingLiveSeason) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    handleSetAuction({
      currentPlayerId: playerId,
      currentBid: player.basePrice,
      biddingTeamIds: [],
      isActive: true,
      lastAction: undefined
    });

    addLogEntry('START', player, player.basePrice);
  };

  const handleIncreaseBid = (teamId: string) => {
    if (!isViewingLiveSeason) return;
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!player) return;

    const nextIncrement = getDynamicIncrement(auction.currentBid);
    const nextBid = auction.currentBid + nextIncrement;

    handleSetAuction(prev => {
      const updatedBidders = prev.biddingTeamIds.includes(teamId)
        ? prev.biddingTeamIds
        : [...prev.biddingTeamIds, teamId];

      return {
        ...prev,
        currentBid: nextBid,
        biddingTeamIds: updatedBidders
      };
    });

    addLogEntry('BID', player, nextBid, teamId);
  };

  const handleMatchBid = (teamId: string) => {
    if (!isViewingLiveSeason) return;
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!player) return;

    handleSetAuction(prev => {
      const updatedBidders = prev.biddingTeamIds.includes(teamId)
        ? prev.biddingTeamIds
        : [...prev.biddingTeamIds, teamId];

      return {
        ...prev,
        biddingTeamIds: updatedBidders
      };
    });

    addLogEntry('BID', player, auction.currentBid, teamId);
  };

  const handleFinalizeSale = (winningTeamId: string) => {
    if (!isViewingLiveSeason) return;
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!player) return;

    const winningPrice = auction.currentBid;

    handleSetPlayers(prev => prev.map(p => {
      if (p.id === player.id) {
        return {
          ...p,
          status: PlayerStatus.SOLD,
          teamId: winningTeamId,
          soldPrice: winningPrice
        };
      }
      return p;
    }));

    handleSetTeams(prev => prev.map(t => {
      if (t.id === winningTeamId) {
        return {
          ...t,
          remainingBudget: t.remainingBudget - winningPrice
        };
      }
      return t;
    }));

    addLogEntry('SOLD', player, winningPrice, winningTeamId);

    handleSetAuction({
      currentPlayerId: null,
      currentBid: 0,
      biddingTeamIds: [],
      isActive: false,
      lastAction: 'SOLD'
    });
  };

  const handleTieLottery = () => {
    if (!isViewingLiveSeason) return;
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!player) return;

    const candidateTeamIds = auction.biddingTeamIds;
    if (candidateTeamIds.length === 0) return;

    const candidateTeams = teams.filter(t => candidateTeamIds.includes(t.id));
    const sortedTeams = [...candidateTeams].sort((a, b) => a.name.localeCompare(b.name));

    const roll = Math.floor(Math.random() * 100) + 1;
    const teamCount = sortedTeams.length;
    const winnerIndex = (roll - 1) % teamCount;
    const winnerTeam = sortedTeams[winnerIndex];

    const indexedList = sortedTeams.map((t, idx) => ({ index: idx + 1, name: t.name }));
    const calcText = `Formula: (Roll (${roll}) - 1) % Teams (${teamCount}) = Index ${winnerIndex} (${winnerTeam.name})`;

    setLotteryResult({
      winnerId: winnerTeam.id,
      winnerName: winnerTeam.name,
      calculation: calcText,
      teamList: indexedList
    });
  };

  const handleConfirmLottery = (winningTeamId: string) => {
    handleFinalizeSale(winningTeamId);
    setLotteryResult(null);
  };

  const handleSkipForNow = () => {
    if (!isViewingLiveSeason) return;
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (player) {
      addLogEntry('SKIP', player);
    }

    handleSetAuction({
      currentPlayerId: null,
      currentBid: 0,
      biddingTeamIds: [],
      isActive: false,
      lastAction: 'SKIP'
    });
  };

  const handleAssignPlayerToTeam = (playerId: string, targetTeamId: string, price: number) => {
    if (!isViewingLiveSeason) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    if (player.teamId && player.teamId !== targetTeamId) {
      const oldTeamId = player.teamId;
      const oldPrice = player.soldPrice || 0;
      handleSetTeams(prev => prev.map(t => t.id === oldTeamId ? { ...t, remainingBudget: t.remainingBudget + oldPrice } : t));
    }

    handleSetTeams(prev => prev.map(t => {
      if (t.id === targetTeamId) {
        const deduct = player.teamId === targetTeamId ? (price - (player.soldPrice || 0)) : price;
        return { ...t, remainingBudget: t.remainingBudget - deduct };
      }
      return t;
    }));

    handleSetPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          status: PlayerStatus.SOLD,
          teamId: targetTeamId,
          soldPrice: price
        };
      }
      return p;
    }));

    addLogEntry('SOLD', player, price, targetTeamId);
  };

  const handleRemovePlayerFromTeam = (playerId: string) => {
    if (!isViewingLiveSeason) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    if (player.teamId) {
      const oldTeamId = player.teamId;
      const oldPrice = player.soldPrice || 0;
      handleSetTeams(prev => prev.map(t => t.id === oldTeamId ? { ...t, remainingBudget: t.remainingBudget + oldPrice } : t));
    }

    handleSetPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          teamId: undefined,
          soldPrice: undefined,
          status: PlayerStatus.UNSOLD
        };
      }
      return p;
    }));

    addLogEntry('UNSOLD', player);
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      role={effectiveRole}
      setRole={setRole}
      teams={displayedTeams}
      currentTeam={currentTeam}
      onTeamLogin={handleTeamLogin}
      onTeamLogout={handleTeamLogout}
      seasons={seasons}
      activeSeasonId={activeSeasonId}
      setActiveSeasonId={setActiveSeasonId}
      currentSeasonId={currentSeasonId}
      onCreateNewSeason={handleCreateNewSeason}
    >
      {activeTab === 'auction' && (
        <AuctionDashboard
          players={displayedPlayers}
          teams={displayedTeams}
          auction={displayedAuction}
          role={effectiveRole}
          currentTeam={currentTeam}
          onStartAuction={handleStartAuction}
          onIncreaseBid={handleIncreaseBid}
          onMatchBid={handleMatchBid}
          onFinalizeSale={handleFinalizeSale}
          onTieLottery={handleTieLottery}
          onSkipForNow={handleSkipForNow}
          auctionLog={displayedAuctionLog}
        />
      )}
      {activeTab === 'players' && (
        <PlayerManagement
          players={displayedPlayers}
          teams={displayedTeams}
          onAddPlayer={addPlayer}
          onUpdatePlayer={updatePlayer}
          onDeletePlayer={deletePlayer}
          onUpdatePhoto={updatePlayerPhoto}
          setPlayers={handleSetPlayers}
          onClearAll={() => handleSetPlayers([])}
          role={effectiveRole}
          onAssignPlayerToTeam={handleAssignPlayerToTeam}
          onRemovePlayerFromTeam={handleRemovePlayerFromTeam}
        />
      )}
      {activeTab === 'teams' && (
        <TeamManagement
          teams={displayedTeams}
          setTeams={handleSetTeams}
          players={displayedPlayers}
          role={effectiveRole}
          onUpdateLogo={updateTeamLogo}
          onDeleteTeam={deleteTeam}
          onClearAll={() => handleSetTeams([])}
          onAssignPlayerToTeam={handleAssignPlayerToTeam}
          onRemovePlayerFromTeam={handleRemovePlayerFromTeam}
        />
      )}
      {activeTab === 'reports' && (
        <Reports
          players={displayedPlayers}
          teams={displayedTeams}
          role={effectiveRole}
          onAssignPlayerToTeam={handleAssignPlayerToTeam}
          onRemovePlayerFromTeam={handleRemovePlayerFromTeam}
        />
      )}
      <LotteryResultModal
        isOpen={!!lotteryResult}
        onClose={() => setLotteryResult(null)}
        onConfirm={handleConfirmLottery}
        data={lotteryResult}
      />
    </Layout>
  );
};

export default App;
