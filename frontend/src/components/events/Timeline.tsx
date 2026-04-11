import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsService } from '../../services/events.service';
import type { EventTimelineItem } from '../../types/events';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { toastService } from '../../services/toast.service';

const Timeline = () => {
    const { id: eventId } = useParams();
    const { t } = useTranslation();
    const [items, setItems] = useState<EventTimelineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState({ time: '', activity: '', description: '' });
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    const loadTimeline = useCallback(async () => {
        try {
            const data = await eventsService.getTimeline(eventId!);
            setItems(data);
        } catch {
            toastService.error(t('events.timeline.errors.load', 'Failed to load timeline'));
        } finally {
            setLoading(false);
        }
    }, [eventId, t]);

    useEffect(() => {
        if (eventId) {
            void loadTimeline();
        }
    }, [eventId, loadTimeline]);

    const handleAdd = async () => {
        if (!eventId || !newItem.activity.trim() || !newItem.time) return;

        try {
            const payload = {
                start_time: newItem.time || new Date().toTimeString().slice(0, 5),
                activity: newItem.activity.trim(),
                description: newItem.description?.trim() || '',
                order_index: items.length,
            };
            const added = await eventsService.addTimelineItem(eventId, payload);
            if (added) {
                const nextItems = [...items, added]
                    .filter((item): item is EventTimelineItem => item !== undefined)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));
                setItems(nextItems);
            }
            setShowAdd(false);
            setNewItem({ time: '', activity: '', description: '' });
        } catch {
            toastService.error(t('events.timeline.errors.add', 'Failed to add activity'));
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: t('events.timeline.delete_title', 'Remove activity'),
            message: t('events.timeline.delete_message', 'Are you sure you want to remove this activity?'),
        });
        if (!ok) return;

        try {
            await eventsService.removeTimelineItem(id);
            setItems((prev) => prev.filter((item) => item.id !== id));
        } catch {
            toastService.error(t('events.timeline.errors.delete', 'Failed to delete activity'));
        }
    };

    if (loading) return <div className="p-10 text-center">{t('common.loading', 'Loading...')}</div>;

    return (
        <div className="glass-effect rounded-3xl shadow-premium overflow-hidden relative animate-fade-in-up">
            <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">{t('events.timeline.title', 'Timeline')}</h3>
                <button onClick={() => setShowAdd(!showAdd)} className="btn-primary py-2 px-4 shadow-lg shadow-purple-200">
                    <i className="fa-solid fa-plus ms-2"></i>
                    {t('events.timeline.new_activity', 'New activity')}
                </button>
            </div>

            {showAdd && (
                <div className="p-4 bg-purple-50 border-b border-purple-100 flex flex-wrap gap-2 animate-fade-in">
                    <input type="time" className="input-field bg-white w-32" value={newItem.time} onChange={(e) => setNewItem({ ...newItem, time: e.target.value })} />
                    <input type="text" placeholder={t('events.timeline.activity_placeholder', 'Activity')} className="flex-1 input-field bg-white min-w-[200px]" value={newItem.activity} onChange={(e) => setNewItem({ ...newItem, activity: e.target.value })} />
                    <input type="text" placeholder={t('events.timeline.description_placeholder', 'Optional description')} className="flex-1 input-field bg-white min-w-[200px]" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
                    <button onClick={handleAdd} className="btn-primary px-6">{t('common.add', 'Add')}</button>
                </div>
            )}

            <div className="p-6 relative">
                <div className="absolute top-6 bottom-6 right-[108px] w-0.5 bg-gray-100"></div>

                <div className="space-y-6">
                    {items.map((item, idx) => (
                        <div key={item.id} className="flex relative group animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="w-24 ps-4 text-left pt-1">
                                <span className="font-bold text-primary font-mono text-lg">{item.start_time}</span>
                            </div>
                            <div className="relative pt-2">
                                <div className="w-3 h-3 bg-white border-2 border-primary rounded-full relative z-10"></div>
                            </div>
                            <div className="me-8 flex-1 glass-effect rounded-2xl p-4 shadow-sm card-hover border border-white/40 hover:border-primary/50 transition-all relative">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{item.activity}</h4>
                                        {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                                    </div>
                                    <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 absolute top-4 left-4">
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="text-center text-gray-400 py-8">
                            <i className="fa-regular fa-clock text-4xl mb-3 opacity-20"></i>
                            <p>{t('events.timeline.empty', 'No timeline items yet.')}</p>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialogComponent />
        </div>
    );
};

export default Timeline;
