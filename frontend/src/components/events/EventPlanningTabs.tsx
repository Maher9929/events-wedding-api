import { useState } from 'react';
import BudgetTracker from './BudgetTracker';
import Checklist from './Checklist';
import Timeline from './Timeline';

const EventPlanningTabs = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'checklist' | 'timeline'>('overview');

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap px-4 ${activeTab === 'overview' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    <i className="fa-solid fa-chart-pie ms-2"></i>
                    نظرة عامة
                </button>
                <button
                    onClick={() => setActiveTab('budget')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap px-4 ${activeTab === 'budget' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    <i className="fa-solid fa-wallet ms-2"></i>
                    الميزانية
                </button>
                <button
                    onClick={() => setActiveTab('checklist')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap px-4 ${activeTab === 'checklist' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    <i className="fa-solid fa-list-check ms-2"></i>
                    المهام
                </button>
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap px-4 ${activeTab === 'timeline' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    <i className="fa-regular fa-clock ms-2"></i>
                    الجدول الزمني
                </button>
            </div>

            {/* Content Area */}
            <div className="animate-fade-in">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4">تفاصيل الفعالية</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">التاريخ</span>
                                    <span className="font-bold">15 يونيو 2024</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">الموقع</span>
                                    <span className="font-bold">فندق الريتز كارلتون</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">عدد الضيوف</span>
                                    <span className="font-bold">250 شخص</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Card */}
                        <div className="bg-gradient-to-br from-primary to-secondary p-6 rounded-2xl shadow-lg text-white">
                            <h3 className="font-bold text-lg mb-2">حالة التخطيط</h3>
                            <div className="flex items-end gap-2 mb-1">
                                <span className="text-4xl font-bold">65%</span>
                                <span className="text-purple-200 mb-1">مكتمل</span>
                            </div>
                            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-white h-full w-[65%]"></div>
                            </div>
                            <p className="text-sm text-purple-100 mt-4">
                                لديك 3 مهام تستحق هذا الأسبوع.
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
