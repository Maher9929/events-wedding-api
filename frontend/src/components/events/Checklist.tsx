import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsService } from '../../services/events.service';
import type { EventTask } from '../../types/events';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { toastService } from '../../services/toast.service';

const Checklist = () => {
    const { id: eventId } = useParams();
    const { t } = useTranslation();
    const [tasks, setTasks] = useState<EventTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    const loadTasks = useCallback(async () => {
        try {
            const data = await eventsService.getTasks(eventId!);
            setTasks(data);
        } catch {
            toastService.error(t('events.checklist.errors.load', 'Failed to load checklist'));
        } finally {
            setLoading(false);
        }
    }, [eventId, t]);

    useEffect(() => {
        if (eventId) {
            void loadTasks();
        }
    }, [eventId, loadTasks]);

    const handleAddTask = async () => {
        if (!eventId || !newTaskTitle.trim()) return;

        try {
            const added = await eventsService.addTask(eventId, {
                title: newTaskTitle.trim(),
                description: '',
                due_date: newTaskDate || new Date().toISOString().split('T')[0],
                status: 'pending',
                assigned_to: '',
            });
            setTasks((prev) => [...prev, added]);
            setNewTaskTitle('');
            setNewTaskDate('');
            setShowAdd(false);
        } catch {
            toastService.error(t('events.checklist.errors.add', 'Failed to add task'));
        }
    };

    const toggleStatus = async (task: EventTask) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';

        try {
            await eventsService.updateTaskStatus(task.id, newStatus);
            setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: newStatus } : item)));
        } catch {
            toastService.error(t('events.checklist.errors.status', 'Failed to update task status'));
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: t('events.checklist.delete_title', 'Delete task'),
            message: t('events.checklist.delete_message', 'Are you sure you want to delete this task?'),
        });
        if (!ok) return;

        try {
            await eventsService.removeTask(id);
            setTasks((prev) => prev.filter((task) => task.id !== id));
        } catch {
            toastService.error(t('events.checklist.errors.delete', 'Failed to delete task'));
        }
    };

    const statusLabel = (status: EventTask['status']) => {
        if (status === 'in_progress') return t('events.checklist.status.in_progress', 'In progress');
        if (status === 'completed') return t('events.checklist.status.completed', 'Completed');
        return t('events.checklist.status.pending', 'Pending');
    };

    if (loading) return <div className="p-10 text-center">{t('common.loading', 'Loading...')}</div>;

    return (
        <>
            <div className="glass-effect rounded-3xl shadow-premium overflow-hidden relative animate-fade-in-up">
                <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{t('events.checklist.title', 'Checklist')}</h3>
                    <button onClick={() => setShowAdd(!showAdd)} className="btn-primary py-2 px-4 shadow-lg shadow-purple-200">
                        <i className="fa-solid fa-plus ms-2"></i>
                        {t('events.checklist.new_task', 'New task')}
                    </button>
                </div>

                {showAdd && (
                    <div className="p-4 bg-purple-50 border-b border-purple-100 flex gap-2 animate-fade-in">
                        <input type="text" placeholder={t('events.checklist.task_placeholder', 'What needs to be done?')} className="flex-1 input-field bg-white" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                        <input type="date" className="input-field bg-white w-40" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} />
                        <button onClick={handleAddTask} className="btn-primary px-6">{t('common.add', 'Add')}</button>
                    </div>
                )}

                <div className="p-6 space-y-3">
                    {tasks.map((task, idx) => (
                        <div key={task.id} className="glass-effect flex items-center group p-3 hover:bg-white/40 rounded-2xl transition-all shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                            <button
                                onClick={() => toggleStatus(task)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-primary'
                                }`}
                            >
                                <i className="fa-solid fa-check text-xs"></i>
                            </button>
                            <div className={`me-4 flex-1 ${task.status === 'completed' ? 'opacity-50 line-through' : ''}`}>
                                <h4 className="font-bold text-gray-900">{task.title}</h4>
                                <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                    <i className="fa-regular fa-clock"></i>
                                    {task.due_date ? t('events.checklist.due_on', 'Due on {{date}}', { date: task.due_date }) : t('events.checklist.no_date', 'No due date')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className={`text-xs px-2 py-1 rounded font-bold ${
                                    task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {statusLabel(task.status)}
                                </span>
                                <button onClick={() => handleDelete(task.id)} className="w-8 h-8 rounded-full hover:bg-white hover:shadow flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}

                    {tasks.length === 0 && (
                        <div className="text-center text-gray-400 py-8">
                            <i className="fa-solid fa-clipboard-check text-4xl mb-3 opacity-20"></i>
                            <p>{t('events.checklist.empty', 'No tasks yet. Start by adding one.')}</p>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialogComponent />
        </>
    );
};

export default Checklist;
