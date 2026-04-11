import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t, i18n } = useTranslation();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 });
    const [budgetStats, setBudgetStats] = useState({ estimated: 0, actual: 0 });

    const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
    const currencyLabel = t('common.currency', 'QAR');

    useEffect(() => {
        if (!eventId) return;

        apiService.get<Event>(`/events/id/${eventId}`)
            .then((data) => setEvent((data as { data?: Event })?.data || data))
            .catch(() => toastService.error(t('events.details.errors.load', 'Failed to load event details')))
            .finally(() => setLoading(false));

        eventsService.getTasks(eventId)
            .then((tasks) => {
                setTaskStats({
                    total: tasks.length,
                    completed: tasks.filter((task) => task.status === 'completed').length,
                });
            })
            .catch(() => undefined);

        eventsService.getBudget(eventId)
            .then((items) => {
                const estimated = items.reduce((sum, item) => sum + item.estimated_cost, 0);
                const actual = items.reduce((sum, item) => sum + item.actual_cost, 0);
                setBudgetStats({ estimated, actual });
            })
            .catch(() => undefined);
    }, [eventId, t]);

    if (loading) {
        return <div className="p-10 text-center text-gray-400">{t('common.loading', 'Loading...')}</div>;
    }

    if (!event) {
        return (
            <div className="p-10 text-center">
                <p className="text-gray-500 mb-4">{t('events.details.not_found', 'Event not found')}</p>
                <button onClick={() => navigate('/client/dashboard')} className="px-4 py-2 bg-primary text-white rounded-xl">
                    {t('common.back', 'Back')}
                </button>
            </div>
        );
    }

    const statusMap: Record<string, { label: string; cls: string }> = {
        planning: { label: t('events.status.planning', 'Planning'), cls: 'bg-blue-100 text-blue-700' },
        confirmed: { label: t('events.status.confirmed', 'Confirmed'), cls: 'bg-green-100 text-green-700' },
        in_progress: { label: t('events.status.in_progress', 'In progress'), cls: 'bg-yellow-100 text-yellow-700' },
        completed: { label: t('events.status.completed', 'Completed'), cls: 'bg-purple-100 text-purple-700' },
        cancelled: { label: t('events.status.cancelled', 'Cancelled'), cls: 'bg-red-100 text-red-700' },
    };

    const eventTypeMap: Record<string, string> = {
        wedding: t('events.types.wedding', 'Wedding'),
        birthday: t('events.types.birthday', 'Birthday'),
        party: t('events.types.party', 'Party / Engagement'),
        corporate: t('events.types.corporate', 'Corporate'),
        conference: t('events.types.conference', 'Conference'),
        other: t('events.types.other', 'Other'),
    };

    const st = statusMap[event.status] || { label: event.status, cls: 'bg-gray-100 text-gray-700' };
    const taskProgress = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
    const budgetProgress = budgetStats.estimated > 0 ? Math.min(100, Math.round((budgetStats.actual / budgetStats.estimated) * 100)) : 0;

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'overview', label: t('events.tabs.overview', 'Overview'), icon: 'fa-chart-pie' },
        { key: 'budget', label: t('events.tabs.budget', 'Budget'), icon: 'fa-wallet' },
        { key: 'checklist', label: t('events.tabs.checklist', 'Checklist'), icon: 'fa-list-check' },
        { key: 'timeline', label: t('events.tabs.timeline', 'Timeline'), icon: 'fa-clock' },
        { key: 'guests', label: t('events.tabs.guests', 'Guests'), icon: 'fa-users' },
    ];

    const quickActions: { tab?: Tab; icon: string; label: string; color: string; path?: string }[] = [
        { tab: 'budget', icon: 'fa-wallet', label: t('events.tabs.budget', 'Budget'), color: 'bg-blue-50 text-blue-600' },
        { tab: 'checklist', icon: 'fa-list-check', label: t('events.tabs.checklist', 'Checklist'), color: 'bg-green-50 text-green-600' },
        { tab: 'timeline', icon: 'fa-clock', label: t('events.tabs.timeline', 'Timeline'), color: 'bg-purple-50 text-purple-600' },
        { tab: 'guests', icon: 'fa-users', label: t('events.tabs.guests', 'Guests'), color: 'bg-pink-50 text-pink-600' },
        { path: '/services', icon: 'fa-store', label: t('common.services', 'Services'), color: 'bg-amber-50 text-amber-600' },
    ];

    const formattedEventDate = new Date(event.event_date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="space-y-5 px-5 py-6">
            <div>
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-primary mb-3 flex items-center gap-2 transition-colors text-sm">
                    <i className="fa-solid fa-arrow-right"></i> {t('common.back', 'Back')}
                </button>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-lg font-bold ${st.cls}`}>{st.label}</span>
                            <span className="text-xs text-gray-500">{eventTypeMap[event.event_type] || event.event_type}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{formattedEventDate}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 glass-effect p-1.5 rounded-2xl shadow-premium border border-white/50 overflow-x-auto mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap px-3 flex items-center justify-center gap-1.5 ${
                            activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <i className={`fa-solid ${tab.icon}`}></i>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-5 animate-fade-in-up">
                    <div className="glass-effect rounded-3xl p-6 shadow-premium">
                        <h3 className="font-bold text-gray-900 mb-4">{t('events.details.info_title', 'Event details')}</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500 text-sm">{t('events.details.type', 'Event type')}</span>
                                <span className="font-bold text-sm">{eventTypeMap[event.event_type] || event.event_type}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500 text-sm">{t('events.details.date', 'Date')}</span>
                                <span className="font-bold text-sm">{formattedEventDate}</span>
                            </div>
                            {event.venue_city && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">{t('events.details.city', 'City')}</span>
                                    <span className="font-bold text-sm">{event.venue_city}</span>
                                </div>
                            )}
                            {event.venue_name && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">{t('events.details.venue', 'Venue')}</span>
                                    <span className="font-bold text-sm">{event.venue_name}</span>
                                </div>
                            )}
                            {event.guest_count ? (
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">{t('events.details.guest_count', 'Guests')}</span>
                                    <span className="font-bold text-sm">{t('events.details.guest_count_value', '{{count}} guests', { count: event.guest_count })}</span>
                                </div>
                            ) : null}
                            {event.budget ? (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-500 text-sm">{t('events.details.estimated_budget', 'Estimated budget')}</span>
                                    <span className="font-bold text-sm text-primary">{Number(event.budget).toLocaleString(locale)} {currencyLabel}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-effect rounded-3xl p-5 shadow-premium card-hover">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                    <i className="fa-solid fa-list-check text-green-600 text-sm"></i>
                                </div>
                                <span className="text-xs font-bold text-gray-600">{t('events.tabs.checklist', 'Checklist')}</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{taskProgress}%</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {t('events.details.tasks_progress', '{{completed}} / {{total}} completed', { completed: taskStats.completed, total: taskStats.total })}
                            </p>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${taskProgress}%` }}></div>
                            </div>
                        </div>

                        <div className="glass-effect rounded-3xl p-5 shadow-premium card-hover">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <i className="fa-solid fa-wallet text-blue-600 text-sm"></i>
                                </div>
                                <span className="text-xs font-bold text-gray-600">{t('events.tabs.budget', 'Budget')}</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{budgetProgress}%</p>
                            <p className="text-xs text-gray-400 mt-1">{budgetStats.actual.toLocaleString(locale)} / {budgetStats.estimated.toLocaleString(locale)}</p>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${budgetProgress > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${budgetProgress}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {event.description && (
                        <div className="glass-effect rounded-3xl p-6 shadow-premium">
                            <h3 className="font-bold text-gray-900 mb-2">{t('events.details.description', 'Description')}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
                        </div>
                    )}

                    {(() => {
                        const daysLeft = Math.ceil((new Date(event.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysLeft > 0) {
                            return (
                                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white flex items-center justify-between">
                                    <div>
                                        <p className="text-white/80 text-xs mb-1">{t('events.details.time_left', 'Time left')}</p>
                                        <p className="text-3xl font-bold">{daysLeft} <span className="text-lg">{t('events.details.days', 'days')}</span></p>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                        <i className="fa-solid fa-hourglass-half text-white text-2xl"></i>
                                    </div>
                                </div>
                            );
                        }
                        if (daysLeft === 0) {
                            return (
                                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 text-white text-center">
                                    <i className="fa-solid fa-party-horn text-2xl mb-1"></i>
                                    <p className="font-bold">{t('events.details.today', 'The event is today!')}</p>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {quickActions.map((action, index) => (
                            <button
                                key={`${action.label}-${index}`}
                                onClick={() => {
                                    if (action.tab) setActiveTab(action.tab);
                                    if (action.path) navigate(action.path);
                                }}
                                style={{ animationDelay: `${index * 100}ms` }}
                                className="glass-effect shadow-premium rounded-3xl p-4 flex flex-col items-center gap-2 card-hover transition-opacity animate-fade-in-up"
                            >
                                <div className={`w-12 h-12 rounded-2xl ${action.color} flex items-center justify-center`}>
                                    <i className={`fa-solid ${action.icon} text-xl`}></i>
                                </div>
                                <span className="text-xs font-bold text-gray-700">{action.label}</span>
                            </button>
                        ))}
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
