import React, { useState } from 'react';
import { Project } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock, Trash2, Edit2, Check, X } from 'lucide-react';

interface CalendarViewProps {
    projects: Project[];
    onOpenProject: (projectId: string) => void;
    onUpdateProjectDate: (projectId: string, date: string | undefined) => void;
    onCreateProjectAtDate: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ projects, onOpenProject, onUpdateProjectDate, onCreateProjectAtDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState<string | null>(null); // project id for date picker

    // Calendar Logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

    const prevMonthDays = new Date(year, month, 0).getDate();

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const changeMonth = (delta: number) => {
        setCurrentDate(new Date(year, month + delta, 1));
        setSelectedDate(null);
    };

    const getProjectsForDate = (day: number) => {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        return projects.filter(p => p.scheduledDate === dateStr);
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    const formatDateString = (day: number) => {
        return new Date(year, month, day).toISOString().split('T')[0];
    };

    const handleDayClick = (day: number) => {
        const dateStr = formatDateString(day);
        setSelectedDate(dateStr);
    };

    const handleCreateEvent = () => {
        if (selectedDate) {
            onCreateProjectAtDate(selectedDate);
        }
    };

    const handleScheduleProject = (projectId: string, date: string) => {
        onUpdateProjectDate(projectId, date);
        setShowDatePicker(null);
    };

    const handleUnscheduleProject = (projectId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateProjectDate(projectId, undefined);
    };

    // Get unscheduled projects for sidebar
    const unscheduledProjects = projects.filter(p => !p.scheduledDate);

    // Get selected date's projects
    const selectedDateProjects = selectedDate
        ? projects.filter(p => p.scheduledDate === selectedDate)
        : [];

    const parseDateLabel = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        const dayNum = date.getDate();
        const monthName = monthNames[date.getMonth()];
        return `${dayNum} de ${monthName}`;
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row bg-gray-950 overflow-hidden">
            {/* Main Calendar */}
            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-3">
                        <Calendar className="text-indigo-500" size={24} />
                        {monthNames[month]} <span className="text-gray-600">{year}</span>
                    </h2>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => {
                                setCurrentDate(new Date());
                                const today = new Date();
                                setSelectedDate(today.toISOString().split('T')[0]);
                            }}
                            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => changeMonth(1)}
                            className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2">
                    {['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'].map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 lg:gap-2 min-h-0">
                    {/* Previous Month Padding */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                        const day = prevMonthDays - firstDayOfMonth + i + 1;
                        return (
                            <div key={`prev-${day}`} className="bg-gray-900/10 border border-gray-800/30 rounded-lg lg:rounded-xl p-1 lg:p-2 opacity-30 select-none pointer-events-none">
                                <span className="text-xs lg:text-sm font-medium text-gray-600">{day}</span>
                            </div>
                        );
                    })}

                    {/* Current Month Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dayProjects = getProjectsForDate(day);
                        const isCurrentDay = isToday(day);
                        const isSelected = selectedDate === formatDateString(day);

                        return (
                            <div
                                key={`day-${day}`}
                                onClick={() => handleDayClick(day)}
                                className={`group relative bg-gray-900 border transition-all hover:bg-gray-800 flex flex-col p-1 lg:p-2 rounded-lg lg:rounded-xl cursor-pointer overflow-hidden 
                                    ${isSelected ? 'border-indigo-500 bg-indigo-900/30 ring-2 ring-indigo-500/50' : ''}
                                    ${isCurrentDay && !isSelected ? 'border-indigo-500/50 bg-indigo-900/10' : ''}
                                    ${!isCurrentDay && !isSelected ? 'border-gray-800 hover:border-gray-700' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-0.5 lg:mb-1">
                                    <span className={`text-xs lg:text-sm font-medium w-5 h-5 lg:w-7 lg:h-7 flex items-center justify-center rounded-full 
                                        ${isCurrentDay ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : ''}
                                        ${isSelected && !isCurrentDay ? 'bg-indigo-500 text-white' : ''}
                                        ${!isCurrentDay && !isSelected ? 'text-gray-400 group-hover:bg-gray-700 group-hover:text-white' : ''}`}>
                                        {day}
                                    </span>
                                    {dayProjects.length > 0 && (
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title={`${dayProjects.length} evento(s)`}></div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-0.5 lg:space-y-1 custom-scrollbar">
                                    {dayProjects.slice(0, 2).map(project => (
                                        <div
                                            key={project.id}
                                            onClick={(e) => { e.stopPropagation(); onOpenProject(project.id); }}
                                            className="p-1 rounded bg-gray-800/80 hover:bg-indigo-600/20 border border-gray-700 hover:border-indigo-500/50 cursor-pointer transition-all group/item"
                                        >
                                            <div className="text-[8px] lg:text-[10px] font-bold text-gray-200 truncate group-hover/item:text-indigo-300">
                                                {project.name}
                                            </div>
                                        </div>
                                    ))}
                                    {dayProjects.length > 2 && (
                                        <div className="text-[8px] text-gray-500 text-center">
                                            +{dayProjects.length - 2} más
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sidebar - Selected Date & Unscheduled */}
            <div className="w-full lg:w-80 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">
                {/* Selected Date Panel */}
                {selectedDate && (
                    <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Clock size={14} className="text-indigo-400" />
                                {parseDateLabel(selectedDate)}
                            </h3>
                            <button
                                onClick={handleCreateEvent}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                                <Plus size={14} />
                                Crear Evento
                            </button>
                        </div>

                        {selectedDateProjects.length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                {selectedDateProjects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => onOpenProject(project.id)}
                                        className="p-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500/50 rounded-lg cursor-pointer transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-200 group-hover:text-indigo-300 truncate flex-1">
                                                {project.name}
                                            </span>
                                            <button
                                                onClick={(e) => handleUnscheduleProject(project.id, e)}
                                                className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                                title="Quitar del calendario"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                        {project.description && (
                                            <p className="text-[10px] text-gray-500 truncate mt-1">{project.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 italic text-center py-2">
                                No hay eventos programados
                            </p>
                        )}
                    </div>
                )}

                {/* Unscheduled Projects */}
                <div className="flex-1 flex flex-col min-h-0 p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Calendar size={12} />
                        Sin Programar ({unscheduledProjects.length})
                    </h3>

                    {unscheduledProjects.length > 0 ? (
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                            {unscheduledProjects.map(project => (
                                <div
                                    key={project.id}
                                    className="p-2 bg-gray-800/50 border border-gray-700 rounded-lg transition-all group"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            onClick={() => onOpenProject(project.id)}
                                            className="text-xs font-bold text-gray-300 hover:text-indigo-300 truncate flex-1 cursor-pointer"
                                        >
                                            {project.name}
                                        </span>
                                        {selectedDate && (
                                            <button
                                                onClick={() => handleScheduleProject(project.id, selectedDate)}
                                                className="p-1 text-gray-500 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors"
                                                title={`Programar para ${parseDateLabel(selectedDate)}`}
                                            >
                                                <Plus size={12} />
                                            </button>
                                        )}
                                    </div>
                                    {project.description && (
                                        <p className="text-[10px] text-gray-500 truncate mt-1">{project.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-xs text-gray-600 italic text-center">
                                Todos los proyectos están programados
                            </p>
                        </div>
                    )}

                    {/* Help Text */}
                    <div className="mt-3 pt-3 border-t border-gray-800">
                        <p className="text-[10px] text-gray-600 italic text-center">
                            💡 Selecciona una fecha y usa <span className="text-indigo-400">+</span> para programar un proyecto
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
