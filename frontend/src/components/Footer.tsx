const Footer = () => {
    return (
        <footer className="border-t border-dark-border mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <p className="text-gray-400 flex items-center gap-2 flex-wrap justify-center">
                        <span>Built with</span>
                        <span className="text-red-500">❤️</span>
                        <span>fully on-chain on</span>
                        <span className="text-primary font-semibold flex items-center gap-1">
                            <span>Internet Computer</span>
                            <span className="text-2xl">∞</span>
                        </span>
                    </p>
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Bonsai NFT. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
