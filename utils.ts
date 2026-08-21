import { PlayerPosition } from './types';

export const generateUUID = (): string => {
    // Fallback for secure contexts (HTTPS/localhost)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // Insecure context fallback
        }
    }
    // Simple fallback for insecure contexts
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const POSITION_ALIASES: Record<string, PlayerPosition> = {
    goalkeeper: PlayerPosition.GOALKEEPER,
    'goal keeper': PlayerPosition.GOALKEEPER,
    gk: PlayerPosition.GOALKEEPER,
    defender: PlayerPosition.DEFENDER,
    defence: PlayerPosition.DEFENDER,
    defense: PlayerPosition.DEFENDER,
    df: PlayerPosition.DEFENDER,
    midfielder: PlayerPosition.MIDFIELDER,
    midfield: PlayerPosition.MIDFIELDER,
    mf: PlayerPosition.MIDFIELDER,
    attacker: PlayerPosition.ATTACKER,
    atteacer: PlayerPosition.ATTACKER,
    attack: PlayerPosition.ATTACKER,
    forward: PlayerPosition.ATTACKER,
    winger: PlayerPosition.WINGER,
    wing: PlayerPosition.WINGER,
    striker: PlayerPosition.STRIKER,
    allrounder: PlayerPosition.ALL_ROUNDER,
    'all-rounder': PlayerPosition.ALL_ROUNDER,
    manager: PlayerPosition.MANAGER
};

const normalizePositionPart = (value: string): string => {
    const cleaned = value.trim();
    if (!cleaned) return '';

    const key = cleaned.toLowerCase().replace(/\s+/g, ' ');
    return POSITION_ALIASES[key] || cleaned;
};

export const normalizePositionLabel = (value: string): string => {
    if (!value) return '';

    const parts = value
        .split('/')
        .map(part => normalizePositionPart(part))
        .filter(Boolean);

    if (parts.length === 0) return '';
    return parts.join(' / ');
};
