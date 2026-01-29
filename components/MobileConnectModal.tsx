import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Smartphone, X, Wifi, Copy, Check } from 'lucide-react';

interface MobileConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MobileConnectModal: React.FC<MobileConnectModalProps> = ({ isOpen, onClose }) => {
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('5173');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Load saved IP from local storage
        const savedIp = localStorage.getItem('oasis_host_ip');
        if (savedIp) {
            setIpAddress(savedIp);
        } else {
            // Try to guess default if localhost
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                setIpAddress(window.location.hostname);
            }
        }

        if (window.location.port) {
            setPort(window.location.port);
        }
    }, []);

    const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIpAddress(e.target.value);
        localStorage.setItem('oasis_host_ip', e.target.value);
    };

    const getConnectUrl = () => {
        const host = ipAddress || 'YOUR_IP_ADDRESS';
        return `${window.location.protocol}//${host}:${port}`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getConnectUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Control Remoto Móvil</h2>
                            <p className="text-xs text-gray-400">Escanea para controlar desde tu celular</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block flex items-center gap-2">
                                <Wifi size={12} /> Tu Dirección IP Local
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={ipAddress}
                                    onChange={handleIpChange}
                                    placeholder="Ej: 192.168.1.15"
                                    className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 outline-none transition-colors"
                                />
                                <input
                                    type="text"
                                    value={port}
                                    onChange={(e) => setPort(e.target.value)}
                                    placeholder="Puerto"
                                    className="w-20 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 outline-none transition-colors text-center"
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">
                                * Abre la terminal y escribe <code className="bg-gray-700 px-1 rounded">ipconfig</code> (Windows) para ver tu IPv4.
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl">
                            {ipAddress ? (
                                <QRCode
                                    value={getConnectUrl()}
                                    size={200}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 256 256`}
                                />
                            ) : (
                                <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-xs text-center border-2 border-dashed border-gray-300 rounded-lg">
                                    Ingresa tu IP para generar el código QR
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg">
                            <div className="flex-1 px-2 font-mono text-xs text-indigo-300 truncate">
                                {getConnectUrl()}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="p-1.5 hover:bg-indigo-600/20 rounded text-indigo-400 transition-colors"
                                title="Copiar Enlace"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>

                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20">
                                <Wifi size={10} /> Asegúrate que ambos dispositivos estén en la misma red WiFi
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileConnectModal;
