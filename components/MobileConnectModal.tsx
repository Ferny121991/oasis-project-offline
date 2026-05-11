import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Check, Copy, Link, Monitor, Radio, ShieldCheck, Smartphone, Wifi, X } from 'lucide-react';
import { createRealtimeSyncService, LiveState } from '../services/realtimeService';
import RemoteControlPanel from './RemoteControlPanel';

interface MobileConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    controlId: string;
}

const MobileConnectModal: React.FC<MobileConnectModalProps> = ({ isOpen, onClose, controlId }) => {
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('');
    const [copied, setCopied] = useState(false);
    const [showMobileControl, setShowMobileControl] = useState(false);
    const [liveState, setLiveState] = useState<LiveState | null>(null);
    const previewSyncService = useRef(createRealtimeSyncService());

    useEffect(() => {
        const savedIp = localStorage.getItem('oasis_host_ip');
        if (savedIp) {
            setIpAddress(savedIp);
        } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            setIpAddress(window.location.hostname);
        }

        setPort(window.location.port || '');
    }, []);

    useEffect(() => {
        if (!showMobileControl || !controlId) return;

        const syncService = previewSyncService.current;
        syncService.subscribe(controlId, (state: LiveState) => {
            setLiveState(state);
        });

        return () => {
            syncService.unsubscribe();
        };
    }, [showMobileControl, controlId]);

    const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIpAddress(e.target.value);
        localStorage.setItem('oasis_host_ip', e.target.value);
    };

    const getConnectUrl = () => {
        const host = ipAddress || 'TU_IP_LOCAL';
        const portPart = port ? `:${port}` : '';
        return `${window.location.protocol}//${host}${portPart}${window.location.pathname}?remote=1&uid=${encodeURIComponent(controlId)}`;
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(getConnectUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0b1020] border border-indigo-400/20 rounded-2xl w-full max-w-md shadow-2xl shadow-indigo-950/40 overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                    title="Cerrar"
                >
                    <X size={24} />
                </button>

                {!showMobileControl ? (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                                <Smartphone size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">Control Remoto Movil</h2>
                                <p className="text-xs text-indigo-100/70">Enlace directo para controlar desde el celular</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                                    <div className="flex items-center gap-2 text-emerald-300 text-[10px] font-black uppercase">
                                        <ShieldCheck size={13} /> Misma red
                                    </div>
                                    <p className="text-[11px] text-slate-300 mt-1">PC y celular en el mismo WiFi.</p>
                                </div>
                                <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/10 p-3">
                                    <div className="flex items-center gap-2 text-indigo-300 text-[10px] font-black uppercase">
                                        <Radio size={13} /> Tiempo real
                                    </div>
                                    <p className="text-[11px] text-slate-300 mt-1">Los botones envian comandos al instante.</p>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] p-4 rounded-xl border border-white/10">
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block flex items-center gap-2">
                                    <Wifi size={12} /> IP local del computador
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={ipAddress}
                                        onChange={handleIpChange}
                                        placeholder="Ej: 192.168.1.15"
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-indigo-400 outline-none transition-colors"
                                    />
                                    <input
                                        type="text"
                                        value={port}
                                        onChange={(e) => setPort(e.target.value)}
                                        placeholder="Puerto"
                                        className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-indigo-400 outline-none transition-colors text-center"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    En Windows usa <code className="bg-slate-800 px-1 rounded">ipconfig</code> y copia la IPv4. Si estas en Netlify, no necesitas IP local.
                                </p>
                            </div>

                            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl">
                                {ipAddress ? (
                                    <QRCode
                                        value={getConnectUrl()}
                                        size={200}
                                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                        viewBox="0 0 256 256"
                                    />
                                ) : (
                                    <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400 text-xs text-center border-2 border-dashed border-slate-300 rounded-lg">
                                        Ingresa tu IP para generar el codigo QR
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/30 p-3 rounded-xl">
                                <Link size={14} className="text-indigo-300 shrink-0" />
                                <div className="flex-1 px-1 font-mono text-xs text-indigo-300 truncate">
                                    {getConnectUrl()}
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="p-1.5 hover:bg-indigo-500/20 rounded text-indigo-300 transition-colors"
                                    title="Copiar enlace"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>

                            <button
                                onClick={() => setShowMobileControl(true)}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/25 active:scale-[0.99]"
                            >
                                <Monitor size={18} />
                                Probar Control Remoto Aqui
                            </button>

                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20">
                                    <Wifi size={10} /> Si no abre, revisa IP, puerto y WiFi
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="fixed inset-0 z-[100000] bg-[#070b16] w-full h-[100dvh] flex flex-col m-0 p-0 overflow-hidden">
                        <RemoteControlPanel
                            liveState={liveState}
                            isConnected={previewSyncService.current.isConnected()}
                            sendCommand={(cmd, data) => previewSyncService.current.sendCommand(controlId, cmd, data)}
                            onClose={() => setShowMobileControl(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileConnectModal;
