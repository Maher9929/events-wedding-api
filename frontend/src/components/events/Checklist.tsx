import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventsService } from '../../services/events.service';
import type { EventTask } from '../../types/events';

const Checklist = () => {
    const { id: eventId } = useParams();
    const [tasks, setTasks] = useState<EventTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');

    useEffect(() => {
        if (eventId) loadTasks();
    }, [eventId]);

    const loadTasks = async () => {
        try {
            const data = await eventsService.getTasks(eventId!);
            setTasks(data);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async () => {
        if (!eventId || !newTaskTitle) return;
        try {
            const added = await eventsService.addTask(eventId, {
                title: newTaskTitle.trim(),
                description: '',
                due_date: newTaskDate || new Date().toISOString().split('T')[0],
                status: 'pending',
                assigned_to: ''
            });
            setTasks([...tasks, added]);
            setNewTaskTitle('');
            setNewTaskDate('');
            setShowAdd(false);
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    };

    const toggleStatus = async (task: EventTask) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        try {
            await eventsService.updateTaskStatus(task.id, newStatus);
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        } catch (error) {
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete task?')) return;
        try {
            await eventsService.removeTask(id);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (error) {
        }
    }

    if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

    return (
        <div className="glass-effect rounded-3xl shadow-premium overflow-hidden relative animate-fade-in-up">
            <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">قائمة المهام</h3>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="btn-primary py-2 px-4 shadow-lg shadow-purple-200"
                >
                    <i className="fa-solid fa-plus ms-2"></i>
                    مهمة جديدة
                </button>
            </div>

            {showAdd && (
                <div className="p-4 bg-purple-50 border-b border-purple-100 flex gap-2 animate-fade-in">
                    <input
                        type="text"
                        placeholder="ما هي المهمة؟"
                        className="flex-1 input-field bg-white"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                    />
                    <input
                        type="date"
                        className="input-field bg-white w-40"
                        value={newTaskDate}
                        onChange={e => setNewTaskDate(e.target.value)}
                    />
                    <button onClick={handleAddTask} className="btn-primary px-6">إضافة</button>
                </div>
            )}

            <div className="p-6 space-y-3">
                {tasks.map((task, idx) => (
                    <div key={task.id} className="glass-effect flex items-center group p-3 hover:bg-white/40 rounded-2xl transition-all shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                        <button
                            onClick={() => toggleStatus(task)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'completed'
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 text-transparent hover:border-primary'
                                }`}
                        >
                            <i className="fa-solid fa-check text-xs"></i>
                        </button>
                        <div className={`me-4 flex-1 ${task.status === 'completed' ? 'opacity-50 line-through' : ''}`}>
                            <h4 className="font-bold text-gray-900">{task.title}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                <i className="fa-regular fa-clock"></i>
                                {task.due_date ? `يستحق في ${task.due_date}` : 'لا يوجد تاريخ'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className={`text-xs px-2 py-1 rounded font-bold ${task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {task.status === 'in_progress' ? 'قيد التنفيذ' :
                                    task.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
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
                        <p>لا توجد مهام بعد. ابدأ بإضافة مهمة!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Checklist;
