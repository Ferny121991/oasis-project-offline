import React, { useState } from 'react';
import { Project } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock } from 'lucide-react';

interface CalendarViewProps {
    projects: Project[];
    onOpenProject: (projectId: string) => void;
    onUpdateProjectDate: (projectId: string, date: string | undefined) => void;
    onCreateProjectAtDate: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ projects, onOpenProject, onUpdateProjectDate, onCreateProjectAtDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

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
    };

    const getProjectsForDate = (day: number) => {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        return projects.filter(p => p.scheduledDate === dateStr);
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    const handleDayClick = (day: number) => {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        onCreateProjectAtDate(dateStr);
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-950 p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Calendar className="text-indigo-500" size={28} />
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
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
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
            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 min-h-0">
                {/* Previous Month Padding */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                    const day = prevMonthDays - firstDayOfMonth + i + 1;
                    return (
                        <div key={`prev-${day}`} className="bg-gray-900/10 border border-gray-800/30 rounded-xl p-2 opacity-30 select-none pointer-events-none">
                            <span className="text-sm font-medium text-gray-600">{day}</span>
                        </div>
                    );
                })}

                {/* Current Month Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayProjects = getProjectsForDate(day);
                    const isCurrentDay = isToday(day);

                    return (
                        <div
                            key={`day-${day}`}
                            onClick={() => handleDayClick(day)}
                            className={`group relative bg-gray-900 border transition-all hover:bg-gray-800 flex flex-col p-2 rounded-xl cursor-default overflow-hidden ${isCurrentDay ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-gray-800 hover:border-gray-700'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isCurrentDay ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 group-hover:bg-gray-700 group-hover:text-white'}`}>
                                    {day}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                                    className="hidden group-hover:flex w-6 h-6 items-center justify-center rounded-lg bg-gray-700 text-white hover:bg-indigo-600 transition-colors"
                                    title="Crear evento"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {dayProjects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={(e) => { e.stopPropagation(); onOpenProject(project.id); }}
                                        className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-indigo-600/20 border border-gray-700 hover:border-indigo-500/50 cursor-pointer transition-all group/item"
                                    >
                                        <div className="text-[10px] font-bold text-gray-200 truncate group-hover/item:text-indigo-300">
                                            {project.name}
                                        </div>
                                        {project.description && (
                                            <div className="text-[9px] text-gray-500 truncate mt-0.5">
                                                {project.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
