import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { apiService } from '../services/api';
import type { User } from '../services/api';
import { toastService } from '../services/toast.service';
import Pagination from '../components/common/Pagination';

const AdminUsersPage = () => {
    const { t, i18n } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const PAGE_SIZE = 10;

    const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

    const roleMap = useMemo(
        () => ({
            client: {
                label: t('common.roles.client', 'Client'),
                cls: 'bg-blue-100 text-blue-700',
                icon: 'fa-user',
            },
            provider: {
                label: t('common.roles.provider', 'Provider'),
                cls: 'bg-green-100 text-green-700',
                icon: 'fa-store',
            },
            admin: {
                label: t('common.roles.admin', 'Admin'),
                cls: 'bg-red-100 text-red-700',
                icon: 'fa-shield',
            },
        }),
        [t]
    );

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.get<{ data?: User[] } | User[]>('/users');
            const list = Array.isArray(data) ? data : data?.data || [];
            setUsers(list);
        } catch (_error) {
            toastService.error(t('common.admin.users_load_error', 'Failed to load users'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        setPage(0);
    }, [searchTerm, roleFilter]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await apiService.patch(`/users/id/${userId}`, { role: newRole });
            setUsers(prev => prev.map(user => (user.id === userId ? { ...user, role: newRole as User['role'] } : user)));
            toastService.success(t('common.admin.role_update_success', 'Role updated successfully'));
        } catch (_error) {
            toastService.error(t('common.admin.role_update_error', 'Failed to update role'));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const ok = await confirm({
            title: t('common.admin.confirm_delete', 'Delete User'),
            message: t('common.admin.confirm_delete_user_msg', 'Are you sure you want to delete this user? This action cannot be undone.'),
            confirmLabel: t('common.delete', 'Delete'),
            cancelLabel: t('common.cancel', 'Cancel'),
        });

        if (!ok) return;

        setDeletingId(userId);
        try {
            await apiService.delete(`/users/id/${userId}`);
            setUsers(prev => prev.filter(user => user.id !== userId));
            toastService.success(t('common.admin.user_delete_success', 'User deleted successfully'));
        } catch (_error) {
            toastService.error(t('common.admin.user_delete_error', 'Failed to delete user'));
        } finally {
            setDeletingId(null);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchRole = roleFilter === 'all' || user.role === roleFilter;
        const query = searchTerm.trim().toLowerCase();
        const matchSearch =
            !query ||
            user.full_name?.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query);

        return matchRole && matchSearch;
    });
    const paginatedUsers = filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const stats = {
        total: users.length,
        clients: users.filter(user => user.role === 'client').length,
        providers: users.filter(user => user.role === 'provider').length,
        admins: users.filter(user => user.role === 'admin').length,
    };

    const statCards = [
        { label: t('common.admin.total_users', 'Total users'), value: stats.total, icon: 'fa-users', color: 'bg-blue-50 text-blue-600' },
        { label: t('common.roles.client_plural', 'Clients'), value: stats.clients, icon: 'fa-user', color: 'bg-indigo-50 text-indigo-600' },
        { label: t('common.roles.provider_plural', 'Providers'), value: stats.providers, icon: 'fa-store', color: 'bg-green-50 text-green-600' },
        { label: t('common.roles.admin_plural', 'Admins'), value: stats.admins, icon: 'fa-shield', color: 'bg-red-50 text-red-600' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('common.admin.users', 'User Management')}</h1>
                <p className="text-gray-500">{t('common.admin.users_subtitle', 'View and manage all registered users on the platform.')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map(card => (
                    <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                                <i className={`fa-solid ${card.icon}`}></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                                <p className="text-xs text-gray-500">{card.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder={t('common.admin.search_users', 'Search by name or email...')}
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <i className="fa-solid fa-search absolute right-3 top-3 text-sm text-gray-400"></i>
                </div>

                <select
                    value={roleFilter}
                    onChange={event => setRoleFilter(event.target.value)}
                    className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="all">{t('common.admin.all_roles', 'All roles')}</option>
                    {Object.entries(roleMap).map(([value, role]) => (
                        <option key={value} value={value}>
                            {role.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="border-b border-gray-100 bg-gray-50 text-sm font-bold text-gray-700">
                            <tr>
                                <th className="px-6 py-4">{t('common.admin.user', 'User')}</th>
                                <th className="px-6 py-4">{t('common.email', 'Email')}</th>
                                <th className="px-6 py-4">{t('common.role', 'Role')}</th>
                                <th className="px-6 py-4">{t('common.admin.registered_at', 'Registered')}</th>
                                <th className="px-6 py-4 text-center">{t('common.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr key={index} className="animate-pulse">
                                        {Array.from({ length: 5 }).map((__, cellIndex) => (
                                            <td key={cellIndex} className="px-6 py-4">
                                                <div className="h-4 w-24 rounded bg-gray-100"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <i className="fa-solid fa-users-slash mb-2 block text-3xl opacity-30"></i>
                                        {t('common.admin.no_users', 'No users found')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map(user => {
                                    const role = roleMap[user.role] || roleMap.client;

                                    return (
                                        <tr key={user.id} className="transition-colors hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                        {user.avatar_url ? (
                                                            <img loading="lazy" src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                                                        ) : (
                                                            <i className={`fa-solid ${role.icon} text-sm`}></i>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900">{user.full_name || t('common.not_available', 'N/A')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.role}
                                                    onChange={event => handleRoleChange(user.id, event.target.value)}
                                                    className={`cursor-pointer rounded-xl border-0 px-2.5 py-1.5 text-xs font-bold focus:outline-none ${role.cls}`}
                                                >
                                                    {Object.entries(roleMap).map(([value, option]) => (
                                                        <option key={value} value={value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString(locale)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={deletingId === user.id}
                                                    title={t('common.delete', 'Delete')}
                                                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {deletingId === user.id ? (
                                                        <i className="fa-solid fa-spinner fa-spin me-1"></i>
                                                    ) : (
                                                        <i className="fa-solid fa-trash-can me-1"></i>
                                                    )}
                                                    {t('common.delete', 'Delete')}
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

            <Pagination
                page={page}
                total={filteredUsers.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
            />

            <ConfirmDialogComponent />
        </div>
    );
};

export default AdminUsersPage;
