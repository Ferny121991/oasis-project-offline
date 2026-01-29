import React, { useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
    type: 'none' | 'particles' | 'stars' | 'waves' | 'gradient-pulse';
    speed?: number;
    color?: string;
    intensity?: number;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
    type,
    speed = 1,
    color = '#ffffff',
    intensity = 50
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (type === 'none' || type === 'gradient-pulse') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: Particle[] = [];
        let width = 0;
        let height = 0;

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            alpha: number;

            constructor(w: number, h: number) {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.size = Math.random() * (type === 'stars' ? 2 : 4) + 1;
                const s = (speed * 0.5) + 0.1;
                this.speedX = (Math.random() - 0.5) * s;
                this.speedY = (Math.random() - 0.5) * s;
                this.alpha = Math.random() * 0.5 + 0.1;

                if (type === 'stars') {
                    this.speedX = 0;
                    this.speedY = 0;
                    this.alpha = Math.random();
                }
            }

            update(w: number, h: number) {
                if (type === 'particles') {
                    this.x += this.speedX;
                    this.y += this.speedY;

                    if (this.x < 0) this.x = w;
                    if (this.x > w) this.x = 0;
                    if (this.y < 0) this.y = h;
                    if (this.y > h) this.y = 0;
                } else if (type === 'stars') {
                    this.alpha += (Math.random() - 0.5) * 0.05 * speed;
                    if (this.alpha < 0) this.alpha = 0;
                    if (this.alpha > 1) this.alpha = 1;
                }
            }

            draw(context: CanvasRenderingContext2D, c: string, int: number) {
                context.fillStyle = c;
                context.globalAlpha = type === 'stars' ? this.alpha : (this.alpha * (int / 100));
                context.beginPath();
                context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                context.fill();
                context.globalAlpha = 1;
            }
        }

        const initParticles = (w: number, h: number) => {
            particles = [];
            if (w <= 0 || h <= 0) return; // Don't create particles if dimensions are invalid
            const count = Math.min(type === 'stars' ? (intensity * 3) : intensity, 500); // Cap particles
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(w, h));
            }
        };

        const updateDimensions = () => {
            const dpr = window.devicePixelRatio || 1;
            const offsetW = canvas.offsetWidth;
            const offsetH = canvas.offsetHeight;

            // Skip if dimensions are invalid
            if (offsetW <= 0 || offsetH <= 0) return;

            width = canvas.width = offsetW * dpr;
            height = canvas.height = offsetH * dpr;

            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
            ctx.scale(dpr, dpr);

            initParticles(offsetW, offsetH);
        };

        const drawWaves = (time: number) => {
            if (width <= 0 || height <= 0) return;

            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = intensity / 100;

            const displayWidth = canvas.offsetWidth;
            const displayHeight = canvas.offsetHeight;
            const waveCount = 3;

            for (let i = 0; i < waveCount; i++) {
                ctx.beginPath();
                for (let x = 0; x < displayWidth; x++) {
                    const y = displayHeight / 2 + Math.sin(x * 0.01 + time * speed * 0.001 + i) * 50 * (i + 1);
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        };

        const loop = (time: number) => {
            // Skip rendering if dimensions are not ready
            if (width <= 0 || height <= 0) {
                updateDimensions();
                animationRef.current = requestAnimationFrame(loop);
                return;
            }

            try {
                if (type === 'waves') {
                    drawWaves(time);
                } else {
                    ctx.clearRect(0, 0, width, height);
                    particles.forEach(p => {
                        p.update(canvas.offsetWidth, canvas.offsetHeight);
                        p.draw(ctx, color, intensity);
                    });
                }
            } catch (e) {
                console.error('AnimatedBackground render error:', e);
            }

            animationRef.current = requestAnimationFrame(loop);
        };

        // Initial setup with a small delay to ensure DOM is ready
        const initTimeout = setTimeout(() => {
            updateDimensions();
            animationRef.current = requestAnimationFrame(loop);
        }, 50);

        window.addEventListener('resize', updateDimensions);

        return () => {
            clearTimeout(initTimeout);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            window.removeEventListener('resize', updateDimensions);
        };
    }, [type, speed, color, intensity]);

    if (type === 'none') return null;

    if (type === 'gradient-pulse') {
        return (
            <div className="absolute inset-0 z-0 animate-pulse-slow"
                style={{
                    background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`
                }}
            />
        );
    }

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none w-full h-full"
            style={{ opacity: 0.8 }}
        />
    );
};

export default AnimatedBackground;

