
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, Team, AuctionState, UserRole, PlayerStatus, PlayerCategory } from './types';
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
  CAT_B_MIN_REMAINING_BUDGET
} from './constants';
import { Layout } from './components/Layout';
import { AuctionDashboard } from './components/AuctionDashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { TeamManagement } from './components/TeamManagement';
import { Reports } from './components/Reports';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auction' | 'players' | 'teams' | 'reports'>('auction');
  const [role, setRole] = useState<UserRole>(UserRole.VIEWER);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [auction, setAuction] = useState<AuctionState>({
    currentPlayerId: null,
    currentBid: 0,
    biddingTeamIds: [],
    isActive: false
  });

  const socketRef = useRef<Socket | null>(null);

  // Socket.IO Connection
  useEffect(() => {
    // Connect to server
    const socket = io(`http://${window.location.hostname}:3001`);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Auction Server');
    });

    socket.on('init_state', (data: any) => {
      // Initialize state from server without emitting back
      if (data.players) setPlayers(data.players);
      if (data.teams) setTeams(data.teams);
      if (data.auction) setAuction(data.auction);
    });

    socket.on('state_update', (data: any) => {
      // Receive updates from other clients
      if (data.players) setPlayers(data.players);
      if (data.teams) setTeams(data.teams);
      if (data.auction) setAuction(data.auction);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Sync Wrappers
  const broadcastUpdate = (key: 'players' | 'teams' | 'auction', data: any) => {
    // Update local state is handled by the caller via the standard setter, but 
    // we need to know the NEW data. 
    // To simplify: I will create wrappers for setPlayers, setTeams, etc that do both.

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


  const validateBid = (teamId: string, bidAmount: number): { valid: boolean; error?: string } => {
    const team = teams.find(t => t.id === teamId);
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!team || !player) return { valid: false, error: 'Internal Error' };

    // Rule: Total Purse
    if (bidAmount > team.remainingBudget) return { valid: false, error: 'Insufficient total budget' };

    const squad = players.filter(p => p.teamId === team.id);
    const catAPlayers = squad.filter(p => p.category === PlayerCategory.A);
    const catBPlayers = squad.filter(p => p.category === PlayerCategory.B);
    const catCPlayers = squad.filter(p => p.category === PlayerCategory.C);

    // Rule 1: Category A Max Spend
    if (player.category === PlayerCategory.A) {
      const currentCatASpend = catAPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
      if (currentCatASpend + bidAmount > CAT_A_MAX_SPEND) return { valid: false, error: 'Exceeds Cat A 60k limit' };
    }

    // Rule 7 & 2: Squad Completion & Minimum Quotas
    const slotsLeft = MIN_SQUAD_SIZE - squad.length - 1;

    const needsA = Math.max(0, MIN_CAT_A - (catAPlayers.length + (player.category === PlayerCategory.A ? 1 : 0)));
    const needsB = Math.max(0, MIN_CAT_B - (catBPlayers.length + (player.category === PlayerCategory.B ? 1 : 0)));
    const needsC = Math.max(0, MIN_CAT_C - (catCPlayers.length + (player.category === PlayerCategory.C ? 1 : 0)));

    const specificSlotsNeeded = needsA + needsB + needsC;
    const genericSlotsNeeded = Math.max(0, slotsLeft - specificSlotsNeeded);

    const minReserve = (needsA * CATEGORY_BASE_PRICES[PlayerCategory.A]) +
      (needsB * CATEGORY_BASE_PRICES[PlayerCategory.B]) +
      (needsC * CATEGORY_BASE_PRICES[PlayerCategory.C]) +
      (genericSlotsNeeded * CATEGORY_BASE_PRICES[PlayerCategory.C]);

    if (team.remainingBudget - bidAmount < minReserve) {
      return { valid: false, error: 'Must reserve funds for remaining squad requirements' };
    }

    // Rule 3: End of Category B Budget Rule
    const remainingCatB = players.filter(p => p.category === PlayerCategory.B && p.status === PlayerStatus.UNSOLD).length;
    if (remainingCatB === 0 || (remainingCatB === 1 && player.category === PlayerCategory.B)) {
      const futureSquadSize = squad.length + 1;
      const futureBudget = team.remainingBudget - bidAmount;
      if (futureSquadSize >= CAT_B_END_SQUAD_THRESHOLD && futureBudget < CAT_B_MIN_REMAINING_BUDGET) {
        return { valid: false, error: `End of Cat B: Must have ${CAT_B_MIN_REMAINING_BUDGET / 1000}k left if squad >= ${CAT_B_END_SQUAD_THRESHOLD}` };
      }
    }

    return { valid: true };
  };

  const handleStartAuction = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    handleSetAuction({
      currentPlayerId: playerId,
      currentBid: player.basePrice,
      biddingTeamIds: [],
      isActive: true
    });
  };

  const handleIncreaseBid = (teamId: string, customAmount?: number) => {
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!player) return;

    const inc = getDynamicIncrement(player.category, auction.currentBid);
    const nextBid = customAmount !== undefined ? customAmount :
      (auction.biddingTeamIds.length === 0 ? auction.currentBid : auction.currentBid + inc);

    if (customAmount !== undefined && auction.biddingTeamIds.length > 0) {
      const diff = customAmount - auction.currentBid;
      if (diff < inc) {
        alert(`Minimum increment for this price level is ${inc}`);
        return;
      }
    }

    const validation = validateBid(teamId, nextBid);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    handleSetAuction(prev => ({
      ...prev,
      currentBid: nextBid,
      biddingTeamIds: [teamId]
    }));
  };

  const handleMatchBid = (teamId: string) => {
    const validation = validateBid(teamId, auction.currentBid);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    handleSetAuction(prev => {
      const otherTeams = prev.biddingTeamIds.filter(id => id !== teamId);
      return {
        ...prev,
        biddingTeamIds: [teamId, ...otherTeams]
      };
    });
  };

  const handleFinalizeSale = () => {
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!player) return;

    if (auction.biddingTeamIds.length === 0) {
      const currentRound = player.auctionRound || 1;
      if (currentRound === 1) {
        // First unsold: move to round 2
        handleSetPlayers(prev => prev.map(p =>
          p.id === player.id ? { ...p, status: PlayerStatus.UNSOLD, auctionRound: 2 } : p
        ));
      } else {
        // Second unsold: check for special transitions
        if (player.category === PlayerCategory.A) {
          // SPECIAL RULE: Cat A remains unsold twice -> Downgrade to Cat B
          const newBase = CATEGORY_BASE_PRICES[PlayerCategory.B];
          handleSetPlayers(prev => prev.map(p =>
            p.id === player.id ? {
              ...p,
              category: PlayerCategory.B,
              basePrice: newBase,
              status: PlayerStatus.UNSOLD,
              auctionRound: 1 // Reset for its new category life
            } : p
          ));
          alert(`SYSTEM UPDATE: ${player.name} remains unsold in Round 2. Downgraded to Category B (New Base: ৳${newBase})`);
        } else if (player.category === PlayerCategory.C) {
          handleSetPlayers(prev => prev.map(p =>
            p.id === player.id ? { ...p, status: PlayerStatus.DISTRIBUTED } : p
          ));
        } else {
          // Standard Unsold for Cat B
          handleSetPlayers(prev => prev.map(p =>
            p.id === player.id ? { ...p, status: PlayerStatus.UNSOLD } : p
          ));
        }
      }
    } else {
      const winnerId = auction.biddingTeamIds[0];
      handleSetPlayers(prev => prev.map(p =>
        p.id === player.id ? { ...p, status: PlayerStatus.SOLD, soldPrice: auction.currentBid, teamId: winnerId } : p
      ));
      handleSetTeams(prev => prev.map(t =>
        t.id === winnerId ? { ...t, remainingBudget: t.remainingBudget - auction.currentBid } : t
      ));
    }

    handleSetAuction({ currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false });
  };

  const handleTieLottery = () => {
    if (auction.biddingTeamIds.length < 2) return;
    const randomIndex = Math.floor(Math.random() * auction.biddingTeamIds.length);
    const winnerId = auction.biddingTeamIds[randomIndex];
    alert(`Lottery Result: ${teams.find(t => t.id === winnerId)?.name} wins the tie!`);
    handleSetAuction(prev => ({
      ...prev,
      biddingTeamIds: [winnerId]
    }));
  };

  const handleSkipForNow = () => {
    // Only allow skipping if no bids have been placed yet
    if (auction.biddingTeamIds.length === 0) {
      handleSetAuction({ currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false });
    }
  };

  const addPlayer = (newPlayer: Omit<Player, 'id' | 'status' | 'basePrice'>) => {
    const player: Player = {
      ...newPlayer,
      id: crypto.randomUUID(),
      status: PlayerStatus.UNSOLD,
      basePrice: CATEGORY_BASE_PRICES[newPlayer.category as PlayerCategory] || 0,
      auctionRound: 1
    };
    handleSetPlayers(prev => [...prev, player]);
  };

  const updatePlayer = (updatedPlayer: Player) => {
    handleSetPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? {
      ...updatedPlayer,
      basePrice: CATEGORY_BASE_PRICES[updatedPlayer.category] || p.basePrice
    } : p));
  };

  const updatePlayerPhoto = (playerId: string, photoUrl: string) => {
    handleSetPlayers(prev => prev.map(p => p.id === playerId ? { ...p, photoUrl } : p));
  };

  const updateTeamLogo = (teamId: string, logoUrl: string) => {
    handleSetTeams(prev => prev.map(t => t.id === teamId ? { ...t, logoUrl } : t));
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} role={role} setRole={setRole}>
      {activeTab === 'auction' && (
        <AuctionDashboard
          players={players}
          teams={teams}
          auction={auction}
          role={role}
          onStartAuction={handleStartAuction}
          onIncreaseBid={handleIncreaseBid}
          onMatchBid={handleMatchBid}
          onFinalizeSale={handleFinalizeSale}
          onTieLottery={handleTieLottery}
          onSkipForNow={handleSkipForNow}
        />
      )}
      {activeTab === 'players' && (
        <PlayerManagement
          players={players}
          onAddPlayer={addPlayer}
          onUpdatePlayer={updatePlayer}
          onUpdatePhoto={updatePlayerPhoto}
          setPlayers={handleSetPlayers}
          onClearAll={() => handleSetPlayers([])}
          role={role}
        />
      )}
      {activeTab === 'teams' && (
        <TeamManagement
          teams={teams}
          setTeams={handleSetTeams}
          role={role}
          onUpdateLogo={updateTeamLogo}
          onClearAll={() => handleSetTeams([])}
        />
      )}
      {activeTab === 'reports' && (
        <Reports players={players} teams={teams} />
      )}
    </Layout>
  );
};

export default App;
