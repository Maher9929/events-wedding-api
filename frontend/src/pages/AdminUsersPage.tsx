import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { User } from '../services/api';
import { toastService } from '../services/toast.service';

const roleMap: Record<string, { label: string; cls: string; icon: string }> = {
    client:   { label: 'عميل',    cls: 'bg-blue-100 text-blue-700',  icon: 'fa-user' },
    provider: { label: 'مزود خدمة', cls: 'bg-green-100 text-green-700', icon: 'fa-store' },
    admin:    { label: 'مسؤول',    cls: 'bg-red-100 text-red-700',    icon: 'fa-shield' },
};

const AdminUsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data: any = await apiService.get('/users');
            const list = Array.isArray(data) ? data : data?.data || [];
            setUsers(list);
        } catch {
            toastService.error('فشل تحميل المستخدمين');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await apiService.patch(`/users/${userId}`, { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
            toastService.success('تم تحديث الدور بنجاح');
        } catch {
            toastService.error('فشل تحديث الدور');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        try {
            await apiService.delete(`/users/${userId}`);
            setUsers(prev => prev.filter(u => u.id !== userId));
            toastService.success('تم حذف المستخدم');
        } catch {
            toastService.error('فشل حذف المستخدم');
        }
    };

    const filtered = users.filter(u => {
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        const matchSearch = !searchTerm ||
            u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchRole && matchSearch;
    });

    const stats = {
        total: users.length,
        clients: users.filter(u => u.role === 'client').length,
        providers: users.filter(u => u.role === 'provider').length,
        admins: users.filter(u => u.role === 'admin').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
                <p className="text-gray-500">عرض وإدارة جميع المستخدمين المسجلين في المنصة</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'إجمالي المستخدمين', value: stats.total, icon: 'fa-users', color: 'bg-blue-50 text-blue-600' },
                    { label: 'عملاء', value: stats.clients, icon: 'fa-user', color: 'bg-indigo-50 text-indigo-600' },
                    { label: 'مزودو خدمات', value: stats.providers, icon: 'fa-store', color: 'bg-green-50 text-green-600' },
                    { label: 'مسؤولون', value: stats.admins, icon: 'fa-shield', color: 'bg-red-50 text-red-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                                <i className={`fa-solid ${s.icon}`}></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                                <p className="text-xs text-gray-500">{s.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="بحث بالاسم أو البريد الإلكتروني..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-10 bg-white border border-gray-200 rounded-xl px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <i className="fa-solid fa-search absolute right-3 top-3 text-gray-400 text-sm"></i>
                </div>
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                    <option value="all">جميع الأدوار</option>
                    {Object.entries(roleMap).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                            <tr>
                                <th className="px-6 py-4">المستخدم</th>
                                <th className="px-6 py-4">البريد الإلكتروني</th>
                                <th className="px-6 py-4">الدور</th>
                                <th className="px-6 py-4">تاريخ التسجيل</th>
                                <th className="px-6 py-4 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <i className="fa-solid fa-users-slash text-3xl mb-2 block opacity-30"></i>
                                        لا يوجد مستخدمون
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(user => {
                                    const r = roleMap[user.role] || roleMap.client;
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            <i className={`fa-solid ${r.icon} text-sm`}></i>
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-gray-900 text-sm">{user.full_name || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 text-sm">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.role}
                                                    onChange={e => handleRoleChange(user.id, e.target.value)}
                                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold focus:outline-none border-0 cursor-pointer ${r.cls}`}
                                                >
                                                    {Object.entries(roleMap).map(([val, { label }]) => (
                                                        <option key={val} value={val}>{label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString('ar-EG')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs font-bold transition-colors"
                                                    title="حذف"
                                                >
                                                    <i className="fa-solid fa-trash-can me-1"></i>حذف
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsersPage;
