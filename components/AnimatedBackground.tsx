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

    useEffect(() => {
        if (type === 'none' || type === 'gradient-pulse') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        const updateDimensions = () => {
            const dpr = window.devicePixelRatio || 1;
            width = canvas.width = canvas.offsetWidth * dpr;
            height = canvas.height = canvas.offsetHeight * dpr;
            // Scale context to match
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);

            // Re-init particles if needed or update their bounds
            initParticles();
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions(); // Initial call

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            alpha: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
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

            update() {
                if (type === 'particles') {
                    this.x += this.speedX;
                    this.y += this.speedY;

                    if (this.x < 0) this.x = width;
                    if (this.x > width) this.x = 0;
                    if (this.y < 0) this.y = height;
                    if (this.y > height) this.y = 0;
                } else if (type === 'stars') {
                    this.alpha += (Math.random() - 0.5) * 0.05 * speed;
                    if (this.alpha < 0) this.alpha = 0;
                    if (this.alpha > 1) this.alpha = 1;
                }
            }

            draw() {
                if (!ctx) return;
                ctx.fillStyle = color; // Use prop color
                ctx.globalAlpha = type === 'stars' ? this.alpha : (this.alpha * (intensity / 100));
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        const initParticles = () => {
            particles = [];
            const count = type === 'stars' ? (intensity * 3) : intensity;
            for (let i = 0; i < count; i++) {
                particles.push(new Particle());
            }
        };

        const drawWaves = (time: number) => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = intensity / 100;

            const waveCount = 3;
            for (let i = 0; i < waveCount; i++) {
                ctx.beginPath();
                for (let x = 0; x < width; x++) {
                    const y = height / 2 + Math.sin(x * 0.01 + time * speed * 0.001 + i) * 50 * (i + 1);
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        };

        const loop = (time: number) => {
            if (type === 'waves') {
                drawWaves(time);
            } else {
                ctx.clearRect(0, 0, width, height);
                particles.forEach(p => {
                    p.update();
                    p.draw();
                });
            }
            animationFrameId = requestAnimationFrame(loop);
        };

        initParticles();
        loop(0);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', () => { });
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
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ opacity: 0.8 }}
        />
    );
};

export default AnimatedBackground;
