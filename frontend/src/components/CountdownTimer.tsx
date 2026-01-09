import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
    timeRemaining: bigint; // in nanoseconds
    hasActiveRound?: boolean; // Whether there's an active round with users
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ timeRemaining, hasActiveRound = false }) => {
    // Convert nanoseconds to seconds
    const totalSeconds = Number(timeRemaining / 1_000_000_000n);

    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    // Track previous values for flip animation
    const [prevValues, setPrevValues] = useState({ days, hours, minutes, seconds });
    const [flipping, setFlipping] = useState({ days: false, hours: false, minutes: false, seconds: false });

    useEffect(() => {
        // Check which values changed
        const newFlipping = {
            days: days !== prevValues.days,
            hours: hours !== prevValues.hours,
            minutes: minutes !== prevValues.minutes,
            seconds: seconds !== prevValues.seconds,
        };

        setFlipping(newFlipping);

        // Reset flip animation after 600ms
        const timer = setTimeout(() => {
            setFlipping({ days: false, hours: false, minutes: false, seconds: false });
            setPrevValues({ days, hours, minutes, seconds });
        }, 600);

        return () => clearTimeout(timer);
    }, [days, hours, minutes, seconds]);

    const FlipDigit = ({ value, isFlipping, label }: { value: number; isFlipping: boolean; label: string }) => (
        <div className="text-center">
            <div className="relative bg-white/20 rounded-lg p-3 backdrop-blur-sm overflow-hidden" style={{ perspective: '400px' }}>
                <div
                    className={`text-3xl font-bold transition-transform duration-600 ${isFlipping ? 'animate-flip' : ''}`}
                    style={{
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {value}
                </div>
            </div>
            <div className="text-xs uppercase mt-1 opacity-80">{label}</div>
        </div>
    );

    return (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
            {timeRemaining === 0n ? (
                <div className="text-center">
                    {hasActiveRound ? (
                        <>
                            <h3 className="text-xl font-semibold mb-3">🎉 Round Ended!</h3>
                            <p className="text-sm text-gray-200">
                                Processing airdrop... Winners will be able to claim rewards from "Previous Rounds" section.
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-semibold mb-2">⏳ Waiting for Round to Start</h3>
                            <p className="text-sm text-gray-200">
                                The next round will start when 3 unique users mint bonsais
                            </p>
                        </>
                    )}
                </div>
            ) : (<>
                <h3 className="text-xl font-semibold mb-4 text-center">Next Airdrop In</h3>
                <div className="grid grid-cols-4 gap-5">
                    <FlipDigit value={days} isFlipping={flipping.days} label="Days" />
                    <FlipDigit value={hours} isFlipping={flipping.hours} label="Hours" />
                    <FlipDigit value={minutes} isFlipping={flipping.minutes} label="Minutes" />
                    <FlipDigit value={seconds} isFlipping={flipping.seconds} label="Seconds" />
                </div>
            </>)}
            <style>{`
                @keyframes flip {
                    0% {
                        transform: rotateX(0deg);
                    }
                    50% {
                        transform: rotateX(90deg);
                    }
                    100% {
                        transform: rotateX(0deg);
                    }
                }
                .animate-flip {
                    animation: flip 0.7s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default CountdownTimer;
