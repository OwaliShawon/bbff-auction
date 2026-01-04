import React from 'react';

interface LotteryResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: {
        winnerName: string;
        calculation: string;
        teamList: { index: number; name: string }[];
    } | null;
}

export const LotteryResultModal: React.FC<LotteryResultModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    data
}) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-1">🎉 Lottery Result 🎉</h2>
                    <p className="text-purple-100 text-sm">Tie-Breaker Decision</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Winner Section */}
                    <div className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                        <span className="block text-gray-400 text-sm uppercase tracking-wider mb-1">The Winner Is</span>
                        <span className="block text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            {data.winnerName}
                        </span>
                    </div>

                    {/* Details Section */}
                    <div className="space-y-4">
                        <div className="bg-black/20 rounded-lg p-3 border border-gray-700/50">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Calculation Logic</h3>
                            <code className="block text-xs text-yellow-300 font-mono break-all">
                                {data.calculation}
                            </code>
                        </div>

                        <div className="bg-black/20 rounded-lg p-3 border border-gray-700/50 max-h-40 overflow-y-auto">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 sticky top-0 bg-transparent">Participating Teams</h3>
                            <div className="space-y-1">
                                {data.teamList.map((team) => (
                                    <div key={team.index} className="flex justify-between text-sm text-gray-300 px-1 hover:bg-white/5 rounded">
                                        <span className="font-mono text-gray-500">[{team.index}]</span>
                                        <span className={team.name === data.winnerName ? "text-emerald-400 font-bold" : ""}>
                                            {team.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105"
                    >
                        Confirm Winner
                    </button>
                </div>
            </div>
        </div>
    );
};
