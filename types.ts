
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

export interface Player {
  id: string;
  photoId?: string; // New field for matching Excel Photo ID with folder images
  name: string;
  department: string;
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
  initialBudget: number;
  remainingBudget: number;
  logoUrl?: string;
}

export interface AuctionState {
  currentPlayerId: string | null;
  currentBid: number;
  biddingTeamIds: string[];
  isActive: boolean;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER'
}

export interface AppData {
  players: Player[];
  teams: Team[];
  auction: AuctionState;
  role: UserRole;
}
