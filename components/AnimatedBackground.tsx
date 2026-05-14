import React, { useEffect, useRef } from 'react';
import { BackgroundAnimationType } from '../types';

interface AnimatedBackgroundProps {
    type: BackgroundAnimationType;
    speed?: number;
    color?: string;
    color2?: string;
    intensity?: number;
    size?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'center' | 'random';
    shape?: 'circle' | 'square' | 'line' | 'cross' | 'diamond';
    staticMode?: boolean;
}

type Particle = {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    alpha: number;
    rotation: number;
    spin: number;
    hue: number;
};

const cssAnimationTypes: BackgroundAnimationType[] = ['gradient-pulse', 'aurora', 'rays'];

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
    type,
    speed = 1,
    color = '#ffffff',
    color2 = '#6366f1',
    intensity = 50,
    size = 12,
    direction = 'random',
    shape = 'circle',
    staticMode = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (type === 'none' || cssAnimationTypes.includes(type)) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: Particle[] = [];
        let displayWidth = 0;
        let displayHeight = 0;

        const countForType = () => {
            const multiplier = type === 'stars' || type === 'snow' ? 3 : type === 'rain' ? 5 : 1;
            return Math.min(Math.max(Math.round(intensity * multiplier), 12), 650);
        };

        const velocityForDirection = () => {
            const base = Math.max(0.08, speed * 0.35);
            if (direction === 'up') return { x: 0, y: -base };
            if (direction === 'down') return { x: 0, y: base };
            if (direction === 'left') return { x: -base, y: 0 };
            if (direction === 'right') return { x: base, y: 0 };
            if (direction === 'center') return { x: 0, y: 0 };
            return { x: (Math.random() - 0.5) * base * 2, y: (Math.random() - 0.5) * base * 2 };
        };

        const createParticle = (w: number, h: number): Particle => {
            const velocity = velocityForDirection();
            const particleSize = Math.max(1, (Math.random() * size) + 1);

            return {
                x: Math.random() * w,
                y: Math.random() * h,
                size: type === 'rain' ? Math.max(8, particleSize * 2) : particleSize,
                speedX: velocity.x,
                speedY: velocity.y,
                alpha: Math.random() * 0.55 + 0.2,
                rotation: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.025 * speed,
                hue: Math.random()
            };
        };

        const updateDimensions = () => {
            const dpr = window.devicePixelRatio || 1;
            const nextWidth = canvas.offsetWidth;
            const nextHeight = canvas.offsetHeight;
            if (nextWidth <= 0 || nextHeight <= 0) return;

            displayWidth = nextWidth;
            displayHeight = nextHeight;
            canvas.width = nextWidth * dpr;
            canvas.height = nextHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            particles = Array.from({ length: countForType() }, () => createParticle(nextWidth, nextHeight));
        };

        const wrapParticle = (p: Particle) => {
            const margin = 40;
            if (p.x < -margin) p.x = displayWidth + margin;
            if (p.x > displayWidth + margin) p.x = -margin;
            if (p.y < -margin) p.y = displayHeight + margin;
            if (p.y > displayHeight + margin) p.y = -margin;
        };

        const drawParticleShape = (p: Particle, drawShape: AnimatedBackgroundProps['shape']) => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.beginPath();
            if (drawShape === 'square') {
                ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else if (drawShape === 'diamond') {
                ctx.moveTo(0, -p.size);
                ctx.lineTo(p.size, 0);
                ctx.lineTo(0, p.size);
                ctx.lineTo(-p.size, 0);
                ctx.closePath();
            } else if (drawShape === 'line') {
                ctx.moveTo(0, -p.size);
                ctx.lineTo(0, p.size);
                ctx.stroke();
                ctx.restore();
                return;
            } else if (drawShape === 'cross') {
                ctx.moveTo(-p.size, 0);
                ctx.lineTo(p.size, 0);
                ctx.moveTo(0, -p.size);
                ctx.lineTo(0, p.size);
                ctx.stroke();
                ctx.restore();
                return;
            } else {
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.restore();
        };

        const drawWaves = (time: number) => {
            ctx.clearRect(0, 0, displayWidth, displayHeight);
            ctx.lineWidth = Math.max(1, size / 7);
            ctx.globalAlpha = Math.min(0.85, intensity / 100);
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.strokeStyle = i % 2 === 0 ? color : color2;
                for (let x = -20; x <= displayWidth + 20; x += 8) {
                    const waveHeight = 22 + (i * 18);
                    const y = (displayHeight / 2) + Math.sin((x * 0.012) + (time * speed * 0.0012) + i) * waveHeight;
                    if (x === -20) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        };

        const loop = (time: number) => {
            if (displayWidth <= 0 || displayHeight <= 0) {
                updateDimensions();
                if (!staticMode) animationRef.current = requestAnimationFrame(loop);
                return;
            }

            ctx.clearRect(0, 0, displayWidth, displayHeight);

            if (type === 'waves') {
                drawWaves(time);
                if (!staticMode) animationRef.current = requestAnimationFrame(loop);
                return;
            }

            particles.forEach((p, index) => {
                if (type === 'stars') {
                    p.alpha += (Math.random() - 0.5) * 0.04 * speed;
                    p.alpha = Math.max(0.12, Math.min(1, p.alpha));
                } else if (type === 'spiral') {
                    const angle = time * 0.00025 * speed + index * 0.28;
                    const radius = ((index % 80) / 80) * Math.min(displayWidth, displayHeight) * 0.5;
                    p.x = displayWidth / 2 + Math.cos(angle + index) * radius;
                    p.y = displayHeight / 2 + Math.sin(angle + index) * radius;
                } else if (type === 'fireflies') {
                    p.speedX += (Math.random() - 0.5) * 0.035 * speed;
                    p.speedY += (Math.random() - 0.5) * 0.035 * speed;
                    p.speedX = Math.max(-1.2, Math.min(1.2, p.speedX));
                    p.speedY = Math.max(-1.2, Math.min(1.2, p.speedY));
                    p.x += p.speedX;
                    p.y += p.speedY;
                    p.alpha = 0.25 + Math.abs(Math.sin(time * 0.002 * speed + index)) * 0.75;
                } else if (type === 'rain') {
                    p.y += Math.max(2, speed * 3.5);
                    p.x += p.speedX * 0.4;
                } else if (type === 'snow') {
                    p.y += Math.max(0.25, speed * 0.55);
                    p.x += Math.sin(time * 0.001 + index) * 0.35;
                } else {
                    p.x += p.speedX;
                    p.y += p.speedY;
                }

                p.rotation += p.spin;
                wrapParticle(p);

                const mixedColor = p.hue > 0.5 ? color : color2;
                ctx.fillStyle = mixedColor;
                ctx.strokeStyle = mixedColor;
                ctx.lineWidth = Math.max(1, p.size / 4);
                ctx.globalAlpha = Math.min(0.95, p.alpha * (intensity / 80));

                if (type === 'rain') {
                    drawParticleShape(p, 'line');
                } else if (type === 'confetti') {
                    drawParticleShape(p, p.hue > 0.5 ? 'square' : 'diamond');
                } else if (type === 'cross-light') {
                    drawParticleShape(p, 'cross');
                } else if (type === 'bubbles') {
                    ctx.globalAlpha = Math.min(0.45, p.alpha);
                    ctx.strokeStyle = mixedColor;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (type === 'custom') {
                    drawParticleShape(p, shape);
                } else {
                    drawParticleShape(p, 'circle');
                }
            });

            ctx.globalAlpha = 1;
            if (!staticMode) animationRef.current = requestAnimationFrame(loop);
        };

        const initTimeout = setTimeout(() => {
            updateDimensions();
            loop(0);
        }, 50);

        window.addEventListener('resize', updateDimensions);

        return () => {
            clearTimeout(initTimeout);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', updateDimensions);
        };
    }, [type, speed, color, color2, intensity, size, direction, shape, staticMode]);

    if (type === 'none') return null;

    if (type === 'gradient-pulse') {
        return (
            <div
                className={`absolute inset-0 z-0 pointer-events-none ${staticMode ? '' : 'animate-pulse-slow'}`}
                style={{
                    background: `radial-gradient(circle at center, ${color}55 0%, ${color2}22 34%, transparent 72%)`
                }}
            />
        );
    }

    if (type === 'aurora') {
        return (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -inset-[30%] opacity-70 blur-3xl"
                    style={{
                        background: `conic-gradient(from 120deg, transparent 0deg, ${color} 80deg, ${color2} 160deg, transparent 260deg, ${color} 320deg, transparent 360deg)`,
                        animation: staticMode ? 'none' : `auroraFlow ${Math.max(6, 18 / speed)}s ease-in-out infinite alternate`
                    }}
                />
            </div>
        );
    }

    if (type === 'rays') {
        return (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -inset-[20%] opacity-55"
                    style={{
                        background: `repeating-conic-gradient(from 0deg, ${color}33 0deg 8deg, transparent 8deg 22deg, ${color2}22 22deg 30deg, transparent 30deg 44deg)`,
                        animation: staticMode ? 'none' : `slowSpin ${Math.max(12, 32 / speed)}s linear infinite`
                    }}
                />
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none w-full h-full"
            style={{ opacity: 0.9 }}
        />
    );
};

export default AnimatedBackground;
