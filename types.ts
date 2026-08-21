
export enum PlayerStatus {
  UNSOLD = 'UNSOLD',
  SOLD = 'SOLD',
  DISTRIBUTED = 'DISTRIBUTED', // For Category C second-round unsold
  MANAGER = 'MANAGER'
}

export enum PlayerCategory {
  A = 'A',
  B = 'B',
  C = 'C',
  M = 'M'
}

export enum PlayerPosition {
  GOALKEEPER = 'Goalkeeper',
  DEFENDER = 'Defender',
  MIDFIELDER = 'Midfielder',
  ATTACKER = 'Attacker',
  WINGER = 'Winger',
  STRIKER = 'Striker',
  ALL_ROUNDER = 'All-rounder',
  MANAGER = 'Manager'
}

export enum JerseySize {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL'
}

export interface Player {
  id: string;
  photoId?: string; // New field for matching Excel Photo ID with folder images
  name: string;
  nickname?: string;
  jerseyNumber?: string;
  jerseySize?: JerseySize;
  department?: string; // legacy field kept optional for backward compatibility
  position: string;
  category: PlayerCategory;
  basePrice: number;
  status: PlayerStatus;
  photoUrl?: string;
  soldPrice?: number;
  teamId?: string;
  auctionRound?: number; // 1 or 2
}

export interface Team {
  id: string;
  name: string;
  manager: string;
  pin: string;
  initialBudget: number;
  remainingBudget: number;
  logoUrl?: string;
}

export interface AuctionState {
  currentPlayerId: string | null;
  currentBid: number;
  biddingTeamIds: string[];
  isActive: boolean;
  lastAction?: 'SOLD' | 'UNSOLD' | 'SKIP';
}

export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER'
}

export type AuctionLogAction = 'START' | 'BID' | 'SOLD' | 'UNSOLD' | 'SKIP';

export interface AuctionLogEntry {
  id: string; // uuid
  timestamp: number;
  action: AuctionLogAction;
  playerId: string;
  playerName: string;
  playerCategory: PlayerCategory;
  amount?: number;
  teamId?: string; // For BID, SOLD
  teamName?: string; // For BID, SOLD
}

export interface AppData {
  players: Player[];
  teams: Team[];
  auction: AuctionState;
  role: UserRole;
  auctionLog: AuctionLogEntry[];
}
