import React, { useState, useRef } from 'react';
import { PresentationItem, Theme } from '../types';
import { Download, Upload, X, FileJson, Check, AlertCircle } from 'lucide-react';

interface ExportImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    playlist: PresentationItem[];
    customThemes: Theme[];
    onImport: (items: PresentationItem[], themes: Theme[], mode: 'replace' | 'merge') => void;
}

interface OasisExportData {
    version: string;
    exportedAt: string;
    name: string;
    playlist: PresentationItem[];
    customThemes: Theme[];
}

const ExportImportModal: React.FC<ExportImportModalProps> = ({
    isOpen,
    onClose,
    playlist,
    customThemes,
    onImport
}) => {
    const [mode, setMode] = useState<'export' | 'import'>('export');
    const [exportName, setExportName] = useState('');
    const [importData, setImportData] = useState<OasisExportData | null>(null);
    const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleExport = () => {
        if (!exportName.trim()) {
            setError('Por favor ingresa un nombre para el archivo');
            return;
        }

        const data: OasisExportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            name: exportName.trim(),
            playlist,
            customThemes
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportName.trim().replace(/\s+/g, '_')}.oasis.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSuccess(`Archivo "${exportName}.oasis.json" descargado exitosamente`);
        setTimeout(() => {
            setSuccess(null);
            onClose();
        }, 2000);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setImportData(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonData = JSON.parse(event.target?.result as string);

                // Validate structure
                if (!jsonData.playlist || !Array.isArray(jsonData.playlist)) {
                    throw new Error('Archivo inválido: no contiene playlist');
                }

                setImportData({
                    version: jsonData.version || '1.0',
                    exportedAt: jsonData.exportedAt || 'Desconocido',
                    name: jsonData.name || file.name.replace('.oasis.json', ''),
                    playlist: jsonData.playlist,
                    customThemes: jsonData.customThemes || []
                });
            } catch (err) {
                setError('Error al leer el archivo. Asegúrate de que sea un archivo .oasis.json válido.');
            }
        };
        reader.readAsText(file);
    };

    const handleImport = () => {
        if (!importData) return;

        onImport(importData.playlist, importData.customThemes, importMode);
        setSuccess(`Importado exitosamente: ${importData.playlist.length} items`);
        setTimeout(() => {
            setSuccess(null);
            onClose();
        }, 2000);
    };

    const formatDate = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleDateString('es', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoString;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <FileJson size={20} />
                        Importar / Exportar Playlist
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Selector */}
                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => { setMode('export'); setError(null); setImportData(null); }}
                        className={`flex-1 py-3 px-4 font-medium text-sm flex items-center justify-center gap-2 transition-all ${mode === 'export'
                                ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-500'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                    >
                        <Download size={16} />
                        Exportar
                    </button>
                    <button
                        onClick={() => { setMode('import'); setError(null); setSuccess(null); }}
                        className={`flex-1 py-3 px-4 font-medium text-sm flex items-center justify-center gap-2 transition-all ${mode === 'import'
                                ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-500'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                    >
                        <Upload size={16} />
                        Importar
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {mode === 'export' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Nombre del archivo</label>
                                <input
                                    type="text"
                                    value={exportName}
                                    onChange={(e) => { setExportName(e.target.value); setError(null); }}
                                    placeholder="Ej: Servicio_Domingo_28Enero"
                                    className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white border border-gray-600 focus:border-indigo-500 outline-none transition-colors"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Se guardará como: <span className="text-indigo-400">{exportName || 'archivo'}.oasis.json</span>
                                </p>
                            </div>

                            <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400">
                                <p className="font-medium text-gray-300 mb-1">Se exportará:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>{playlist.length} items en la playlist</li>
                                    <li>{customThemes.length} temas personalizados</li>
                                </ul>
                            </div>

                            <button
                                onClick={handleExport}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <Download size={18} />
                                Descargar Archivo
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,.oasis.json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {!importData ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-gray-600 hover:border-indigo-500 rounded-xl p-8 text-center transition-all hover:bg-gray-800/50"
                                >
                                    <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                                    <p className="text-gray-400 font-medium">Seleccionar archivo .oasis.json</p>
                                    <p className="text-xs text-gray-500 mt-1">Click para elegir archivo</p>
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                                <FileJson size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{importData.name}</p>
                                                <p className="text-xs text-gray-500">{formatDate(importData.exportedAt)}</p>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-400 space-y-1">
                                            <p>📋 {importData.playlist.length} items</p>
                                            <p>🎨 {importData.customThemes.length} temas</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Modo de importación</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setImportMode('merge')}
                                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${importMode === 'merge'
                                                        ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                                                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                                    }`}
                                            >
                                                ➕ Agregar a existente
                                            </button>
                                            <button
                                                onClick={() => setImportMode('replace')}
                                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${importMode === 'replace'
                                                        ? 'border-red-500 bg-red-600/20 text-red-400'
                                                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                                    }`}
                                            >
                                                🔄 Reemplazar todo
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setImportData(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleImport}
                                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Check size={18} />
                                            Importar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mt-4 bg-red-600/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mt-4 bg-green-600/20 border border-green-500/50 rounded-lg p-3 flex items-center gap-2 text-green-400 text-sm">
                            <Check size={16} />
                            {success}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportImportModal;
