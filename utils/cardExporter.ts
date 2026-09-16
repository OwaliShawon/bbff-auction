import html2canvas from 'html2canvas';
import { Player, Team } from '../types';

export const downloadElementAsImage = async (element: HTMLElement, filename: string) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0f172a',
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        clonedElement.style.transform = 'none';
        clonedElement.style.margin = '0';
        clonedElement.style.padding = '32px';
      }
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export image:', error);
    alert('Could not generate image. Please try again.');
  }
};

/**
 * Creates an off-screen Facebook Card element for a Player and downloads it.
 */
export const downloadPlayerFacebookCard = async (player: Player, team?: Team) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1080px';
  container.style.height = '1350px';
  container.style.background = 'radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 70%, #020617 100%)';
  container.style.color = '#ffffff';
  container.style.fontFamily = 'Inter, system-ui, sans-serif';
  container.style.padding = '60px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifySpaceBetween = 'space-between';
  container.style.boxSizing = 'border-box';

  const catColor = player.category === 'A' ? '#eab308' : player.category === 'B' ? '#3b82f6' : '#10b981';
  const catTextColor = player.category === 'A' ? '#000000' : '#ffffff';

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(245, 158, 11, 0.3); padding-bottom: 24px;">
      <div>
        <div style="font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #f59e0b; text-transform: uppercase;">BBFF INTRA LEAGUE S1</div>
        <div style="font-size: 16px; font-weight: 600; color: #94a3b8; letter-spacing: 1px; margin-top: 4px;">OFFICIAL AUCTION PLAYER CARD 2026</div>
      </div>
      <div style="background: ${catColor}; color: ${catTextColor}; font-size: 22px; font-weight: 900; padding: 12px 28px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        CATEGORY ${player.category}
      </div>
    </div>

    <div style="display: flex; justify-content: center; align-items: center; margin: 40px 0;">
      <div style="width: 520px; height: 520px; border-radius: 36px; padding: 12px; background: linear-gradient(135deg, #f59e0b 0%, #3b82f6 50%, #1e293b 100%); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);">
        ${player.photoUrl ? `
          <img src="${player.photoUrl}" style="width: 100%; height: 100%; border-radius: 26px; object-fit: cover; background: #1e293b; display: block;" />
        ` : `
          <div style="width: 100%; height: 100%; border-radius: 26px; background: #1e293b; display: flex; items-center; justify-content: center; font-size: 120px; font-weight: 900; color: #475569;">
            ${player.name.charAt(0)}
          </div>
        `}
      </div>
    </div>

    <div style="text-align: center;">
      <div style="font-size: 52px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase; line-height: 1.1; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">
        ${player.name}
      </div>
      ${player.nickname ? `<div style="font-size: 28px; font-weight: 800; color: #f59e0b; margin-top: 8px; text-transform: uppercase; letter-spacing: 2px;">" ${player.nickname} "</div>` : ''}
      <div style="font-size: 24px; font-weight: 700; color: #cbd5e1; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px;">
        ${player.position} ${player.department ? `• ${player.department}` : ''}
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 36px;">
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 22px 15px; text-align: center;">
          <div style="font-size: 14px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Base Price</div>
          <div style="font-size: 32px; font-weight: 900; color: #10b981;">৳${(player.basePrice || 0).toLocaleString()}</div>
        </div>
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 22px 15px; text-align: center;">
          <div style="font-size: 14px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Status / Sold</div>
          <div style="font-size: 32px; font-weight: 900; color: #f59e0b;">${player.soldPrice ? `৳${player.soldPrice.toLocaleString()}` : player.status}</div>
        </div>
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 22px 15px; text-align: center;">
          <div style="font-size: 14px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Team</div>
          <div style="font-size: 26px; font-weight: 900; color: #38bdf8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${team ? team.name : 'UNSOLD'}</div>
        </div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; font-size: 16px; color: #64748b; font-weight: 700;">
      <div>ORGANIZED BY BBFF MANAGEMENT</div>
      <div>OFFICIAL FACEBOOK CARD</div>
    </div>
  `;

  document.body.appendChild(container);
  const filename = `${player.name.replace(/\s+/g, '_')}_Facebook_Card.png`;
  await downloadElementAsImage(container, filename);
  document.body.removeChild(container);
};

/**
 * Creates an off-screen Facebook Card element for a Squad Profile and downloads it.
 */
export const downloadSquadFacebookCard = async (team: Team, squadPlayers: Player[]) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1200px';
  container.style.height = '1500px';
  container.style.background = 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 70%, #020617 100%)';
  container.style.color = '#ffffff';
  container.style.fontFamily = 'Inter, system-ui, sans-serif';
  container.style.padding = '50px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.boxSizing = 'border-box';

  const totalSpent = team.initialBudget - team.remainingBudget;

  const playerRowsHtml = squadPlayers.map((p, idx) => `
    <div style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 14px 18px; display: flex; align-items: center; gap: 16px;">
      <div style="width: 54px; height: 54px; border-radius: 12px; background: #334155; overflow: hidden; flex-shrink: 0;">
        ${p.photoUrl ? `<img src="${p.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="width: 100%; height: 100%; display: flex; items-center; justify-content: center; font-weight: 900; color: #94a3b8;">${p.name.charAt(0)}</div>`}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 18px; font-weight: 800; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
        <div style="font-size: 13px; font-weight: 600; color: #94a3b8;">${p.position} • CAT ${p.category}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 900; color: #10b981;">৳${(p.soldPrice || p.basePrice || 0).toLocaleString()}</div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(129, 140, 248, 0.4); padding-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 20px;">
        ${team.logoUrl ? `<img src="${team.logoUrl}" style="width: 70px; height: 70px; object-fit: contain; background: #ffffff; padding: 6px; border-radius: 16px;" />` : ''}
        <div>
          <div style="font-size: 38px; font-weight: 900; color: #ffffff; text-transform: uppercase; tracking-tight: -0.5px;">${team.name}</div>
          <div style="font-size: 18px; font-weight: 700; color: #818cf8; text-transform: uppercase; margin-top: 2px;">MANAGER: ${team.manager}</div>
        </div>
      </div>
      <div style="background: #4f46e5; color: #ffffff; font-size: 20px; font-weight: 900; padding: 12px 28px; border-radius: 50px; text-transform: uppercase; tracking: 1px;">
        OFFICIAL SQUAD CARD
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0;">
      <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 20px; text-align: center;">
        <div style="font-size: 14px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Squad Count</div>
        <div style="font-size: 32px; font-weight: 900; color: #38bdf8;">${squadPlayers.length} Players</div>
      </div>
      <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 20px; text-align: center;">
        <div style="font-size: 14px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Total Spent</div>
        <div style="font-size: 32px; font-weight: 900; color: #10b981;">৳${totalSpent.toLocaleString()}</div>
      </div>
      <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 20px; text-align: center;">
        <div style="font-size: 14px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Remaining Balance</div>
        <div style="font-size: 32px; font-weight: 900; color: #f59e0b;">৳${team.remainingBudget.toLocaleString()}</div>
      </div>
    </div>

    <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
      <div style="font-size: 16px; font-weight: 900; color: #818cf8; text-transform: uppercase; letter-spacing: 2px;">SQUAD PLAYERS ROSTER</div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
        ${playerRowsHtml || '<div style="color: #64748b; font-size: 18px; grid-column: span 2; text-align: center; padding: 40px;">No players acquired yet</div>'}
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; font-size: 16px; color: #64748b; font-weight: 700;">
      <div>BBFF INTRA LEAGUE S1 2026</div>
      <div>FACEBOOK SQUAD POSTER</div>
    </div>
  `;

  document.body.appendChild(container);
  const filename = `${team.name.replace(/\s+/g, '_')}_Squad_Card.png`;
  await downloadElementAsImage(container, filename);
  document.body.removeChild(container);
};

/**
 * Creates an off-screen Facebook Card element for Sold Prices Max to Min Leaderboard and downloads it.
 */
export const downloadSoldPricesLeaderboardCard = async (soldPlayers: Player[], teams: Team[]) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1200px';
  container.style.height = '1500px';
  container.style.background = 'radial-gradient(circle at 50% 20%, #0f172a 0%, #020617 80%)';
  container.style.color = '#ffffff';
  container.style.fontFamily = 'Inter, system-ui, sans-serif';
  container.style.padding = '50px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.boxSizing = 'border-box';

  const sortedList = [...soldPlayers]
    .filter(p => p.status === 'SOLD' && p.soldPrice !== undefined)
    .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
    .slice(0, 10); // Top 10 for Facebook Graphic

  const topRowsHtml = sortedList.map((p, idx) => {
    const team = teams.find(t => t.id === p.teamId);
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
    const rankColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#64748b';

    return `
      <div style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="font-size: 26px; font-weight: 900; color: ${rankColor}; width: 50px; text-align: center;">${medal}</div>
          <div style="width: 50px; height: 50px; border-radius: 14px; background: #334155; overflow: hidden; shrink-0;">
            ${p.photoUrl ? `<img src="${p.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="width: 100%; height: 100%; display: flex; items-center; justify-content: center; font-weight: 900;">${p.name.charAt(0)}</div>`}
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 800; color: #ffffff;">${p.name} ${p.nickname ? `<span style="font-size: 15px; color: #94a3b8;">("${p.nickname}")</span>` : ''}</div>
            <div style="font-size: 13px; font-weight: 600; color: #cbd5e1;">${p.position} • Cat ${p.category} ${team ? `• ${team.name}` : ''}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: 900; color: #10b981;">৳${(p.soldPrice || 0).toLocaleString()}</div>
          <div style="font-size: 12px; font-weight: 700; color: #64748b;">BASE: ৳${(p.basePrice || 0).toLocaleString()}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(16, 185, 129, 0.4); padding-bottom: 24px;">
      <div>
        <div style="font-size: 38px; font-weight: 900; color: #ffffff; tracking-tight: -0.5px;">TOP SOLD PLAYERS RANKING</div>
        <div style="font-size: 18px; font-weight: 700; color: #10b981; text-transform: uppercase; margin-top: 4px;">MAX TO MIN SOLD PRICE LEADERBOARD 2026</div>
      </div>
      <div style="background: #059669; color: #ffffff; font-size: 20px; font-weight: 900; padding: 12px 28px; border-radius: 50px; text-transform: uppercase;">
        BBFF AUCTION
      </div>
    </div>

    <div style="flex: 1; display: flex; flex-direction: column; gap: 12px; margin: 30px 0;">
      ${topRowsHtml || '<div style="color: #64748b; font-size: 20px; text-align: center; padding: 60px;">No sold players recorded yet</div>'}
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; font-size: 16px; color: #64748b; font-weight: 700;">
      <div>BBFF INTRA LEAGUE S1 2026</div>
      <div>OFFICIAL FACEBOOK LEADERBOARD CARD</div>
    </div>
  `;

  document.body.appendChild(container);
  const filename = `BBFF_Sold_Prices_Max_To_Min_Leaderboard.png`;
  await downloadElementAsImage(container, filename);
  document.body.removeChild(container);
};
