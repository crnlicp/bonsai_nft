import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { IdentityKitProvider, IdentityKitTheme } from '@nfid/identitykit/react';
import { IdentityKitAuthType, NFIDW, InternetIdentity, Stoic, OISY } from '@nfid/identitykit';
import '@nfid/identitykit/react/styles.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import MyBonsais from './pages/MyBonsais';
import BonsaiDetail from './pages/BonsaiDetail';
import Wallet from './pages/Wallet';
import About from './pages/About';
import BonsaiTreeSimulation from './pages/BonsaiTreeSimulation';
import Leaderboard from './pages/Leaderboard';

// Canister IDs for delegation targets
const BACKEND_CANISTER_ID = import.meta.env.CANISTER_ID_BACKEND || "";
const LEDGER_CANISTER_ID = import.meta.env.CANISTER_ID_ICP_LEDGER_CANISTER; // ICP Ledger

// Detect environment
const isLocal = import.meta.env.DFX_NETWORK !== 'ic';
const localHost = 'http://127.0.0.1:4943';

// Available signers (wallets)
// Note: Plug and other extension wallets are auto-discovered via discoverExtensionSigners
const signers = [NFIDW, InternetIdentity, OISY];

function App() {
    return (
        <IdentityKitProvider
            // Signer configuration - includes all major ICP wallets
            signers={signers}
            // Enable automatic discovery of extension signers (Plug, etc.)
            discoverExtensionSigners={true}

            // Auth type - DELEGATION for seamless UX without approval pop-ups on target canisters
            authType={IdentityKitAuthType.DELEGATION}

            // Featured signer mode (can be "compact" or "featured")
            featuredSigner={false}

            // Theme configuration
            theme={IdentityKitTheme.SYSTEM} // LIGHT, DARK, or SYSTEM

            // Signer client options
            signerClientOptions={{
                // CRITICAL: For local development, set the host to the local replica
                ...(isLocal && {
                    host: localHost,
                    // This will cause the agent to fetch the root key for local development
                    fetchRootKey: true,
                }),

                // Target canisters for delegation - calls to these won't require approval pop-ups
                targets: [BACKEND_CANISTER_ID, LEDGER_CANISTER_ID].filter((s): s is string => Boolean(s)),

                // Delegation expiration (30 minutes in nanoseconds)
                maxTimeToLive: BigInt(30 * 60 * 1_000_000_000),

                // Idle timeout configuration
                idleOptions: {
                    idleTimeout: 1800000, // 30 minutes in milliseconds
                    captureScroll: true,
                    disableIdle: false,
                },

                // Key type for identity - Ed25519 is recommended for compatibility
                keyType: "Ed25519",
            }}

            // Event handlers
            onConnectSuccess={() => {
                console.log('✅ Wallet connected successfully');
                toast.success('Wallet connected successfully!');
            }}
            onConnectFailure={(error) => {
                console.error('❌ Connection failed:', error);

                // Provide helpful error messages based on the error
                const errorMessage = error?.message || String(error);

                if (errorMessage.includes('Cookies') || errorMessage.includes('cookie')) {
                    toast.error(
                        'Connection failed: Please enable cookies in your browser. ' +
                        'For Brave users: Go to Settings > Shields and allow all cookies for this site.',
                        { duration: 8000 }
                    );
                } else if (errorMessage.includes('Stoic') || errorMessage.includes('stoic')) {
                    toast.error(
                        'Stoic Wallet connection failed. Please ensure cookies are enabled and try again. ' +
                        'Known issue with Brave browser - try using Chrome or Firefox.',
                        { duration: 8000 }
                    );
                } else {
                    toast.error(`Connection failed: ${errorMessage}`, { duration: 6000 });
                }
            }}
            onDisconnect={() => {
                console.log('👋 Wallet disconnected');
                toast('Wallet disconnected');
            }}
        >
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#1a1a2e',
                        color: '#fff',
                        border: '1px solid #16213e',
                    },
                    success: {
                        iconTheme: {
                            primary: '#00d4aa',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            <Router>
                <div className="min-h-screen flex flex-col">
                    <Header />
                    <div className="flex-1">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/gallery" element={<Gallery />} />
                            <Route path="/my-bonsais" element={<MyBonsais />} />
                            <Route path="/bonsai/:id" element={<BonsaiDetail />} />
                            <Route path="/wallet" element={<Wallet />} />
                            <Route path="/leaderboard" element={<Leaderboard />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/simulation" element={<BonsaiTreeSimulation />} />
                        </Routes>
                    </div>
                    <Footer />
                </div>
            </Router>
        </IdentityKitProvider>
    );
}

export default App;
