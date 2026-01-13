import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useIdentityKitAuth } from '../hooks/useIdentityKitAuth';
import { useBonsai } from '../hooks/useBonsai';
import WalletConnect from './WalletConnect';
import UserMenu from './UserMenu';
import logo from '../assets/logo-bg.png';

const Header = () => {
    const { isAuthenticated } = useIdentityKitAuth();
    const { testMode, checkTestMode } = useBonsai();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Check test mode when component mounts
        checkTestMode();
    }, []);

    return (
        <header className="border-b border-dark-border">
            {/* Test Mode Banner */}
            {testMode && (
                <div className="bg-yellow-600 text-black text-center py-2 px-4 text-sm font-semibold">
                    ⚠️ TEST MODE ACTIVE - No payments required (for testing only)
                </div>
            )}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex justify-between items-center">
                    <Link to="/" className="text-2xl font-bold text-primary flex items-center">
                        <div className="px-4 inline-block">
                            <img
                                src={logo}
                                alt="ICP Bonsai NFT Logo"
                                className="mx-auto w-16 h-16"
                            />
                        </div>
                        <div className="inline-block">
                            ICP Bonsai NFT
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex gap-6 items-center">
                        <Link to="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                            🏠 Home
                        </Link>
                        <Link to="/gallery" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                            🖼️ Gallery
                        </Link>
                        <Link to="/my-bonsais" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                            🌱 My Bonsais
                        </Link>
                        <Link to="/leaderboard" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                            🏆 Leaderboard
                        </Link>
                        <Link to="/about" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                            ℹ️ About
                        </Link>
                        {!isAuthenticated && <WalletConnect />}
                        <UserMenu />
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex md:hidden items-center gap-2">
                        {isAuthenticated && <UserMenu />}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-gray-400 hover:text-white p-2"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 flex flex-col gap-4 border-t border-dark-border pt-4">
                        <Link
                            to="/"
                            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            🏠 Home
                        </Link>
                        <Link
                            to="/gallery"
                            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            🖼️ Gallery
                        </Link>
                        <Link
                            to="/my-bonsais"
                            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            🌱 My Bonsais
                        </Link>
                        <Link
                            to="/leaderboard"
                            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            🏆 Leaderboard
                        </Link>
                        <Link
                            to="/about"
                            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            ℹ️ About
                        </Link>
                        {!isAuthenticated && (
                            <WalletConnect />
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
