import React, { useState, useRef } from 'react';
import { PresentationItem, Theme, Project } from '../types';
import { Download, Upload, X, FileJson, Check, AlertCircle, FolderOpen, Music, Palette, Settings2 } from 'lucide-react';

interface ExportImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    playlist: PresentationItem[];
    customThemes: Theme[];
    projects?: Project[];
    currentProjectId?: string | null;
    onImport: (items: PresentationItem[], themes: Theme[], mode: 'replace' | 'merge', projects?: Project[]) => void;
}

interface OasisExportData {
    version: string;
    exportedAt: string;
    name: string;
    playlist?: PresentationItem[];
    customThemes?: Theme[];
    projects?: Project[];
    exportedItems?: {
        playlist: boolean;
        themes: boolean;
        projects: boolean;
    };
}

interface ExportOptions {
    playlist: boolean;
    themes: boolean;
    projects: boolean;
}

interface ImportOptions {
    playlist: boolean;
    themes: boolean;
    projects: boolean;
}

const ExportImportModal: React.FC<ExportImportModalProps> = ({
    isOpen,
    onClose,
    playlist,
    customThemes,
    projects = [],
    currentProjectId,
    onImport
}) => {
    const [mode, setMode] = useState<'export' | 'import'>('export');
    const [exportName, setExportName] = useState('');
    const [importData, setImportData] = useState<OasisExportData | null>(null);
    const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Export options state
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        playlist: true,
        themes: true,
        projects: false
    });

    // Import options state
    const [importOptions, setImportOptions] = useState<ImportOptions>({
        playlist: true,
        themes: true,
        projects: true
    });

    // Selected project for export (when there are multiple playlists)
    const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId || '');

    // Selected items from playlist (for individual item export)
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set(playlist.map(item => item.id)));

    // Selected items for import
    const [selectedImportItemIds, setSelectedImportItemIds] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const handleExport = () => {
        if (!exportName.trim()) {
            setError('Por favor ingresa un nombre para el archivo');
            return;
        }

        // Check at least one option is selected
        if (!exportOptions.playlist && !exportOptions.themes && !exportOptions.projects) {
            setError('Selecciona al menos un tipo de dato para exportar');
            return;
        }

        // Get the playlist to export (from selected project if playlist export is enabled)
        let playlistToExport = playlist;
        if (exportOptions.playlist && projects.length > 0 && selectedProjectId) {
            const selectedProject = projects.find(p => p.id === selectedProjectId);
            if (selectedProject) {
                playlistToExport = selectedProject.playlist;
            }
        }

        // Filter only selected items
        if (exportOptions.playlist && selectedItemIds.size > 0) {
            playlistToExport = playlistToExport.filter(item => selectedItemIds.has(item.id));
        }

        // Validation: check if at least one item is selected when exporting playlist
        if (exportOptions.playlist && playlistToExport.length === 0) {
            setError('Selecciona al menos un item de la playlist para exportar');
            return;
        }

        const data: OasisExportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            name: exportName.trim(),
            exportedItems: {
                playlist: exportOptions.playlist,
                themes: exportOptions.themes,
                projects: exportOptions.projects
            }
        };

        // Only include selected data
        if (exportOptions.playlist) {
            data.playlist = playlistToExport;
        }
        if (exportOptions.themes) {
            data.customThemes = customThemes;
        }
        if (exportOptions.projects) {
            data.projects = projects;
        }

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

                // Validate structure - at least one data type should be present
                const hasPlaylist = jsonData.playlist && Array.isArray(jsonData.playlist);
                const hasThemes = jsonData.customThemes && Array.isArray(jsonData.customThemes);
                const hasProjects = jsonData.projects && Array.isArray(jsonData.projects);

                if (!hasPlaylist && !hasThemes && !hasProjects) {
                    throw new Error('Archivo inválido: no contiene datos reconocibles');
                }

                setImportData({
                    version: jsonData.version || '1.0',
                    exportedAt: jsonData.exportedAt || 'Desconocido',
                    name: jsonData.name || file.name.replace('.oasis.json', ''),
                    playlist: jsonData.playlist || [],
                    customThemes: jsonData.customThemes || [],
                    projects: jsonData.projects || [],
                    exportedItems: jsonData.exportedItems || {
                        playlist: hasPlaylist,
                        themes: hasThemes,
                        projects: hasProjects
                    }
                });

                // Auto-select import options based on available data
                setImportOptions({
                    playlist: hasPlaylist,
                    themes: hasThemes,
                    projects: hasProjects
                });

                // Initialize all items as selected for import
                if (jsonData.playlist && Array.isArray(jsonData.playlist)) {
                    setSelectedImportItemIds(new Set(jsonData.playlist.map((item: PresentationItem) => item.id)));
                }
            } catch (err) {
                setError('Error al leer el archivo. Asegúrate de que sea un archivo .oasis.json válido.');
            }
        };
        reader.readAsText(file);
    };

    const handleImport = () => {
        if (!importData) return;

        // Check at least one option is selected
        if (!importOptions.playlist && !importOptions.themes && !importOptions.projects) {
            setError('Selecciona al menos un tipo de dato para importar');
            return;
        }

        let itemsToImport = importOptions.playlist ? (importData.playlist || []) : [];

        // Filter only selected items for import
        if (importOptions.playlist && selectedImportItemIds.size > 0) {
            itemsToImport = itemsToImport.filter(item => selectedImportItemIds.has(item.id));
        }

        // Validation: check if at least one item is selected when importing playlist
        if (importOptions.playlist && itemsToImport.length === 0 && (importData.playlist?.length || 0) > 0) {
            setError('Selecciona al menos un item de la playlist para importar');
            return;
        }

        const themesToImport = importOptions.themes ? (importData.customThemes || []) : [];
        const projectsToImport = importOptions.projects ? (importData.projects || []) : undefined;

        onImport(itemsToImport, themesToImport, importMode, projectsToImport);

        const parts = [];
        if (importOptions.playlist && itemsToImport.length) parts.push(`${itemsToImport.length} items`);
        if (importOptions.themes && importData.customThemes?.length) parts.push(`${importData.customThemes.length} temas`);
        if (importOptions.projects && importData.projects?.length) parts.push(`${importData.projects.length} proyectos`);

        setSuccess(`Importado exitosamente: ${parts.join(', ')}`);
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

    const toggleExportOption = (key: keyof ExportOptions) => {
        setExportOptions(prev => ({ ...prev, [key]: !prev[key] }));
        setError(null);
    };

    const toggleImportOption = (key: keyof ImportOptions) => {
        setImportOptions(prev => ({ ...prev, [key]: !prev[key] }));
        setError(null);
    };

    const toggleItemSelection = (itemId: string) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const toggleAllItems = () => {
        const currentPlaylist = projects.length > 0 && selectedProjectId
            ? projects.find(p => p.id === selectedProjectId)?.playlist || playlist
            : playlist;

        if (selectedItemIds.size === currentPlaylist.length) {
            setSelectedItemIds(new Set());
        } else {
            setSelectedItemIds(new Set(currentPlaylist.map(item => item.id)));
        }
    };

    // Update selected items when project changes
    const handleProjectChange = (projectId: string) => {
        setSelectedProjectId(projectId);
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setSelectedItemIds(new Set(project.playlist.map(item => item.id)));
        }
    };

    // Import item selection functions
    const toggleImportItemSelection = (itemId: string) => {
        setSelectedImportItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const toggleAllImportItems = () => {
        if (!importData || !importData.playlist) return;

        if (selectedImportItemIds.size === importData.playlist.length) {
            setSelectedImportItemIds(new Set());
        } else {
            setSelectedImportItemIds(new Set(importData.playlist.map(item => item.id)));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <FileJson size={20} />
                        Importar / Exportar Datos
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

                            {/* Export Options */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                                    <Settings2 size={14} />
                                    Selecciona qué exportar
                                </label>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => toggleExportOption('playlist')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${exportOptions.playlist
                                            ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${exportOptions.playlist ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'
                                            }`}>
                                            {exportOptions.playlist && <Check size={12} className="text-white" />}
                                        </div>
                                        <Music size={16} />
                                        <span className="flex-1 text-left text-sm font-medium">Playlist</span>
                                        <span className="text-xs text-gray-500">
                                            {selectedItemIds.size} / {selectedProjectId && projects.length > 0
                                                ? projects.find(p => p.id === selectedProjectId)?.playlist.length || 0
                                                : playlist.length} items
                                        </span>
                                    </button>

                                    {/* Playlist Selector - only show if export playlist is enabled and there are multiple projects */}
                                    {exportOptions.playlist && projects.length > 1 && (
                                        <div className="ml-8 p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-2">Selecciona el proyecto:</label>
                                                <select
                                                    value={selectedProjectId}
                                                    onChange={(e) => handleProjectChange(e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                                                >
                                                    {projects.map(project => (
                                                        <option key={project.id} value={project.id}>
                                                            {project.name} ({project.playlist.length} items)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Individual Item Selector - show when playlist export is enabled */}
                                    {exportOptions.playlist && (
                                        <div className="ml-8 p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs text-gray-400">Selecciona los items a exportar:</label>
                                                <button
                                                    onClick={toggleAllItems}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                                >
                                                    {selectedItemIds.size === (projects.length > 0 && selectedProjectId
                                                        ? projects.find(p => p.id === selectedProjectId)?.playlist.length || 0
                                                        : playlist.length)
                                                        ? 'Deseleccionar todos'
                                                        : 'Seleccionar todos'}
                                                </button>
                                            </div>
                                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                                {(projects.length > 0 && selectedProjectId
                                                    ? projects.find(p => p.id === selectedProjectId)?.playlist || []
                                                    : playlist
                                                ).map((item, index) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => toggleItemSelection(item.id)}
                                                        className={`w-full flex items-center gap-2 p-2 rounded border text-left transition-all ${selectedItemIds.has(item.id)
                                                            ? 'border-indigo-500/50 bg-indigo-600/10 text-indigo-200'
                                                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                                            }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedItemIds.has(item.id)
                                                            ? 'bg-indigo-600 border-indigo-600'
                                                            : 'border-gray-600'
                                                            }`}>
                                                            {selectedItemIds.has(item.id) && <Check size={10} className="text-white" />}
                                                        </div>
                                                        <span className="text-xs truncate flex-1">
                                                            {index + 1}. {item.title}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                {selectedItemIds.size} de {projects.length > 0 && selectedProjectId
                                                    ? projects.find(p => p.id === selectedProjectId)?.playlist.length || 0
                                                    : playlist.length} items seleccionados
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => toggleExportOption('themes')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${exportOptions.themes
                                            ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${exportOptions.themes ? 'bg-purple-600 border-purple-600' : 'border-gray-600'
                                            }`}>
                                            {exportOptions.themes && <Check size={12} className="text-white" />}
                                        </div>
                                        <Palette size={16} />
                                        <span className="flex-1 text-left text-sm font-medium">Temas personalizados</span>
                                        <span className="text-xs text-gray-500">{customThemes.length} temas</span>
                                    </button>

                                    <button
                                        onClick={() => toggleExportOption('projects')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${exportOptions.projects
                                            ? 'border-green-500 bg-green-600/20 text-green-300'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${exportOptions.projects ? 'bg-green-600 border-green-600' : 'border-gray-600'
                                            }`}>
                                            {exportOptions.projects && <Check size={12} className="text-white" />}
                                        </div>
                                        <FolderOpen size={16} />
                                        <span className="flex-1 text-left text-sm font-medium">Todos los proyectos</span>
                                        <span className="text-xs text-gray-500">{projects.length} proyectos</span>
                                    </button>
                                </div>
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
                                    </div>

                                    {/* Import Options */}
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                                            <Settings2 size={14} />
                                            Selecciona qué importar
                                        </label>
                                        <div className="space-y-2">
                                            {(importData.playlist?.length || 0) > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => toggleImportOption('playlist')}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${importOptions.playlist
                                                            ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                                                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${importOptions.playlist ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'
                                                            }`}>
                                                            {importOptions.playlist && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <Music size={16} />
                                                        <span className="flex-1 text-left text-sm font-medium">Playlist</span>
                                                        <span className="text-xs text-gray-500">
                                                            {selectedImportItemIds.size} / {importData.playlist?.length || 0} items
                                                        </span>
                                                    </button>

                                                    {/* Individual Item Selector for Import */}
                                                    {importOptions.playlist && (
                                                        <div className="ml-8 p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <label className="text-xs text-gray-400">Selecciona los items a importar:</label>
                                                                <button
                                                                    onClick={toggleAllImportItems}
                                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                                                >
                                                                    {selectedImportItemIds.size === (importData.playlist?.length || 0)
                                                                        ? 'Deseleccionar todos'
                                                                        : 'Seleccionar todos'}
                                                                </button>
                                                            </div>
                                                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                                                {(importData.playlist || []).map((item, index) => (
                                                                    <button
                                                                        key={item.id}
                                                                        onClick={() => toggleImportItemSelection(item.id)}
                                                                        className={`w-full flex items-center gap-2 p-2 rounded border text-left transition-all ${selectedImportItemIds.has(item.id)
                                                                            ? 'border-indigo-500/50 bg-indigo-600/10 text-indigo-200'
                                                                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                                                            }`}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedImportItemIds.has(item.id)
                                                                            ? 'bg-indigo-600 border-indigo-600'
                                                                            : 'border-gray-600'
                                                                            }`}>
                                                                            {selectedImportItemIds.has(item.id) && <Check size={10} className="text-white" />}
                                                                        </div>
                                                                        <span className="text-xs truncate flex-1">
                                                                            {index + 1}. {item.title}
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-2">
                                                                {selectedImportItemIds.size} de {importData.playlist?.length || 0} items seleccionados
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {(importData.customThemes?.length || 0) > 0 && (
                                                <button
                                                    onClick={() => toggleImportOption('themes')}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${importOptions.themes
                                                        ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                                                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${importOptions.themes ? 'bg-purple-600 border-purple-600' : 'border-gray-600'
                                                        }`}>
                                                        {importOptions.themes && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <Palette size={16} />
                                                    <span className="flex-1 text-left text-sm font-medium">Temas</span>
                                                    <span className="text-xs text-gray-500">{importData.customThemes?.length || 0} temas</span>
                                                </button>
                                            )}

                                            {(importData.projects?.length || 0) > 0 && (
                                                <button
                                                    onClick={() => toggleImportOption('projects')}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${importOptions.projects
                                                        ? 'border-green-500 bg-green-600/20 text-green-300'
                                                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${importOptions.projects ? 'bg-green-600 border-green-600' : 'border-gray-600'
                                                        }`}>
                                                        {importOptions.projects && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <FolderOpen size={16} />
                                                    <span className="flex-1 text-left text-sm font-medium">Proyectos</span>
                                                    <span className="text-xs text-gray-500">{importData.projects?.length || 0} proyectos</span>
                                                </button>
                                            )}

                                            {(importData.playlist?.length || 0) === 0 &&
                                                (importData.customThemes?.length || 0) === 0 &&
                                                (importData.projects?.length || 0) === 0 && (
                                                    <p className="text-center text-gray-500 text-sm py-4">
                                                        No hay datos disponibles para importar
                                                    </p>
                                                )}
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
