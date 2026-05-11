import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Category } from '../../services/api';
import type { GenericBookingRow } from '../../hooks/useAdminDashboard';

interface Props {
  allBookings: GenericBookingRow[];
  categories: Category[];
}

const AdminTopLists = ({ allBookings, categories }: Props) => {
  if (allBookings.length === 0) return null;

  return (
    <>
      <TopServices allBookings={allBookings} />
      <TopClients allBookings={allBookings} />
      <TopCategories allBookings={allBookings} categories={categories} />
      <TopProviders allBookings={allBookings} />
    </>
  );
};

// ─── Top Services ───────────────────────────────────────────

function TopServices({ allBookings }: { allBookings: GenericBookingRow[] }) {
  const { t } = useTranslation();
  const serviceMap: Record<string, { title: string; count: number; revenue: number }> = {};

  allBookings.forEach((b) => {
    const sid = b.service_id || b.services?.id;
    const title = b.services?.title || sid?.substring(0, 8) || t('common.unspecified', 'غير محدد');
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
        <h3 className="text-lg font-bold text-gray-900">{t('admin.dashboard.top_services', 'أكثر الخدمات حجزاً')}</h3>
        <Link to="/admin/services" className="text-xs text-primary font-bold hover:underline">{t('common.view_all', 'عرض الكل')}</Link>
      </div>
      <div className="space-y-3">
        {top5.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="text-sm font-bold text-gray-800 truncate max-w-[200px]">{s.title}</span>
            </div>
            <div className="flex items-center gap-3 text-xs flex-shrink-0">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-bold">{s.count} {t('common.booking_count', 'حجز')}</span>
              {s.revenue > 0 && <span className="text-primary font-bold">{s.revenue.toLocaleString()} {t('common.currency', 'ر.ق')}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top Clients ────────────────────────────────────────────

function TopClients({ allBookings }: { allBookings: GenericBookingRow[] }) {
  const { t } = useTranslation();
  const clientMap: Record<string, { name: string; count: number; spent: number }> = {};

  allBookings.forEach((b) => {
    const cid = b.client_id;
    if (!cid) return;
    const name = b.users?.full_name || b.users?.email || cid.substring(0, 8);
    if (!clientMap[cid]) clientMap[cid] = { name, count: 0, spent: 0 };
    clientMap[cid].count++;
    if (b.status === 'completed') clientMap[cid].spent += b.amount || 0;
  });

  const top5 = Object.values(clientMap).sort((a, b) => b.spent - a.spent).slice(0, 5);
  if (top5.length === 0 || top5[0].spent === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{t('admin.dashboard.top_clients', 'أعلى العملاء إنفاقاً')}</h3>
        <Link to="/admin/users" className="text-xs text-primary font-bold hover:underline">{t('common.view_all', 'عرض الكل')}</Link>
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
                <p className="text-xs text-gray-400">{c.count} {t('common.booking_count', 'حجز')}</p>
              </div>
            </div>
            <span className="text-primary font-bold text-sm flex-shrink-0">{c.spent.toLocaleString()} {t('common.currency', 'ر.ق')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top Categories ─────────────────────────────────────────

function TopCategories({ allBookings, categories }: { allBookings: GenericBookingRow[]; categories: Category[] }) {
  const { t } = useTranslation();
  const catMap: Record<string, { name: string; count: number }> = {};

  allBookings.forEach((b) => {
    const catId = b.services?.category_id;
    if (!catId) return;
    const cat = categories.find((c) => c.id === catId);
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
        <h3 className="text-lg font-bold text-gray-900">{t('admin.dashboard.top_categories', 'أكثر الفئات طلباً')}</h3>
        <Link to="/admin/categories" className="text-xs text-primary font-bold hover:underline">{t('common.view_all', 'عرض الكل')}</Link>
      </div>
      <div className="space-y-3">
        {top5.map((c, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-gray-800">{c.name}</span>
                <span className="text-xs text-gray-500 font-bold">{c.count} {t('common.booking_count', 'حجز')}</span>
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
}

// ─── Top Providers ──────────────────────────────────────────

function TopProviders({ allBookings }: { allBookings: GenericBookingRow[] }) {
  const { t } = useTranslation();
  const provMap: Record<string, { name: string; count: number; revenue: number }> = {};

  allBookings.forEach((b) => {
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
        <h3 className="text-lg font-bold text-gray-900">{t('admin.dashboard.top_providers_revenue', 'أعلى الموردين إيراداً')}</h3>
        <Link to="/admin/providers" className="text-xs text-primary font-bold hover:underline">{t('common.view_all', 'عرض الكل')}</Link>
      </div>
      <div className="space-y-3">
        {top5.map((p, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div>
                <p className="text-sm font-bold text-gray-800 truncate max-w-[160px]">{p.name}</p>
                <p className="text-xs text-gray-400">{p.count} {t('common.booking_count', 'حجز')}</p>
              </div>
            </div>
            <span className="text-green-600 font-bold text-sm flex-shrink-0">{p.revenue.toLocaleString()} {t('common.currency', 'ر.ق')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminTopLists;
