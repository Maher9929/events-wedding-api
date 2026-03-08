import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Event } from '../services/api';
import { eventsService } from '../services/events.service';
import { toastService } from '../services/toast.service';
import BudgetTracker from '../components/events/BudgetTracker';
import Checklist from '../components/events/Checklist';
import Timeline from '../components/events/Timeline';
import GuestList from '../components/events/GuestList';

type Tab = 'overview' | 'budget' | 'checklist' | 'timeline' | 'guests';

const EventDetailsPage = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 });
    const [budgetStats, setBudgetStats] = useState({ estimated: 0, actual: 0 });

    useEffect(() => {
        if (!eventId) return;
        apiService.get<Event>(`/events/${eventId}`)
            .then((data: any) => setEvent(data?.data || data))
            .catch(() => toastService.error('فشل تحميل تفاصيل الفعالية'))
            .finally(() => setLoading(false));

        eventsService.getTasks(eventId).then(tasks => {
            setTaskStats({ total: tasks.length, completed: tasks.filter(t => t.status === 'completed').length });
        }).catch(() => { });

        eventsService.getBudget(eventId).then(items => {
            const estimated = items.reduce((s, i) => s + i.estimated_cost, 0);
            const actual = items.reduce((s, i) => s + i.actual_cost, 0);
            setBudgetStats({ estimated, actual });
        }).catch(() => { });
    }, [eventId]);

    if (loading) return <div className="p-10 text-center text-gray-400">جاري التحميل...</div>;

    if (!event) {
        return (
            <div className="p-10 text-center">
                <p className="text-gray-500 mb-4">الفعالية غير موجودة</p>
                <button onClick={() => navigate('/client/dashboard')} className="px-4 py-2 bg-primary text-white rounded-xl">العودة</button>
            </div>
        );
    }

    const statusMap: Record<string, { label: string; cls: string }> = {
        planning: { label: 'جاري التخطيط', cls: 'bg-blue-100 text-blue-700' },
        confirmed: { label: 'مؤكد', cls: 'bg-green-100 text-green-700' },
        in_progress: { label: 'قيد التنفيذ', cls: 'bg-yellow-100 text-yellow-700' },
        completed: { label: 'مكتمل', cls: 'bg-purple-100 text-purple-700' },
        cancelled: { label: 'ملغي', cls: 'bg-red-100 text-red-700' },
    };

    const eventTypeMap: Record<string, string> = {
        wedding: 'حفل زفاف', birthday: 'عيد ميلاد',
        party: 'حفلة / خطوبة', corporate: 'فعالية شركة', conference: 'مؤتمر', other: 'أخرى',
    };

    const st = statusMap[event.status] || { label: event.status, cls: 'bg-gray-100 text-gray-700' };
    const taskProgress = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
    const budgetProgress = budgetStats.estimated > 0 ? Math.min(100, Math.round((budgetStats.actual / budgetStats.estimated) * 100)) : 0;

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'overview', label: 'نظرة عامة', icon: 'fa-chart-pie' },
        { key: 'budget', label: 'الميزانية', icon: 'fa-wallet' },
        { key: 'checklist', label: 'المهام', icon: 'fa-list-check' },
        { key: 'timeline', label: 'الجدول الزمني', icon: 'fa-clock' },
        { key: 'guests', label: 'الضيوف', icon: 'fa-users' },
    ];

    return (
        <div className="space-y-5 px-5 py-6">
            {/* Back + Header */}
            <div>
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-primary mb-3 flex items-center gap-2 transition-colors text-sm">
                    <i className="fa-solid fa-arrow-right"></i> العودة
                </button>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-lg font-bold ${st.cls}`}>{st.label}</span>
                            <span className="text-xs text-gray-500">{eventTypeMap[event.event_type] || event.event_type}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{new Date(event.event_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 glass-effect p-1.5 rounded-2xl shadow-premium border border-white/50 overflow-x-auto mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap px-3 flex items-center justify-center gap-1.5 ${activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <i className={`fa-solid ${tab.icon}`}></i>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="space-y-5 animate-fade-in-up">
                    {/* Info Card */}
                    <div className="glass-effect rounded-3xl p-6 shadow-premium">
                        <h3 className="font-bold text-gray-900 mb-4">تفاصيل الفعالية</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500 text-sm">نوع الفعالية</span>
                                <span className="font-bold text-sm">{eventTypeMap[event.event_type] || event.event_type}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500 text-sm">التاريخ</span>
                                <span className="font-bold text-sm">{new Date(event.event_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            {(event as any).venue_city && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">المدينة</span>
                                    <span className="font-bold text-sm">{(event as any).venue_city}</span>
                                </div>
                            )}
                            {(event as any).venue_name && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">القاعة</span>
                                    <span className="font-bold text-sm">{(event as any).venue_name}</span>
                                </div>
                            )}
                            {event.guest_count && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">عدد الضيوف</span>
                                    <span className="font-bold text-sm">{event.guest_count} شخص</span>
                                </div>
                            )}
                            {event.budget && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-500 text-sm">الميزانية المقدرة</span>
                                    <span className="font-bold text-sm text-primary">{event.budget.toLocaleString()} ر.ق</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-effect rounded-3xl p-5 shadow-premium card-hover">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                    <i className="fa-solid fa-list-check text-green-600 text-sm"></i>
                                </div>
                                <span className="text-xs font-bold text-gray-600">المهام</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{taskProgress}%</p>
                            <p className="text-xs text-gray-400 mt-1">{taskStats.completed} / {taskStats.total} مكتملة</p>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${taskProgress}%` }}></div>
                            </div>
                        </div>

                        <div className="glass-effect rounded-3xl p-5 shadow-premium card-hover">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <i className="fa-solid fa-wallet text-blue-600 text-sm"></i>
                                </div>
                                <span className="text-xs font-bold text-gray-600">الميزانية</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{budgetProgress}%</p>
                            <p className="text-xs text-gray-400 mt-1">{budgetStats.actual.toLocaleString()} / {budgetStats.estimated.toLocaleString()}</p>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${budgetProgress > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${budgetProgress}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <div className="glass-effect rounded-3xl p-6 shadow-premium">
                            <h3 className="font-bold text-gray-900 mb-2">الوصف</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
                        </div>
                    )}

                    {/* Countdown */}
                    {(() => {
                        const daysLeft = Math.ceil((new Date(event.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysLeft > 0) return (
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white flex items-center justify-between">
                                <div>
                                    <p className="text-white/80 text-xs mb-1">الوقت المتبقي</p>
                                    <p className="text-3xl font-bold">{daysLeft} <span className="text-lg">يوم</span></p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                    <i className="fa-solid fa-hourglass-half text-white text-2xl"></i>
                                </div>
                            </div>
                        );
                        if (daysLeft === 0) return (
                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 text-white text-center">
                                <i className="fa-solid fa-party-horn text-2xl mb-1"></i>
                                <p className="font-bold">الفعالية اليوم!</p>
                            </div>
                        );
                        return null;
                    })()}

                    {/* Quick Actions */}
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { tab: 'budget' as Tab, icon: 'fa-wallet', label: 'الميزانية', color: 'bg-blue-50 text-blue-600' },
                            { tab: 'checklist' as Tab, icon: 'fa-list-check', label: 'المهام', color: 'bg-green-50 text-green-600' },
                            { tab: 'timeline' as Tab, icon: 'fa-clock', label: 'الجدول', color: 'bg-purple-50 text-purple-600' },
                            { tab: 'guests' as Tab, icon: 'fa-users', label: 'الضيوف', color: 'bg-pink-50 text-pink-600' },
                        ].map((a, i) => (
                            <button key={a.tab} onClick={() => setActiveTab(a.tab)} style={{ animationDelay: `${i * 100}ms` }}
                                className={`glass-effect shadow-premium rounded-3xl p-4 flex flex-col items-center gap-2 card-hover transition-opacity animate-fade-in-up`}>
                                <div className={`w-12 h-12 rounded-2xl ${a.color} flex items-center justify-center`}>
                                    <i className={`fa-solid ${a.icon} text-xl`}></i>
                                </div>
                                <span className="text-xs font-bold text-gray-700">{a.label}</span>
                            </button>
                        ))}
                        <button onClick={() => navigate('/services')} style={{ animationDelay: `400ms` }}
                            className="glass-effect shadow-premium rounded-3xl p-4 flex flex-col items-center gap-2 card-hover transition-opacity animate-fade-in-up">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <i className="fa-solid fa-store text-xl"></i>
                            </div>
                            <span className="text-xs font-bold text-gray-700">خدمات</span>
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'budget' && <BudgetTracker event={event} />}
            {activeTab === 'checklist' && <Checklist />}
            {activeTab === 'timeline' && <Timeline />}
            {activeTab === 'guests' && eventId && <GuestList eventId={eventId} />}
        </div>
    );
};

export default EventDetailsPage;
