import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BudgetTracker from './BudgetTracker';
import Checklist from './Checklist';
import Timeline from './Timeline';

type TabKey = 'overview' | 'budget' | 'checklist' | 'timeline';

const EventPlanningTabs = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabKey>('overview');

    const tabs: { key: TabKey; icon: string; label: string }[] = [
        { key: 'overview', icon: 'fa-chart-pie', label: t('events.tabs.overview', 'Overview') },
        { key: 'budget', icon: 'fa-wallet', label: t('events.tabs.budget', 'Budget') },
        { key: 'checklist', icon: 'fa-list-check', label: t('events.tabs.checklist', 'Checklist') },
        { key: 'timeline', icon: 'fa-clock', label: t('events.tabs.timeline', 'Timeline') },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap px-4 ${
                            activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <i className={`fa-solid ${tab.icon} ms-2`}></i>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-fade-in">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4">
                                {t('events.planning.summary_title', 'Planning workspace')}
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {t(
                                    'events.planning.summary_body',
                                    'Use the tabs below to manage the event budget, checklist, and day-of timeline.'
                                )}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-primary to-secondary p-6 rounded-2xl shadow-lg text-white">
                            <h3 className="font-bold text-lg mb-2">
                                {t('events.planning.progress_title', 'Live planning tools')}
                            </h3>
                            <p className="text-sm text-white/85 leading-relaxed">
                                {t(
                                    'events.planning.progress_body',
                                    'As you add tasks, budget items, and activities, this workspace becomes a real event control center instead of a static page.'
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'budget' && <BudgetTracker />}
                {activeTab === 'checklist' && <Checklist />}
                {activeTab === 'timeline' && <Timeline />}
            </div>
        </div>
    );
};

export default EventPlanningTabs;
