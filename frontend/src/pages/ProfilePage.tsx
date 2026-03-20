import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';
import { authService } from '../services/auth.service';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getAvatarUrl } from '../utils/image.utils';

interface ProviderProfile {
  id: string;
  company_name: string;
  description: string;
  city: string;
  website?: string;
  is_verified: boolean;
  rating_avg: number;
  review_count: number;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    city: '',
  });
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [providerForm, setProviderForm] = useState({ company_name: '', description: '', city: '', website: '' });
  const [editingProvider, setEditingProvider] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    authService.logout();
    navigate('/auth/login', { replace: true });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toastService.error(t('profile.avatar.size_error', 'حجم الصورة يجب أن يكون أقل من 5 ميغابايت'));
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        bio: (user as any).bio || '',
        city: (user as any).city || '',
      });
      if (user.role === 'provider') {
        interface ProfileResponse { data?: ProviderProfile; id?: string }
        apiService.get<ProfileResponse | ProviderProfile>('/providers/my-profile')
          .then((res) => {
            const p = (res as { data?: ProviderProfile }).data || (res as ProviderProfile);
            if (p?.id) {
              setProviderProfile(p);
              setProviderForm({
                company_name: p.company_name || '',
                description: p.description || '',
                city: p.city || '',
                website: p.website || '',
              });
            }
          })
          .catch(() => { });
      }
    }
  }, [user, isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProviderForm({ ...providerForm, [e.target.name]: e.target.value });
  };

  const handleProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProvider(true);
    try {
      await apiService.patch('/providers/my-profile', providerForm);
      setProviderProfile(prev => prev ? { ...prev, ...providerForm } : prev);
      toastService.success(t('profile.provider.success_update', 'تم تحديث ملف الشركة بنجاح'));
      setEditingProvider(false);
    } catch {
      toastService.error(t('profile.provider.error_update', 'فشل تحديث ملف الشركة'));
    } finally {
      setSavingProvider(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let avatarUrl = (user as any)?.avatar_url || null;

      // Upload avatar if a new file was selected
      if (avatarFile && avatarPreview) {
        try {
          const uploadRes = await apiService.post<{ url?: string; data?: { url?: string } }>('/users/avatar', { avatar_url: avatarPreview });
          if (uploadRes?.url || uploadRes?.data?.url) {
            avatarUrl = uploadRes.url || uploadRes.data?.url;
          }
        } catch { /* avatar upload failed silently */ }
      }

      const payload = { ...formData, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) };
      await authService.updateProfile(payload);
      toastService.success(t('profile.success_update', 'تم تحديث الملف الشخصي بنجاح'));
      setEditing(false);
      setAvatarFile(null);
    } catch (error: any) {
      toastService.error(error.message || t('profile.error_update', 'فشل تحديث الملف الشخصي'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <LoadingSpinner fullScreen message={t('common.loading', 'جاري التحميل...')} />;
  }

  return (
    <div className="min-h-screen bg-bglight p-5" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-primary mb-4 flex items-center gap-2 transition-colors"
        >
          <i className="fa-solid fa-arrow-right"></i>
          {t('common.back', 'العودة')}
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('profile.title', 'الملف الشخصي')}</h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-purple-700 transition-colors"
              >
                <i className="fa-solid fa-edit ms-2"></i>
                {t('common.edit', 'تعديل')}
              </button>
            )}
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              {avatarPreview || user.avatar_url ? (
                <img
                  src={avatarPreview || getAvatarUrl(user.avatar_url!)}
                  alt="avatar"
                  className="w-24 h-24 rounded-full object-cover shadow-md"
                  loading="lazy"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
              )}
              {editing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors"
                >
                  <i className="fa-solid fa-camera text-xs"></i>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user.full_name || t('user.default_name', 'مستخدم')}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="mt-2 px-3 py-1 rounded-full bg-purple-100 text-primary text-xs font-bold">
              {user.role === 'client' ? t('roles.client', 'عميل') : user.role === 'provider' ? t('roles.provider', 'مزود خدمة') : t('roles.admin', 'مدير')}
            </span>
            {avatarFile && (
              <p className="text-xs text-primary mt-1">
                <i className="fa-solid fa-check ms-1"></i>{t('profile.avatar.success', 'تم اختيار صورة جديدة')}
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.fields.full_name', 'الاسم الكامل')}</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!editing}
                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.fields.phone', 'رقم الهاتف')}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!editing}
                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                placeholder="+974-XXXX-XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.fields.city', 'المدينة')}</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={!editing}
                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                placeholder={t('cities.doha', 'الدوحة')}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.fields.bio', 'نبذة عني')}</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                disabled={!editing}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                placeholder={t('profile.fields.bio_placeholder', 'أخبرنا عن نفسك...')}
              />
            </div>

            {editing && (
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50"
                >
                  {loading ? t('common.saving', 'جاري الحفظ...') : t('common.save_changes', 'حفظ التغييرات')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel', 'إلغاء')}
                </button>
              </div>
            )}
          </form>

          {/* Account Info */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('profile.account_info', 'معلومات الحساب')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-primary w-4"></i>
                  {t('profile.fields.email', 'البريد الإلكتروني')}
                </span>
                <span className="text-sm font-bold text-gray-900">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <i className="fa-solid fa-calendar text-primary w-4"></i>
                  {t('profile.registration_date', 'تاريخ التسجيل')}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {new Date(user.created_at).toLocaleDateString(t('common.date_locale', 'ar-EG'))}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <i className="fa-solid fa-shield text-primary w-4"></i>
                  {t('profile.role', 'الدور')}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-700' :
                  user.role === 'provider' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                  {user.role === 'client' ? t('roles.client', 'عميل') : user.role === 'provider' ? t('roles.provider', 'مزود خدمة') : t('roles.admin', 'مدير')}
                </span>
              </div>
            </div>
          </div>

          {/* Provider Profile Section */}
          {user.role === 'provider' && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{t('profile.provider.title', 'ملف الشركة')}</h3>
                <div className="flex items-center gap-2">
                  {providerProfile?.is_verified && (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
                      <i className="fa-solid fa-circle-check"></i> {t('profile.provider.verified', 'موثق')}
                    </span>
                  )}
                  {providerProfile?.id && (
                    <Link
                      to={`/services?provider=${providerProfile.id}`}
                      className="px-3 py-1.5 rounded-xl bg-bglight text-primary text-xs font-bold flex items-center gap-1 hover:bg-purple-50 transition-colors"
                    >
                      <i className="fa-solid fa-eye"></i> {t('common.view_profile', 'عرض الملف')}
                    </Link>
                  )}
                  {!editingProvider && (
                    <button
                      onClick={() => setEditingProvider(true)}
                      className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-purple-700 transition-colors"
                    >
                      <i className="fa-solid fa-edit ms-1"></i>{t('common.edit', 'تعديل')}
                    </button>
                  )}
                </div>
              </div>

              {providerProfile ? (
                <form onSubmit={handleProviderSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.provider.company_name', 'اسم الشركة')}</label>
                    <input
                      type="text"
                      name="company_name"
                      value={providerForm.company_name}
                      onChange={handleProviderChange}
                      disabled={!editingProvider}
                      className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.fields.city', 'المدينة')}</label>
                    <input
                      type="text"
                      name="city"
                      value={providerForm.city}
                      onChange={handleProviderChange}
                      disabled={!editingProvider}
                      className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      placeholder={t('cities.doha', 'الدوحة')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.provider.website', 'الموقع الإلكتروني')}</label>
                    <input
                      type="url"
                      name="website"
                      value={providerForm.website}
                      onChange={handleProviderChange}
                      disabled={!editingProvider}
                      className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.provider.description', 'وصف الشركة')}</label>
                    <textarea
                      name="description"
                      value={providerForm.description}
                      onChange={handleProviderChange}
                      disabled={!editingProvider}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      placeholder={t('profile.provider.description_placeholder', 'وصف مختصر عن خدماتك...')}
                    />
                  </div>
                  <div className="flex items-center gap-4 py-2 bg-bglight rounded-xl px-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-primary">{providerProfile.rating_avg?.toFixed(1) || '0.0'}</p>
                      <p className="text-xs text-gray-500">{t('profile.provider.rating', 'التقييم')}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{providerProfile.review_count || 0}</p>
                      <p className="text-xs text-gray-500">{t('profile.provider.reviews', 'مراجعة')}</p>
                    </div>
                  </div>
                  {editingProvider && (
                     <div className="flex gap-3">
                       <button
                         type="submit"
                         disabled={savingProvider}
                         className="flex-1 py-3 rounded-xl gradient-purple text-white font-bold disabled:opacity-50"
                       >
                         {savingProvider ? t('common.saving', 'جاري الحفظ...') : t('common.save', 'حفظ')}
                       </button>
                       <button
                         type="button"
                         onClick={() => setEditingProvider(false)}
                         className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold"
                       >
                         {t('common.cancel', 'إلغاء')}
                       </button>
                     </div>
                  )}
                </form>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">{t('profile.provider.no_profile_yet', 'لا يوجد ملف شركة بعد')}</p>
              )}
            </div>
          )}

          {/* Logout */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              {loggingOut ? t('auth.logging_out', 'جاري تسجيل الخروج...') : t('auth.logout', 'تسجيل الخروج')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
