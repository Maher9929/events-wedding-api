import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  quotesService,
  type Quote,
  type QuoteRequest,
  type QuoteRequestItem,
} from '../services/quotes.service';
import { toastService } from '../services/toast.service';
import { authService } from '../services/auth.service';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';

const PAGE_SIZE = 10;

type Filter = 'all' | 'sent' | 'accepted' | 'rejected' | 'expired';
type QuotesView = 'requests' | 'quotes';

interface QuoteLineDraft {
  description: string;
  price: string;
  quantity: string;
  unit?: string;
}

interface QuoteDraft {
  valid_until: string;
  notes: string;
  terms: string;
  tax_rate: string;
  discount_amount: string;
  items: QuoteLineDraft[];
}

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const buildDraftFromRequest = (request: QuoteRequest): QuoteDraft => ({
  valid_until: toInputDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  notes: '',
  terms: '',
  tax_rate: '0',
  discount_amount: '0',
  items: (request.items?.length
    ? request.items
    : [{ description: request.title } as QuoteRequestItem]
  ).map((item) => ({
    description: item.description || request.title,
    price: String(item.estimated_budget || ''),
    quantity: String(item.quantity || 1),
    unit: item.unit,
  })),
});

const getQuoteItems = (quote: Quote) => {
  const raw =
    quote.items ||
    (quote as Quote & { items_json?: Quote['items'] }).items_json ||
    [];
  return Array.isArray(raw) ? raw : [];
};

const QuotesPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentUser = authService.getCurrentUser();
  const isProvider = currentUser?.role === 'provider';
  const isClient = currentUser?.role === 'client';
  const canTrackRequests = isProvider || isClient;

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(canTrackRequests);
  const [quotesView, setQuotesView] = useState<QuotesView>(
    isProvider ? 'requests' : 'quotes',
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, QuoteDraft>>({});
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const statusMap: Record<
    string,
    { label: string; cls: string; icon: string }
  > = {
    draft: {
      label: t('quotes.status.draft', 'Brouillon'),
      cls: 'bg-gray-100 text-gray-600',
      icon: 'fa-file',
    },
    sent: {
      label: t('quotes.status.sent', 'Envoye'),
      cls: 'bg-blue-100 text-blue-700',
      icon: 'fa-paper-plane',
    },
    accepted: {
      label: t('quotes.status.accepted', 'Accepte'),
      cls: 'bg-green-100 text-green-700',
      icon: 'fa-check-circle',
    },
    rejected: {
      label: t('quotes.status.rejected', 'Refuse'),
      cls: 'bg-red-100 text-red-700',
      icon: 'fa-times-circle',
    },
    expired: {
      label: t('quotes.status.expired', 'Expire'),
      cls: 'bg-orange-100 text-orange-700',
      icon: 'fa-clock',
    },
  };

  useEffect(() => {
    setPage(0);
  }, [filter, search]);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        void fetchQuotes();
      },
      search ? 300 : 0,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, search]);

  useEffect(() => {
    if (canTrackRequests) {
      void fetchQuoteRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canTrackRequests]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filter !== 'all') p.set('status', filter);
      if (search.trim()) p.set('search', search.trim());
      p.set('limit', String(PAGE_SIZE));
      p.set('offset', String(page * PAGE_SIZE));
      const res = (await quotesService.getMyQuotes(`?${p.toString()}`)) as
        | Quote[]
        | { data?: Quote[]; total?: number };
      const list = Array.isArray(res) ? res : res?.data || [];
      const tot =
        !Array.isArray(res) && typeof res?.total === 'number'
          ? res.total
          : list.length;
      setQuotes(list);
      setTotal(tot);
    } catch (_error) {
      toastService.error(
        t('quotes.fetch_failed', 'Impossible de charger les devis'),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchQuoteRequests = async () => {
    setRequestsLoading(true);
    try {
      const requests = await quotesService.getQuoteRequests();
      setQuoteRequests(Array.isArray(requests) ? requests : []);
    } catch (_error) {
      toastService.error(
        t(
          'quotes.requests_fetch_failed',
          'Impossible de charger les demandes de devis',
        ),
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return t('common.today', "Aujourd'hui");
    if (days === 1) return t('common.yesterday', 'Hier');
    return t('common.days_ago', 'Il y a {{count}} jours', { count: days });
  };

  const updateDraft = (requestId: string, patch: Partial<QuoteDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] || buildDraftFromRequest(findRequest(requestId))),
        ...patch,
      },
    }));
  };

  const updateDraftItem = (
    requestId: string,
    index: number,
    patch: Partial<QuoteLineDraft>,
  ) => {
    const base =
      drafts[requestId] || buildDraftFromRequest(findRequest(requestId));
    const items = base.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    );
    updateDraft(requestId, { items });
  };

  const findRequest = (requestId: string) => {
    const request = quoteRequests.find((item) => item.id === requestId);
    if (!request) throw new Error('Quote request not found');
    return request;
  };

  const openResponseForm = (request: QuoteRequest) => {
    setActiveRequestId((prev) => (prev === request.id ? null : request.id));
    setDrafts((prev) => ({
      ...prev,
      [request.id]: prev[request.id] || buildDraftFromRequest(request),
    }));
  };

  const requestQuotes = (requestId: string) =>
    quotes.filter((quote) => quote.quote_request_id === requestId);

  const requestHasQuote = (requestId: string) => {
    const matches = requestQuotes(requestId);
    if (isProvider) {
      return matches.some((quote) => quote.provider_id === currentUser?.id);
    }
    return matches.length > 0;
  };

  const handleCreateAndSendQuote = async (request: QuoteRequest) => {
    const draft = drafts[request.id] || buildDraftFromRequest(request);
    const items = draft.items.map((item) => ({
      description: item.description.trim(),
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      ...(item.unit ? { unit: item.unit } : {}),
    }));

    if (
      items.some(
        (item) =>
          !item.description || !Number.isFinite(item.price) || item.price <= 0,
      )
    ) {
      toastService.error(
        t(
          'quotes.form.invalid_items',
          'Chaque ligne du devis doit avoir une description et un prix valide',
        ),
      );
      return;
    }

    setUpdating(request.id);
    try {
      const quote = await quotesService.create({
        client_id: request.client_id,
        quote_request_id: request.id,
        items,
        discount_amount: Number(draft.discount_amount) || 0,
        tax_rate: Number(draft.tax_rate) || 0,
        valid_until: draft.valid_until || undefined,
        notes: draft.notes.trim() || undefined,
        terms: draft.terms.trim() || undefined,
        status: 'draft',
      });
      const sentQuote = await quotesService.send(quote.id);
      setQuotes((prev) => [sentQuote, ...prev]);
      setActiveRequestId(null);
      toastService.success(
        t('quotes.form.sent_success', 'Devis envoye au client'),
      );
    } catch (_error) {
      toastService.error(
        t('quotes.form.sent_failed', "Impossible d'envoyer le devis"),
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleAccept = async (id: string) => {
    setUpdating(id);
    try {
      await quotesService.updateStatus(id, 'accepted');
      setQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: 'accepted' } : q)),
      );
      toastService.success(t('quotes.accept_success', 'Devis accepte'));
    } catch (_error) {
      toastService.error(
        t('quotes.accept_failed', "Impossible d'accepter le devis"),
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (id: string) => {
    const ok = await confirm({
      title: t('quotes.confirm_reject_title', 'Refuser le devis'),
      message: t('quotes.confirm_reject', 'Confirmer le refus de ce devis ?'),
      variant: 'warning',
      confirmLabel: t('common.reject', 'Refuser'),
      cancelLabel: t('common.cancel', 'Annuler'),
    });
    if (!ok) return;
    setUpdating(id);
    try {
      await quotesService.updateStatus(id, 'rejected');
      setQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: 'rejected' } : q)),
      );
      toastService.success(t('quotes.reject_success', 'Devis refuse'));
    } catch (_error) {
      toastService.error(
        t('quotes.reject_failed', 'Impossible de refuser le devis'),
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleBookFromQuote = (quote: Quote) => {
    const params = new URLSearchParams({
      quote: quote.id,
      provider: quote.provider_id,
      amount: String(quote.total_amount || 0),
      ...(quote.service_id ? { service: quote.service_id } : {}),
      ...(quote.event_id ? { event: quote.event_id } : {}),
    });
    navigate(`/client/checkout?${params.toString()}`);
  };

  const filteredRequests = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return quoteRequests;
    return quoteRequests.filter((request) =>
      [request.title, request.description, request.location, request.event_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [quoteRequests, search]);

  const visibleQuotes = quotes;
  const showRequests = canTrackRequests && quotesView === 'requests';

  return (
    <div
      className="min-h-screen bg-bglight font-tajawal pb-24"
      dir={i18n.language === 'en' ? 'ltr' : 'rtl'}
    >
      <header className="bg-white sticky top-0 z-50 shadow-sm px-5 py-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center"
          >
            <i
              className={`fa-solid ${i18n.language === 'en' ? 'fa-arrow-left' : 'fa-arrow-right'} text-gray-700`}
            ></i>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">
              {canTrackRequests
                ? t('quotes.provider_title', 'Demandes et devis')
                : t('quotes.title', 'Devis')}
            </h1>
            <p className="text-xs text-gray-500">
              {showRequests
                ? t('quotes.requests_count', '{{count}} demandes ouvertes', {
                    count: filteredRequests.length,
                  })
                : t('quotes.offers_count_full', '{{count}} devis', {
                    count: total,
                  })}
            </p>
          </div>
        </div>

        {canTrackRequests && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-bglight p-1">
            <button
              onClick={() => setQuotesView('requests')}
              className={`h-10 rounded-xl text-sm font-bold transition-colors ${
                quotesView === 'requests'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {isProvider
                ? t('quotes.tabs.requests', 'Demandes recues')
                : t('quotes.tabs.sent_requests', 'Demandes envoyees')}
            </button>
            <button
              onClick={() => setQuotesView('quotes')}
              className={`h-10 rounded-xl text-sm font-bold transition-colors ${
                quotesView === 'quotes'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {isProvider
                ? t('quotes.tabs.quotes', 'Mes devis')
                : t('quotes.tabs.received_quotes', 'Devis recus')}
            </button>
          </div>
        )}

        <div className="relative mt-3">
          <input
            type="text"
            placeholder={
              showRequests
                ? t('quotes.search_requests', 'Rechercher une demande...')
                : t('quotes.search_placeholder', 'Rechercher un devis...')
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full h-10 bg-bglight rounded-xl ${i18n.language === 'en' ? 'ps-10 pe-4' : 'pe-10 ps-4'} text-sm focus:outline-none focus:ring-2 focus:ring-primary/20`}
          />
          <i
            className={`fa-solid fa-search absolute ${i18n.language === 'en' ? 'left-3' : 'right-3'} top-3 text-gray-400 text-sm`}
          ></i>
        </div>
      </header>

      {showRequests ? (
        <main className="px-5 py-4">
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 shadow-sm animate-pulse"
                >
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title={
                isProvider
                  ? t('quotes.requests_empty.title', 'Aucune demande ouverte')
                  : t(
                      'quotes.client_requests_empty.title',
                      'Aucune demande envoyee',
                    )
              }
              description={t(
                isProvider
                  ? 'quotes.requests_empty.desc'
                  : 'quotes.client_requests_empty.desc',
                isProvider
                  ? 'Les nouvelles demandes client apparaitront ici.'
                  : 'Vos demandes de devis envoyees aux prestataires apparaitront ici.',
              )}
            />
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const isExpired =
                  request.deadline && new Date(request.deadline) < new Date();
                const canReply =
                  isProvider &&
                  request.status === 'open' &&
                  !isExpired &&
                  !requestHasQuote(request.id);
                const quoteCount = requestQuotes(request.id).length;
                const draft =
                  drafts[request.id] || buildDraftFromRequest(request);
                return (
                  <div
                    key={request.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900">
                            {request.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {timeAgo(request.created_at)}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-xl font-bold ${
                            canReply
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isExpired
                            ? t('quotes.request_status.expired', 'Expiree')
                            : request.status === 'closed'
                              ? t('quotes.request_status.closed', 'Fermee')
                              : requestHasQuote(request.id)
                                ? isProvider
                                  ? t(
                                      'quotes.request_status.answered',
                                      'Repondu',
                                    )
                                  : t(
                                      'quotes.request_status.has_quotes',
                                      '{{count}} devis',
                                      { count: quoteCount },
                                    )
                                : t('quotes.request_status.open', 'Ouverte')}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mt-3 leading-6">
                        {request.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                        <InfoTile
                          icon="fa-location-dot"
                          label={t('quotes.request.location', 'Lieu')}
                          value={request.location || '-'}
                        />
                        <InfoTile
                          icon="fa-calendar"
                          label={t('quotes.request.date', 'Date')}
                          value={
                            request.event_date
                              ? new Date(
                                  request.event_date,
                                ).toLocaleDateString()
                              : '-'
                          }
                        />
                        <InfoTile
                          icon="fa-users"
                          label={t('quotes.request.guests', 'Invites')}
                          value={
                            request.guest_count
                              ? String(request.guest_count)
                              : '-'
                          }
                        />
                        <InfoTile
                          icon="fa-wallet"
                          label={t('quotes.request.budget', 'Budget max')}
                          value={
                            request.max_budget
                              ? `${request.max_budget.toLocaleString()} ${t('common.currency', 'QAR')}`
                              : '-'
                          }
                        />
                        <InfoTile
                          icon="fa-store"
                          label={t('quotes.request.providers', 'Prestataires')}
                          value={String(request.provider_ids?.length || 0)}
                        />
                      </div>

                      {request.items?.length > 0 && (
                        <div className="mt-4 bg-gray-50 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-bold text-gray-700">
                            {t('quotes.request.items', 'Services demandes')}
                          </p>
                          {request.items.map((item, index) => (
                            <div
                              key={`${request.id}-${index}`}
                              className="flex items-start justify-between gap-3 text-xs"
                            >
                              <span className="text-gray-600">
                                {item.description}
                              </span>
                              <span className="font-bold text-gray-900 whitespace-nowrap">
                                {item.estimated_budget
                                  ? `${item.estimated_budget.toLocaleString()} ${t('common.currency', 'QAR')}`
                                  : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {canReply && (
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => openResponseForm(request)}
                          className="w-full py-3 text-center text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                        >
                          <i className="fa-solid fa-file-signature me-2"></i>
                          {activeRequestId === request.id
                            ? t('common.close', 'Fermer')
                            : t(
                                'quotes.request.reply',
                                'Repondre avec un devis',
                              )}
                        </button>
                      </div>
                    )}

                    {activeRequestId === request.id && (
                      <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                        <div className="space-y-3">
                          {draft.items.map((item, index) => (
                            <div
                              key={`${request.id}-draft-${index}`}
                              className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px] gap-3"
                            >
                              <input
                                value={item.description}
                                onChange={(e) =>
                                  updateDraftItem(request.id, index, {
                                    description: e.target.value,
                                  })
                                }
                                className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t(
                                  'quotes.form.description',
                                  'Description',
                                )}
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(e) =>
                                  updateDraftItem(request.id, index, {
                                    price: e.target.value,
                                  })
                                }
                                className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('quotes.form.price', 'Prix')}
                              />
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateDraftItem(request.id, index, {
                                    quantity: e.target.value,
                                  })
                                }
                                className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('quotes.form.quantity', 'Qt.')}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="date"
                            value={draft.valid_until}
                            onChange={(e) =>
                              updateDraft(request.id, {
                                valid_until: e.target.value,
                              })
                            }
                            className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <input
                            type="number"
                            min="0"
                            value={draft.discount_amount}
                            onChange={(e) =>
                              updateDraft(request.id, {
                                discount_amount: e.target.value,
                              })
                            }
                            className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder={t('quotes.form.discount', 'Remise')}
                          />
                          <input
                            type="number"
                            min="0"
                            value={draft.tax_rate}
                            onChange={(e) =>
                              updateDraft(request.id, {
                                tax_rate: e.target.value,
                              })
                            }
                            className="h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder={t('quotes.form.tax', 'TVA %')}
                          />
                        </div>

                        <textarea
                          value={draft.notes}
                          onChange={(e) =>
                            updateDraft(request.id, { notes: e.target.value })
                          }
                          className="w-full min-h-24 rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder={t(
                            'quotes.form.notes',
                            'Notes pour le client',
                          )}
                        />
                        <textarea
                          value={draft.terms}
                          onChange={(e) =>
                            updateDraft(request.id, { terms: e.target.value })
                          }
                          className="w-full min-h-20 rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder={t(
                            'quotes.form.terms',
                            'Conditions de paiement / annulation',
                          )}
                        />

                        <button
                          onClick={() => void handleCreateAndSendQuote(request)}
                          disabled={updating === request.id}
                          className="w-full h-12 rounded-xl gradient-purple text-white text-sm font-bold disabled:opacity-60"
                        >
                          {updating === request.id ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            t('quotes.form.send', 'Creer et envoyer le devis')
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      ) : (
        <>
          {!loading && total > 0 && (
            <div className="px-5 pt-3 grid grid-cols-3 gap-3">
              <Stat value={total} label={t('quotes.stats.total', 'Total')} />
              <Stat
                value={quotes.filter((q) => q.status === 'accepted').length}
                label={t('quotes.stats.accepted', 'Accepte')}
                tone="green"
              />
              <Stat
                value={quotes
                  .filter((q) => q.status === 'accepted')
                  .reduce((sum, quote) => sum + (quote.total_amount || 0), 0)
                  .toLocaleString()}
                label={t('quotes.stats.accepted_amount', 'Montant accepte')}
                tone="primary"
              />
            </div>
          )}

          <div
            className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            {(['all', 'sent', 'accepted', 'rejected', 'expired'] as const).map(
              (f) => {
                const count =
                  f === 'all'
                    ? quotes.length
                    : quotes.filter((q) => q.status === f).length;
                const labels: Record<Filter, string> = {
                  all: t('common.all', 'Tous'),
                  sent: t('quotes.status.sent', 'Envoye'),
                  accepted: t('quotes.status.accepted', 'Accepte'),
                  rejected: t('quotes.status.rejected', 'Refuse'),
                  expired: t('quotes.status.expired', 'Expire'),
                };
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      filter === f
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white text-gray-600 shadow-sm'
                    }`}
                  >
                    {labels[f]}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <main className="px-5 py-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-5 shadow-sm animate-pulse"
                  >
                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : visibleQuotes.length === 0 ? (
              <EmptyState
                title={t('quotes.empty_state.title', 'Aucun devis')}
                description={t(
                  'quotes.empty_state.desc',
                  'Les devis apparaitront ici.',
                )}
              />
            ) : (
              <div className="space-y-4">
                {visibleQuotes.map((quote) => {
                  const st = statusMap[quote.status] || statusMap.draft;
                  const isExpired =
                    quote.valid_until &&
                    new Date(quote.valid_until) < new Date();
                  const canClientRespond =
                    !isProvider && quote.status === 'sent' && !isExpired;
                  return (
                    <div
                      key={quote.id}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                              <i className="fa-solid fa-file-invoice text-primary"></i>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">
                                {t('quotes.card.quote_number', 'Devis')} #
                                {quote.id.substring(0, 8).toUpperCase()}
                              </p>
                              <p className="text-xs text-gray-400">
                                {timeAgo(quote.created_at)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 ${st.cls}`}
                          >
                            <i
                              className={`fa-solid ${st.icon} text-[10px]`}
                            ></i>
                            {isExpired && quote.status === 'sent'
                              ? t('quotes.status.expired_short', 'Expire')
                              : st.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500">
                              {t('quotes.card.total_amount', 'Montant total')}
                            </p>
                            <p className="text-xl font-bold text-primary">
                              {(quote.total_amount || 0).toLocaleString()}{' '}
                              {t('common.currency', 'QAR')}
                            </p>
                          </div>
                          {quote.valid_until && (
                            <div
                              className={
                                i18n.language === 'en'
                                  ? 'text-right'
                                  : 'text-left'
                              }
                            >
                              <p className="text-xs text-gray-500">
                                {t(
                                  'quotes.card.valid_until',
                                  "Valide jusqu'au",
                                )}
                              </p>
                              <p className="text-sm font-bold text-gray-700">
                                {new Date(
                                  quote.valid_until,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {getQuoteItems(quote).length > 0 && (
                          <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-1.5">
                            <p className="text-xs font-bold text-gray-700 mb-2">
                              {t(
                                'quotes.card.offer_details',
                                'Details du devis',
                              )}
                            </p>
                            {getQuoteItems(quote).map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <span className="text-gray-600 flex items-center gap-1">
                                  <i className="fa-solid fa-circle text-primary text-[6px]"></i>
                                  {item.name || item.description}
                                  {(item.quantity || 0) > 1 && (
                                    <span className="text-gray-400">
                                      x{item.quantity}
                                    </span>
                                  )}
                                </span>
                                <span className="font-bold text-gray-900">
                                  {(
                                    item.total ||
                                    item.amount ||
                                    (item.unit_price || item.price || 0) *
                                      (item.quantity || 1)
                                  ).toLocaleString()}{' '}
                                  {t('common.currency', 'QAR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {quote.notes && (
                          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 mt-2">
                            <i className="fa-solid fa-note-sticky me-1 text-gray-400"></i>
                            {quote.notes}
                          </p>
                        )}
                      </div>

                      {canClientRespond && (
                        <div className="flex border-t border-gray-100">
                          <button
                            onClick={() => void handleAccept(quote.id)}
                            disabled={updating === quote.id}
                            className="flex-1 py-3 text-center text-sm font-bold text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            {updating === quote.id ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              t('common.accept', 'Accepter')
                            )}
                          </button>
                          <div className="w-px bg-gray-100"></div>
                          <button
                            onClick={() => void handleReject(quote.id)}
                            disabled={updating === quote.id}
                            className="flex-1 py-3 text-center text-sm font-bold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {t('common.reject', 'Refuser')}
                          </button>
                        </div>
                      )}

                      {!isProvider && quote.status === 'accepted' && (
                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => handleBookFromQuote(quote)}
                            className="w-full py-3 text-center text-sm font-bold text-white gradient-purple hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                          >
                            <i className="fa-solid fa-calendar-check"></i>
                            {t(
                              'quotes.card.create_booking',
                              'Creer une reservation depuis ce devis',
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </main>
        </>
      )}

      <ConfirmDialogComponent />
    </div>
  );
};

const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <i className="fa-solid fa-file-invoice text-gray-400 text-3xl"></i>
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 max-w-sm">{description}</p>
  </div>
);

const InfoTile = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-[11px] text-gray-500 flex items-center gap-1">
      <i className={`fa-solid ${icon}`}></i>
      {label}
    </p>
    <p className="text-sm font-bold text-gray-900 mt-1 truncate">{value}</p>
  </div>
);

const Stat = ({
  value,
  label,
  tone,
}: {
  value: string | number;
  label: string;
  tone?: 'green' | 'primary';
}) => {
  const cls =
    tone === 'green'
      ? 'bg-green-50 text-green-700'
      : tone === 'primary'
        ? 'bg-purple-50 text-primary'
        : 'bg-white text-gray-900';
  return (
    <div className={`${cls} rounded-2xl p-3 shadow-sm text-center`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-80 mt-0.5">{label}</p>
    </div>
  );
};

export default QuotesPage;
