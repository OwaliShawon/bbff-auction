
import React, { useState, useRef } from 'react';
import { Player, PlayerCategory, UserRole, PlayerStatus } from '../types';
import { ExcelImporter } from './ExcelImporter';

interface PlayerManagementProps {
  players: Player[];
  onAddPlayer: (player: any) => void;
  onUpdatePlayer: (player: Player) => void;
  onUpdatePhoto: (id: string, url: string) => void;
  setPlayers: (players: Player[]) => void;
  onClearAll: () => void;
  role: UserRole;
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
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        // Increased quality to 0.85 for "original-like" clarity
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        // Cleanup
        img.src = "";
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
};

export const PlayerManagement: React.FC<PlayerManagementProps> = ({ 
  players, onAddPlayer, onUpdatePlayer, onUpdatePhoto, setPlayers, onClearAll, role 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    primaryPosition: '',
    secondaryPosition: '',
    category: PlayerCategory.A as PlayerCategory
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.department || !formData.primaryPosition) return;
    
    const combinedPosition = formData.secondaryPosition.trim() 
      ? `${formData.primaryPosition.trim()} / ${formData.secondaryPosition.trim()}`
      : formData.primaryPosition.trim();

    const submissionData = {
      name: formData.name,
      department: formData.department,
      position: combinedPosition,
      category: formData.category
    };

    if (editPlayerId) {
      const existingPlayer = players.find(p => p.id === editPlayerId);
      if (existingPlayer) {
        onUpdatePlayer({
          ...existingPlayer,
          ...submissionData
        });
      }
    } else {
      onAddPlayer(submissionData);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', department: '', primaryPosition: '', secondaryPosition: '', category: PlayerCategory.A });
    setEditPlayerId(null);
    setShowForm(false);
  };

  const startEdit = (player: Player) => {
    const posParts = player.position.split(' / ');
    setFormData({
      name: player.name,
      department: player.department,
      primaryPosition: posParts[0] || '',
      secondaryPosition: posParts[1] || '',
      category: player.category
    });
    setEditPlayerId(player.id);
    setShowForm(true);
  };

  const handlePhotoChange = async (playerId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file, 500, 500);
        onUpdatePhoto(playerId, resizedBase64);
      } catch (error) {
        console.error("Error resizing image:", error);
        alert("Failed to process image.");
      }
    }
  };

  const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhotos(true);
    let updatedCount = 0;
    const newPlayers = [...players];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const isImage = file.type.startsWith('image/') || 
                       /\.(jpg|jpeg|png|webp|avif)$/i.test(file.name);
        if (!isImage) continue;

        const fileNameWithExt = file.name;
        const fileName = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.')).trim();
        
        const matchingIndices = newPlayers.reduce((acc: number[], p, idx) => {
          if (p.photoId && String(p.photoId).toLowerCase().trim() === fileName.toLowerCase()) {
            acc.push(idx);
          }
          return acc;
        }, []);

        if (matchingIndices.length > 0) {
          try {
            // High resolution (500px) for bulk processing
            const resizedBase64 = await resizeImage(file, 500, 500);
            matchingIndices.forEach(idx => {
              newPlayers[idx] = { ...newPlayers[idx], photoUrl: resizedBase64 };
              updatedCount++;
            });
          } catch (fileErr) {
            console.warn(`Could not process file ${file.name}:`, fileErr);
          }
        }
      }

      setPlayers(newPlayers);
      if (updatedCount > 0) {
        alert(`Bulk update complete! Successfully assigned high-quality photos to ${updatedCount} profiles.`);
      } else {
        alert("No matching Photo IDs found. Ensure filenames match the 'Photo ID' column in Excel.");
      }
    } catch (error: any) {
      console.error("Bulk photo process error:", error);
      let message = error instanceof Error ? error.message : String(error);
      alert(`Error during bulk process: ${message}`);
    } finally {
      setIsProcessingPhotos(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Player Pool Management</h2>
          <p className="text-xs text-slate-500 font-medium">Manage your roster and sync photos using Excel Photo IDs.</p>
        </div>
        {role === UserRole.ADMIN && (
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={onClearAll}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition shadow-sm text-sm"
            >
              Clear All Data
            </button>
            <ExcelImporter setPlayers={setPlayers} />
            
            {players.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isProcessingPhotos}
                  className={`bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow flex items-center text-sm ${isProcessingPhotos ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  {isProcessingPhotos ? 'Syncing...' : 'Upload Photo Folder'}
                </button>
                <input 
                  type="file" 
                  ref={folderInputRef} 
                  onChange={handleBulkPhotoUpload} 
                  multiple
                  //@ts-ignore
                  webkitdirectory="true"
                  className="hidden" 
                />
              </div>
            )}

            <button 
              onClick={() => setShowForm(true)}
              className="bg-therap text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition shadow text-sm"
            >
              + Add Player
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editPlayerId ? 'Edit Player Info' : 'Add New Player'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700">Full Name</label>
                <input 
                  className="w-full border p-2 rounded mt-1 outline-therap" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Mamoor"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700">Dept Name (Office)</label>
                <input 
                  className="w-full border p-2 rounded mt-1 outline-therap" 
                  value={formData.department} 
                  onChange={e => setFormData({...formData, department: e.target.value})} 
                  placeholder="e.g. System Team"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">Primary Position</label>
                  <input 
                    className="w-full border p-2 rounded mt-1 outline-therap" 
                    value={formData.primaryPosition} 
                    onChange={e => setFormData({...formData, primaryPosition: e.target.value})} 
                    placeholder="e.g. Attack"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">Secondary Position</label>
                  <input 
                    className="w-full border p-2 rounded mt-1 outline-therap" 
                    value={formData.secondaryPosition} 
                    onChange={e => setFormData({...formData, secondaryPosition: e.target.value})} 
                    placeholder="e.g. Midfield"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700">Category (A/B/C)</label>
                <select 
                  className="w-full border p-2 rounded mt-1 outline-therap" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value as PlayerCategory})}
                >
                  <option value={PlayerCategory.A}>Category A (Base 15,000)</option>
                  <option value={PlayerCategory.B}>Category B (Base 8,000)</option>
                  <option value={PlayerCategory.C}>Category C (Base 5,000)</option>
                </select>
              </div>
              <div className="flex space-x-2 pt-2">
                <button type="submit" className="flex-1 bg-therap text-white py-2 rounded font-bold">
                  {editPlayerId ? 'Update Info' : 'Save Player'}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {players.map(player => (
          <div key={player.id} className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full hover:shadow-lg transition">
            <div className="h-56 bg-slate-100 relative group overflow-hidden">
              {player.photoUrl ? (
                <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <p className="text-[10px] uppercase font-black tracking-widest text-center px-4">
                    {player.photoId ? `ID: ${player.photoId}` : 'Photo Required'}
                  </p>
                </div>
              )}
              
              {role === UserRole.ADMIN && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-4">
                  <label className="cursor-pointer bg-white text-therap px-3 py-2 rounded-lg font-bold shadow text-xs">
                    Upload Photo
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg, image/webp" 
                      className="hidden" 
                      onChange={(e) => handlePhotoChange(player.id, e)} 
                    />
                  </label>
                  <button 
                    onClick={() => startEdit(player)}
                    className="bg-therap text-white px-3 py-2 rounded-lg font-bold shadow text-xs"
                  >
                    Edit Info
                  </button>
                </div>
              )}

              <div className="absolute top-3 right-3 flex space-x-1">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm ${player.status === PlayerStatus.SOLD ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                  {player.status}
                </span>
                <span className="px-2 py-1 bg-yellow-400 text-black rounded text-[10px] font-bold uppercase shadow-sm">
                  CAT {player.category}
                </span>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
              <div className="mb-4">
                <h4 className="text-lg font-bold text-slate-800 leading-tight">{player.name}</h4>
                <p className="text-sm text-slate-500 font-medium">{player.position}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{player.department}</p>
              </div>
              
              <div className="mt-auto space-y-2">
                <div className="flex justify-between text-xs py-1.5 border-t border-slate-50">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">Base Price</span>
                  <span className="font-black text-slate-700">৳ {player.basePrice}</span>
                </div>
                {player.soldPrice && (
                  <div className="flex justify-between text-xs py-1.5 border-t border-slate-50">
                    <span className="text-slate-400 font-bold uppercase tracking-tighter">Sold Price</span>
                    <span className="font-black text-green-600">৳ {player.soldPrice}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
             <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
             <p className="text-lg font-medium">No players in the pool yet</p>
             <p className="text-sm">Import via Excel to begin. Make sure your Excel has a "Photo ID" column.</p>
          </div>
        )}
      </div>
    </div>
  );
};
