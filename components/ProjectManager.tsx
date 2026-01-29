import React, { useState } from 'react';
import { FolderOpen, Plus, Trash2, Edit2, Check, X, Calendar, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Project, PresentationItem, Theme } from '../types';

interface ProjectManagerProps {
    projects: Project[];
    currentProjectId: string | null;
    onSelectProject: (projectId: string) => void;
    onCreateProject: (name: string, description?: string) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, newName: string) => void;
    onDuplicateProject: (projectId: string) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
    projects,
    currentProjectId,
    onSelectProject,
    onCreateProject,
    onDeleteProject,
    onRenameProject,
    onDuplicateProject
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const currentProject = projects.find(p => p.id === currentProjectId);

    const handleCreate = () => {
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
            setNewProjectName('');
            setNewProjectDesc('');
            setIsCreating(false);
        }
    };

    const handleRename = (id: string) => {
        if (editingName.trim()) {
            onRenameProject(id, editingName.trim());
            setEditingId(null);
            setEditingName('');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-gray-900 border-b border-gray-800">
            {/* Header - Current Project Selector */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                        <FolderOpen size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-bold text-white">
                            {currentProject?.name || 'Sin Proyecto'}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-2">
                            <Calendar size={10} />
                            {currentProject ? (currentProject.scheduledDate ? formatDate(currentProject.scheduledDate + 'T12:00:00') : formatDate(currentProject.updatedAt)) : 'Selecciona un proyecto'}
                            <span className="text-indigo-400">• {currentProject?.playlist.length || 0} elementos</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                        {projects.length} Proyectos
                    </span>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                </div>
            </button>

            {/* Expanded Projects List */}
            {isExpanded && (
                <div className="border-t border-gray-800 max-h-80 overflow-y-auto">
                    {/* Create New Project */}
                    {isCreating ? (
                        <div className="p-4 bg-gray-800/50 border-b border-gray-700">
                            <input
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Nombre del proyecto (ej: Domingo 19 Enero)"
                                className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm mb-2"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                            <input
                                type="text"
                                value={newProjectDesc}
                                onChange={(e) => setNewProjectDesc(e.target.value)}
                                placeholder="Descripción (opcional)"
                                className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm mb-3"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newProjectName.trim()}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
                                >
                                    <Check size={14} /> Crear Proyecto
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewProjectName('');
                                        setNewProjectDesc('');
                                    }}
                                    className="px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded-lg text-xs font-bold transition-all"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full px-4 py-3 flex items-center gap-3 text-indigo-400 hover:bg-indigo-600/10 transition-colors border-b border-gray-800"
                        >
                            <Plus size={18} />
                            <span className="text-sm font-bold">Crear Nuevo Proyecto</span>
                        </button>
                    )}

                    {/* Projects List */}
                    {projects.length === 0 ? (
                        <div className="p-8 text-center text-gray-600">
                            <FileText size={32} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No hay proyectos todavía</p>
                            <p className="text-xs mt-1">Crea tu primer proyecto para organizar tu trabajo</p>
                        </div>
                    ) : (
                        projects.map(project => (
                            <div
                                key={project.id}
                                className={`border-b border-gray-800 transition-all ${project.id === currentProjectId
                                    ? 'bg-indigo-600/10 border-l-4 border-l-indigo-500'
                                    : 'hover:bg-gray-800/30'
                                    }`}
                            >
                                {editingId === project.id ? (
                                    <div className="p-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="flex-1 bg-gray-900 text-white px-3 py-2 rounded-lg border border-indigo-500 focus:outline-none text-sm"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleRename(project.id)}
                                        />
                                        <button
                                            onClick={() => handleRename(project.id)}
                                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : confirmDeleteId === project.id ? (
                                    <div className="p-3 bg-red-900/20 flex items-center justify-between">
                                        <span className="text-sm text-red-400 font-bold">¿Eliminar "{project.name}"?</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    onDeleteProject(project.id);
                                                    setConfirmDeleteId(null);
                                                }}
                                                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-500"
                                            >
                                                Sí, Eliminar
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-3 py-1.5 bg-gray-700 text-white rounded text-xs font-bold hover:bg-gray-600"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="px-4 py-3 flex items-center justify-between cursor-pointer"
                                        onClick={() => {
                                            onSelectProject(project.id);
                                            setIsExpanded(false);
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${project.id === currentProjectId
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-800 text-gray-400'
                                                }`}>
                                                <FolderOpen size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{project.name}</div>
                                                <div className="text-[10px] text-gray-500 flex items-center gap-2">
                                                    <span>{project.playlist.length} elementos</span>
                                                    <span>•</span>
                                                    <span>{project.scheduledDate ? formatDate(project.scheduledDate + 'T12:00:00') : formatDate(project.updatedAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => {
                                                    setEditingId(project.id);
                                                    setEditingName(project.name);
                                                }}
                                                className="p-2 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-all"
                                                title="Renombrar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => onDuplicateProject(project.id)}
                                                className="p-2 text-gray-500 hover:text-green-400 hover:bg-gray-800 rounded-lg transition-all"
                                                title="Duplicar"
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(project.id)}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectManager;
