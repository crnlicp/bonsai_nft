import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@nfid/identitykit/react';
import { useBalance } from '../hooks/useBalance';

const UserMenu = () => {
    const { user, disconnect } = useAuth();
    const { balance, formatICP, fetchBalance } = useBalance();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Refresh balance when menu opens
    useEffect(() => {
        if (showMenu) {
            fetchBalance();
        }
    }, [showMenu, fetchBalance]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleCopyPrincipal = () => {
        if (user?.principal) {
            navigator.clipboard.writeText(user.principal.toString());
            toast.success('Principal ID copied to clipboard!');
        }
    };

    const handleWalletClick = () => {
        navigate('/wallet');
        setShowMenu(false);
    };

    const handleLogout = async () => {
        await disconnect();
        setShowMenu(false);
        toast.success('Disconnected');
    };

    if (!user) {
        return null;
    }

    const truncatePrincipal = (p: string) => {
        if (p.length <= 12) return p;
        return `${p.slice(0, 6)}...${p.slice(-4)}`;
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-card transition"
                title="User Menu"
            >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    👤
                </div>
            </button>

            {showMenu && (
                <div className="absolute right-0 mt-2 w-72 card z-50 shadow-xl">
                    {/* Balance Section */}
                    <div className="px-4 py-3 border-b border-dark-border">
                        <div className="text-xs text-gray-400 mb-1">Balance</div>
                        <div className="text-lg font-mono text-primary">
                            {formatICP(balance)} ICP
                        </div>
                    </div>

                    {/* Principal ID Section */}
                    <div className="px-4 py-3 border-b border-dark-border">
                        <div className="text-xs text-gray-400 mb-1">Principal ID</div>
                        <div className="flex items-center gap-2">
                            <div className="font-mono text-sm text-white flex-1 truncate">
                                {truncatePrincipal(user.principal.toString())}
                            </div>
                            <button
                                onClick={handleCopyPrincipal}
                                className="text-gray-400 hover:text-primary transition p-1"
                                title="Copy Principal ID"
                            >
                                📋
                            </button>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <button
                            onClick={handleWalletClick}
                            className="w-full text-left px-4 py-2 hover:bg-dark-bg transition flex items-center gap-2"
                        >
                            <span>💼</span>
                            <span>Wallet</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 hover:bg-dark-bg transition flex items-center gap-2 text-red-400"
                        >
                            <span>🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
