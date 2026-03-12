import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { apiService } from '../services/api';
import type { User, Category, Event } from '../services/api';

const AdminDashboard = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [categories, setCategories] = useState<Category[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [totalEvents, setTotalEvents] = useState(0);
    const [bookingStats, setBookingStats] = useState<{ total_bookings: number; total_revenue: number; pending: number; confirmed: number; completed: number; cancelled: number; monthly_revenue?: { month: string; revenue: number }[] }>({ total_bookings: 0, total_revenue: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
    const [eventStats, setEventStats] = useState<{ total: number; by_status: Record<string, number>; by_type: Record<string, number> } | null>(null);
    const [providerStats, setProviderStats] = useState<{ total: number; verified: number; unverified: number; avg_rating: number; total_services?: number; total_users?: number } | null>(null);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setErrorMessage(null);
        Promise.allSettled([
            apiService.get<any>('/users').then((data: any) => {
                const list = Array.isArray(data) ? data : data?.data || [];
                setUsers(list);
                setTotalUsers(data?.total ?? list.length);
            }),
            apiService.get<any>('/categories').then((data: any) => {
                const list = Array.isArray(data) ? data : data?.data || [];
                setCategories(list);
            }),
            apiService.get<any>('/events').then((data: any) => {
                const list = Array.isArray(data) ? data : data?.data || [];
                setEvents(list);
                setTotalEvents(data?.total ?? list.length);
            }),
            apiService.get<any>('/bookings/admin/stats').then((data: any) => {
                setBookingStats(data);
            }),
            apiService.get<any>('/events/stats').then((data: any) => {
                setEventStats(data);
            }),
            apiService.get<any>('/providers/stats').then((data: any) => {
                setProviderStats(data);
            }),
            apiService.get<any>('/bookings').then((data: any) => {
                const list = Array.isArray(data) ? data : data?.data || [];
                setAllBookings(list);
            }),
        ]).then((results) => {
            const rejected = results.filter(r => r.status === 'rejected');
            if (rejected.length > 0) {
                console.error('Some dashboard requests failed:', rejected);
                setErrorMessage('تعذر تحميل بعض البيانات. يرجى التأكد من صلاحياتك.');
            }
        }).finally(() => setLoading(false));
    }, []);

    const providers = users.filter(u => u.role === 'provider');
    const clients = users.filter(u => u.role === 'client');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">لوحة تحكم المنصة</h2>
                <div className="flex gap-2 flex-wrap">
                    {[
                        { to: '/admin/users', icon: 'fa-users', label: 'المستخدمين', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                        { to: '/admin/providers', icon: 'fa-store', label: 'الموردون', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                        { to: '/admin/bookings', icon: 'fa-calendar-check', label: 'الحجوزات', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                        { to: '/admin/events', icon: 'fa-calendar-days', label: 'الفعاليات', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                        { to: '/admin/services', icon: 'fa-box', label: 'الخدمات', color: 'bg-pink-100 text-pink-700 hover:bg-pink-200' },
                        { to: '/admin/reviews', icon: 'fa-star', label: 'التقييمات', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                        { to: '/admin/quotes', icon: 'fa-file-invoice', label: 'عروض الأسعار', color: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
                        { to: '/admin/categories', icon: 'fa-border-all', label: 'الفئات', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                        { to: '/admin/moderation', icon: 'fa-shield-halved', label: 'الإشراف', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                        { to: '/admin/messages', icon: 'fa-comments', label: 'الرسائل', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
                        { to: '/admin/commissions', icon: 'fa-percent', label: 'العمولات', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                        { to: '/admin/audit-logs', icon: 'fa-clipboard-list', label: 'سجل التدقيق', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
                    ].map(item => (
                        <Link key={item.to} to={item.to} className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${item.color}`}>
                            <i className={`fa-solid ${item.icon} ms-1`}></i>{item.label}
                        </Link>
                    ))}
                </div>
            </div>

            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    {errorMessage}
                </div>
            )}

            {loading ? (
                <p className="text-center text-gray-400 py-8">جاري التحميل...</p>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { label: 'إجمالي المستخدمين', value: providerStats?.total_users ?? totalUsers, icon: 'fa-users', color: 'bg-purple-100 text-primary' },
                            { label: 'مقدمو الخدمات', value: providerStats?.total ?? providers.length, icon: 'fa-store', color: 'bg-green-100 text-green-600' },
                            { label: 'العملاء', value: clients.length, icon: 'fa-user-group', color: 'bg-blue-100 text-blue-600' },
                            { label: 'الفعاليات', value: eventStats?.total ?? totalEvents, icon: 'fa-calendar', color: 'bg-amber-100 text-amber-600' },
                            { label: 'الحجوزات', value: bookingStats.total_bookings, icon: 'fa-calendar-check', color: 'bg-pink-100 text-pink-600' },
                            { label: 'الإيرادات', value: `${bookingStats.total_revenue.toLocaleString()} ر.ق`, icon: 'fa-coins', color: 'bg-yellow-100 text-yellow-600' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                                        <i className={`fa-solid ${stat.icon} text-sm`}></i>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Categories */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">الفئات ({categories.length})</h3>
                                <Link to="/admin/categories" className="text-sm font-bold text-primary hover:underline">إدارة</Link>
                            </div>
                            {categories.length === 0 ? (
                                <p className="text-gray-400 text-sm">لا توجد فئات</p>
                            ) : (
                                <div className="space-y-2">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                                            <span className="text-sm font-bold text-gray-700">{cat.name}</span>
                                            <span className="text-xs text-gray-400">{cat.slug}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Users */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">آخر المستخدمين</h3>
                                <Link to="/admin/users" className="text-sm font-bold text-primary hover:underline">عرض الكل</Link>
                            </div>
                            {users.length === 0 ? (
                                <p className="text-gray-400 text-sm">لا يوجد مستخدمون</p>
                            ) : (
                                <div className="space-y-2">
                                    {users.slice(0, 10).map(u => (
                                        <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                                            <div>
                                                <span className="text-sm font-bold text-gray-700">{u.full_name || u.email}</span>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'provider' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {u.role === 'admin' ? 'مدير' : u.role === 'provider' ? 'مزود' : 'عميل'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Registrations Chart — recharts */}
                    {users.length > 0 && (() => {
                        const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                        const now = new Date();
                        const last6 = Array.from({ length: 6 }, (_, i) => {
                            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                            return { month: MONTHS[d.getMonth()].substring(0, 3), m: d.getMonth(), y: d.getFullYear() };
                        });
                        const data = last6.map(({ month, m, y }) => ({
                            month,
                            'مستخدمون': users.filter(u => { const d = new Date(u.created_at); return d.getMonth() === m && d.getFullYear() === y; }).length,
                            'موردون': users.filter(u => u.role === 'provider').filter(u => { const d = new Date(u.created_at); return d.getMonth() === m && d.getFullYear() === y; }).length,
                        }));
                        return (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">التسجيلات الشهرية</h3>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar dataKey="مستخدمون" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="موردون" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        );
                    })()}

                    {/* Monthly Revenue Chart — recharts */}
                    {bookingStats.monthly_revenue && bookingStats.monthly_revenue.length > 0 && (() => {
                        const data = bookingStats.monthly_revenue!.map(d => ({
                            month: d.month.substring(0, 3),
                            'الإيراد': d.revenue,
                        }));
                        return (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">الإيرادات الشهرية</h3>
                                    <span className="text-xs text-gray-400">آخر 6 أشهر</span>
                                </div>
                                <ResponsiveContainer width="100%" height={180}>
                                    <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'} />
                                        <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} ر.ق`, 'الإيراد']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="الإيراد" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        );
                    })()}

                    {/* Events Stats */}
                    {eventStats && eventStats.total > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">توزيع الفعاليات</h3>
                                <Link to="/admin/events" className="text-xs text-primary font-bold hover:underline">عرض الكل</Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries({
                                    planning: { label: 'جاري التخطيط', color: 'bg-blue-100 text-blue-700' },
                                    confirmed: { label: 'مؤكدة', color: 'bg-green-100 text-green-700' },
                                    in_progress: { label: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-700' },
                                    completed: { label: 'مكتملة', color: 'bg-purple-100 text-purple-700' },
                                    cancelled: { label: 'ملغاة', color: 'bg-red-100 text-red-700' },
                                }).map(([key, { label, color }]) => (
                                    <div key={key} className={`rounded-xl p-3 ${color}`}>
                                        <p className="text-lg font-bold">{eventStats.by_status[key] || 0}</p>
                                        <p className="text-xs font-bold mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Provider Stats */}
                    {providerStats && providerStats.total > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">إحصائيات الموردين</h3>
                                <Link to="/admin/providers" className="text-xs text-primary font-bold hover:underline">عرض الكل</Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div className="rounded-xl p-3 bg-purple-100 text-purple-700">
                                    <p className="text-lg font-bold">{providerStats.total}</p>
                                    <p className="text-xs font-bold mt-0.5">إجمالي الموردين</p>
                                </div>
                                <div className="rounded-xl p-3 bg-green-100 text-green-700">
                                    <p className="text-lg font-bold">{providerStats.verified}</p>
                                    <p className="text-xs font-bold mt-0.5">موثقون</p>
                                </div>
                                <div className="rounded-xl p-3 bg-yellow-100 text-yellow-700">
                                    <p className="text-lg font-bold">{providerStats.unverified}</p>
                                    <p className="text-xs font-bold mt-0.5">غير موثقين</p>
                                </div>
                                <div className="rounded-xl p-3 bg-blue-100 text-blue-700">
                                    <p className="text-lg font-bold">{providerStats.avg_rating} ⭐</p>
                                    <p className="text-xs font-bold mt-0.5">متوسط التقييم</p>
                                </div>
                                {providerStats.total_services !== undefined && (
                                    <div className="rounded-xl p-3 bg-pink-100 text-pink-700">
                                        <p className="text-lg font-bold">{providerStats.total_services}</p>
                                        <p className="text-xs font-bold mt-0.5">إجمالي الخدمات</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Booking Breakdown */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">توزيع الحجوزات</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'قيد الانتظار', value: bookingStats.pending, color: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
                                { label: 'مؤكدة', value: bookingStats.confirmed, color: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
                                { label: 'مكتملة', value: bookingStats.completed, color: 'bg-blue-100 text-blue-700', icon: 'fa-flag-checkered' },
                                { label: 'ملغاة', value: bookingStats.cancelled, color: 'bg-red-100 text-red-700', icon: 'fa-times-circle' },
                            ].map((s, i) => (
                                <div key={i} className={`rounded-xl p-4 ${s.color}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <i className={`fa-solid ${s.icon} text-sm`}></i>
                                        <span className="text-xs font-bold">{s.label}</span>
                                    </div>
                                    <p className="text-2xl font-bold">{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Services by Bookings */}
                    {allBookings.length > 0 && (() => {
                        const serviceMap: Record<string, { title: string; count: number; revenue: number }> = {};
                        allBookings.forEach(b => {
                            const sid = b.service_id || b.services?.id;
                            const title = b.services?.title || sid?.substring(0, 8) || 'غير محدد';
                            if (!sid) return;
                            if (!serviceMap[sid]) serviceMap[sid] = { title, count: 0, revenue: 0 };
                            serviceMap[sid].count++;
                            if (b.status === 'completed') serviceMap[sid].revenue += b.amount || 0;
                        });
                        const top5 = Object.values(serviceMap).sort((a, b) => b.count - a.count).slice(0, 5);
                        if (top5.length === 0) return null;
                        return (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">أكثر الخدمات حجزاً</h3>
                                    <Link to="/admin/services" className="text-xs text-primary font-bold hover:underline">عرض الكل</Link>
                                </div>
                                <div className="space-y-3">
                                    {top5.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-purple-100 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                                <span className="text-sm font-bold text-gray-800 truncate max-w-[200px]">{s.title}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs flex-shrink-0">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-bold">{s.count} حجز</span>
                                                {s.revenue > 0 && <span className="text-primary font-bold">{s.revenue.toLocaleString()} ر.ق</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Top Clients by Spending */}
                    {allBookings.length > 0 && (() => {
                        const clientMap: Record<string, { name: string; email: string; count: number; spent: number }> = {};
                        allBookings.forEach(b => {
                            const cid = b.client_id;
                            if (!cid) return;
                            const name = b.users?.full_name || b.users?.email || cid.substring(0, 8);
                            const email = b.users?.email || '';
                            if (!clientMap[cid]) clientMap[cid] = { name, email, count: 0, spent: 0 };
                            clientMap[cid].count++;
                            if (b.status === 'completed') clientMap[cid].spent += b.amount || 0;
                        });
                        const top5 = Object.values(clientMap).sort((a, b) => b.spent - a.spent).slice(0, 5);
                        if (top5.length === 0 || top5[0].spent === 0) return null;
                        return (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">أعلى العملاء إنفاقاً</h3>
                                    <Link to="/admin/users" className="text-xs text-primary font-bold hover:underline">عرض الكل</Link>
                                </div>
                                <div className="space-y-3">
                                    {top5.map((c, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-full gradient-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 truncate max-w-[160px]">{c.name}</p>
                                                    <p className="text-xs text-gray-400">{c.count} حجز</p>
                                                </div>
                                            </div>
                                            <span className="text-primary font-bold text-sm flex-shrink-0">{c.spent.toLocaleString()} ر.ق</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Top Categories */}
                    {categories.length > 0 && allBookings.length > 0 && (() => {
                        const catMap: Record<string, { name: string; count: number }> = {};
                        allBookings.forEach(b => {
                            const catId = b.services?.category_id;
                            if (!catId) return;
                            const cat = categories.find((c: any) => c.id === catId);
                            const name = cat?.name || catId.substring(0, 8);
                            if (!catMap[catId]) catMap[catId] = { name, count: 0 };
                            catMap[catId].count++;
                        });
                        const top5 = Object.values(catMap).sort((a, b) => b.count - a.count).slice(0, 5);
                        if (top5.length === 0) return null;
                        const maxCount = top5[0].count;
                        return (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">أكثر الفئات طلباً</h3>
                                    <Link to="/admin/categories" className="text-xs text-primary font-bold hover:underline">عرض الكل</Link>
                                </div>
                                <div className="space-y-3">
                                    {top5.map((c, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-bold text-gray-800">{c.name}</span>
                                                    <span className="text-xs text-gray-500 font-bold">{c.count} حجز</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="h-full gradient-purple rounded-full transition-all" style={{ width: `${(c.count / maxCount) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Top Providers by Revenue */}
                    {allBookings.length > 0 && (() => {
                        const provMap: Record<string, { name: string; count: number; revenue: number }> = {};
                        allBookings.forEach(b => {
                            const pid = b.provider_id;
                            if (!pid) return;
                            const name = b.providers?.company_name || pid.substring(0, 8);
                            if (!provMap[pid]) provMap[pid] = { name, count: 0, revenue: 0 };
                            provMap[pid].count++;
                            if (b.status === 'completed') provMap[pid].revenue += b.amount || 0;
                        });
                        const top5 = Object.values(provMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
                        if (top5.length === 0 || top5[0].revenue === 0) return null;
                        return (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">أعلى الموردين إيراداً</h3>
                                    <Link to="/admin/providers" className="text-xs text-primary font-bold hover:underline">عرض الكل</Link>
                                </div>
                                <div className="space-y-3">
                                    {top5.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 truncate max-w-[160px]">{p.name}</p>
                                                    <p className="text-xs text-gray-400">{p.count} حجز</p>
                                                </div>
                                            </div>
                                            <span className="text-green-600 font-bold text-sm flex-shrink-0">{p.revenue.toLocaleString()} ر.ق</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Recent Registered Users */}
                    {users.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">آخر المسجلين</h3>
                                <Link to="/admin/users" className="text-xs text-primary font-bold hover:underline">عرض الكل</Link>
                            </div>
                            <div className="space-y-3">
                                {[...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(u => (
                                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {(u.full_name || u.email).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{u.full_name || 'غير محدد'}</p>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-700' :
                                                u.role === 'provider' ? 'bg-green-100 text-green-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                {u.role === 'admin' ? 'مدير' : u.role === 'provider' ? 'مزود' : 'عميل'}
                                            </span>
                                            <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('ar-EG')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Events */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">آخر الفعاليات</h3>
                            <span className="text-xs text-gray-400">{eventStats?.total ?? totalEvents} فعالية</span>
                        </div>
                        {events.length === 0 ? (
                            <p className="text-gray-400 text-sm">لا توجد فعاليات</p>
                        ) : (
                            <div className="space-y-3">
                                {events.slice(0, 10).map(ev => (
                                    <div key={ev.id} className="flex items-center justify-between py-3 border-b border-gray-50">
                                        <div>
                                            <span className="text-sm font-bold text-gray-700">{ev.title}</span>
                                            <p className="text-xs text-gray-400">{ev.event_type} - {new Date(ev.event_date).toLocaleDateString('ar-EG')}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${ev.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                            ev.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                                ev.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    ev.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {ev.status === 'planning' ? 'تخطيط' :
                                                ev.status === 'confirmed' ? 'مؤكد' :
                                                    ev.status === 'in_progress' ? 'قيد التنفيذ' :
                                                        ev.status === 'completed' ? 'مكتمل' :
                                                            ev.status === 'cancelled' ? 'ملغي' : ev.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboard;
