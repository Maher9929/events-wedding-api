import type {
  AuthResponse,
  Booking,
  Category,
  Conversation,
  Event,
  Message,
  Provider,
  ServiceItem,
  User,
} from './api';

type Quote = {
  id: string;
  client_id: string;
  provider_id: string;
  service_id?: string;
  event_id?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  total_amount: number;
  valid_until?: string;
  notes?: string;
  items?: Array<{ id: string; description: string; quantity: number; unit_price: number; total: number }>;
  created_at: string;
};

type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_email?: string;
  user_name?: string;
  details: string;
  created_at: string;
  severity: 'info' | 'warning' | 'critical';
};

type EventBudget = {
  id: string;
  event_id: string;
  category: string;
  estimated_cost: number;
  actual_cost: number;
};

type EventTask = {
  id: string;
  event_id: string;
  title: string;
  status: 'pending' | 'completed';
};

type EventGuest = {
  id: string;
  event_id: string;
  full_name: string;
  email?: string;
  status: 'invited' | 'confirmed' | 'declined';
  created_at: string;
  updated_at: string;
};

type E2EState = {
  users: User[];
  categories: Category[];
  providers: Provider[];
  services: ServiceItem[];
  events: Event[];
  bookings: Booking[];
  quotes: Quote[];
  conversations: Conversation[];
  messages: Message[];
  reviews: Array<{
    id: string;
    service_id: string;
    rating: number;
    comment: string;
    created_at: string;
    user_profiles?: { full_name?: string };
  }>;
  auditLogs: AuditEntry[];
  budgets: EventBudget[];
  tasks: EventTask[];
  guests: EventGuest[];
};

const ISO_NOW = '2026-04-05T12:00:00.000Z';
const STORAGE_KEY = 'dousha_e2e_state';

function createToken(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const payload = btoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: 1924992000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${header}.${payload}.e2e-signature`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseBody(options: RequestInit) {
  if (!options.body || typeof options.body !== 'string') return {};
  try {
    return JSON.parse(options.body) as Record<string, any>;
  } catch {
    return {};
  }
}

function paginate<T>(items: T[], searchParams: URLSearchParams) {
  const limit = Number(searchParams.get('limit') || items.length || 1);
  const offset = Number(searchParams.get('offset') || 0);
  return {
    data: items.slice(offset, offset + limit),
    total: items.length,
  };
}

function readState(): E2EState {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    return JSON.parse(cached) as E2EState;
  }

  const users: User[] = [
    { id: 'user-admin-1', email: 'admin@test.com', full_name: 'Admin Dousha', role: 'admin', created_at: '2026-01-01T09:00:00.000Z' },
    { id: 'user-client-1', email: 'client@test.com', full_name: 'Client Demo', role: 'client', city: 'Tunis', created_at: '2026-01-04T10:00:00.000Z' },
    { id: 'user-provider-1', email: 'provider@test.com', full_name: 'Studio Amal', role: 'provider', city: 'Tunis', created_at: '2026-01-06T11:00:00.000Z' },
  ];

  const categories: Category[] = [
    { id: 'cat-photo', name: 'Photographie', description: 'Photos et video', slug: 'photographie', created_at: ISO_NOW },
    { id: 'cat-deco', name: 'Decoration', description: 'Decoration evenementielle', slug: 'decoration', created_at: ISO_NOW },
    { id: 'cat-catering', name: 'Traiteur', description: 'Restauration', slug: 'traiteur', created_at: ISO_NOW },
  ];

  const providers: Provider[] = [
    {
      id: 'provider-1',
      user_id: 'user-provider-1',
      business_name: 'Studio Amal',
      company_name: 'Studio Amal',
      description: 'Prestataire premium mariage',
      city: 'Tunis',
      rating: 4.8,
      review_count: 12,
      is_verified: true,
      created_at: ISO_NOW,
    },
  ];

  const services: ServiceItem[] = [
    {
      id: 'service-photo-1',
      title: 'Photographie Mariage',
      description: 'Couverture photo complete pour mariage.',
      base_price: 5000,
      price_type: 'package',
      provider_id: 'user-provider-1',
      category_id: 'cat-photo',
      images: ['https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80'],
      rating: 4.9,
      review_count: 8,
      is_featured: true,
      is_active: true,
      created_at: ISO_NOW,
      providers: { id: 'provider-1', city: 'Tunis', company_name: 'Studio Amal', business_name: 'Studio Amal', is_verified: true },
    },
    {
      id: 'service-deco-1',
      title: 'Decoration Florale',
      description: 'Decoration florale elegante pour mariages.',
      base_price: 3200,
      price_type: 'package',
      provider_id: 'user-provider-1',
      category_id: 'cat-deco',
      images: ['https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80'],
      rating: 4.7,
      review_count: 6,
      is_active: true,
      created_at: ISO_NOW,
      providers: { id: 'provider-1', city: 'Tunis', company_name: 'Studio Amal', business_name: 'Studio Amal', is_verified: true },
    },
  ];

  const events: Event[] = [
    {
      id: 'event-1',
      title: 'Mon Mariage',
      description: 'Mariage demo pour tests E2E',
      event_type: 'wedding',
      event_date: '2026-09-20',
      location: 'Tunis',
      venue_city: 'Tunis',
      venue_name: 'Salle Jasmine',
      budget: 50000,
      guest_count: 200,
      status: 'planning',
      client_id: 'user-client-1',
      created_at: ISO_NOW,
      event_budgets: [{ id: 'budget-1', amount: 15000 }],
      event_tasks: [{ id: 'task-1', is_completed: false }],
    },
  ];

  const bookings: Booking[] = [
    {
      id: 'booking-1',
      client_id: 'user-client-1',
      provider_id: 'user-provider-1',
      service_id: 'service-photo-1',
      event_id: 'event-1',
      booking_date: '2026-06-15',
      status: 'pending',
      amount: 5000,
      deposit_amount: 1500,
      balance_amount: 3500,
      platform_fee: 500,
      payment_status: 'pending',
      notes: 'Reservation de demo',
      created_at: ISO_NOW,
      updated_at: ISO_NOW,
      services: { id: 'service-photo-1', title: 'Photographie Mariage' },
      providers: { id: 'provider-1', company_name: 'Studio Amal', city: 'Tunis', business_name: 'Studio Amal' },
    },
    {
      id: 'booking-2',
      client_id: 'user-client-1',
      provider_id: 'user-provider-1',
      service_id: 'service-deco-1',
      event_id: 'event-1',
      booking_date: '2026-06-18',
      status: 'confirmed',
      amount: 3200,
      deposit_amount: 1000,
      balance_amount: 2200,
      platform_fee: 320,
      payment_status: 'deposit_paid',
      notes: 'Booking confirmee',
      created_at: ISO_NOW,
      updated_at: ISO_NOW,
      services: { id: 'service-deco-1', title: 'Decoration Florale' },
      providers: { id: 'provider-1', company_name: 'Studio Amal', city: 'Tunis', business_name: 'Studio Amal' },
    },
  ];

  const state: E2EState = {
    users,
    categories,
    providers,
    services,
    events,
    bookings,
    quotes: [
      {
        id: 'quote-1',
        client_id: 'user-client-1',
        provider_id: 'user-provider-1',
        service_id: 'service-deco-1',
        event_id: 'event-1',
        status: 'sent',
        total_amount: 8000,
        valid_until: '2026-09-10',
        notes: 'Nous serions ravis de decorer votre mariage',
        items: [{ id: 'quote-item-1', description: 'Decoration complete', quantity: 1, unit_price: 8000, total: 8000 }],
        created_at: ISO_NOW,
      },
    ],
    conversations: [
      {
        id: 'conversation-1',
        participant_ids: ['user-client-1', 'user-provider-1'],
        last_message_at: ISO_NOW,
        created_at: ISO_NOW,
        updated_at: ISO_NOW,
        recipient_name: 'Studio Amal',
        recipient_role: 'provider',
        unread_count: 0,
      },
    ],
    messages: [
      {
        id: 'message-1',
        conversation_id: 'conversation-1',
        sender_id: 'user-provider-1',
        content: 'Bonjour, nous avons bien recu votre demande.',
        created_at: ISO_NOW,
        sender: { id: 'user-provider-1', full_name: 'Studio Amal' },
      },
    ],
    reviews: [
      {
        id: 'review-1',
        service_id: 'service-photo-1',
        rating: 5,
        comment: 'Excellent service.',
        created_at: ISO_NOW,
        user_profiles: { full_name: 'Sarra Test' },
      },
    ],
    auditLogs: [
      {
        id: 'audit-1',
        action: 'booking_created',
        entity_type: 'booking',
        entity_id: 'booking-1',
        user_email: 'client@test.com',
        user_name: 'Client Demo',
        details: 'Reservation creee pour Photographie Mariage',
        created_at: ISO_NOW,
        severity: 'info',
      },
    ],
    budgets: [{ id: 'budget-1', event_id: 'event-1', category: 'Salle', estimated_cost: 15000, actual_cost: 12000 }],
    tasks: [{ id: 'task-1', event_id: 'event-1', title: 'Reserver le traiteur', status: 'pending' }],
    guests: [{ id: 'guest-1', event_id: 'event-1', full_name: 'Ali Mohamed', email: 'ali@example.com', status: 'invited', created_at: ISO_NOW, updated_at: ISO_NOW }],
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function writeState(state: E2EState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentUser(state: E2EState): User | null {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) return null;
  try {
    const parsed = JSON.parse(rawUser) as User;
    return state.users.find((user) => user.id === parsed.id) || parsed;
  } catch {
    return null;
  }
}

function persistUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('access_token', createToken(user));
}

function match(pathname: string, pattern: RegExp) {
  return pathname.match(pattern);
}

export async function handleE2ERequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const state = readState();
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(endpoint, 'http://localhost');
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  const body = parseBody(options);
  const currentUser = getCurrentUser(state);

  if (pathname === '/users/login' && method === 'POST') {
    if (body.password === 'mauvais_mot_de_passe') throw new Error("Identifiants invalides");
    let user = state.users.find((item) => item.email === body.email);
    if (!user && body.email) {
      user = {
        id: makeId('user'),
        email: body.email,
        full_name: body.email.split('@')[0],
        role: body.email.includes('admin') ? 'admin' : body.email.includes('provider') ? 'provider' : 'client',
        created_at: ISO_NOW,
      };
      state.users.unshift(user);
      writeState(state);
    }
    if (!user) throw new Error("Utilisateur introuvable");
    persistUser(user);
    return { access_token: createToken(user), user } as T;
  }

  if (pathname === '/users/register' && method === 'POST') {
    const user: User = {
      id: makeId('user'),
      email: body.email,
      full_name: body.full_name || 'Nouvel utilisateur',
      role: body.role === 'provider' ? 'provider' : 'client',
      created_at: ISO_NOW,
    };
    state.users.unshift(user);
    writeState(state);
    persistUser(user);
    return { access_token: createToken(user), user } as AuthResponse as T;
  }

  if (pathname === '/users/profile' && method === 'GET') {
    if (!currentUser) throw new Error('Unauthorized');
    return clone(currentUser) as T;
  }

  if (pathname === '/users' && method === 'GET') {
    return clone({ data: state.users, total: state.users.length }) as T;
  }

  const userIdMatch = match(pathname, /^\/users\/id\/([^/]+)$/);
  if (userIdMatch && method === 'PATCH') {
    const user = state.users.find((item) => item.id === userIdMatch[1]);
    if (user) Object.assign(user, body);
    writeState(state);
    return clone(user) as T;
  }
  if (userIdMatch && method === 'DELETE') {
    state.users = state.users.filter((item) => item.id !== userIdMatch[1]);
    writeState(state);
    return undefined as T;
  }

  if (pathname === '/categories' && method === 'GET') {
    return clone(state.categories) as T;
  }
  if (pathname === '/categories' && method === 'POST') {
    const category: Category = {
      id: makeId('cat'),
      name: body.name || body.title || 'Nouvelle categorie',
      description: body.description || '',
      slug: (body.name || body.title || 'nouvelle-categorie').toLowerCase().replace(/\s+/g, '-'),
      created_at: ISO_NOW,
    };
    state.categories.unshift(category);
    writeState(state);
    return clone(category) as T;
  }

  const categoryIdMatch = match(pathname, /^\/categories\/id\/([^/]+)$/);
  if (categoryIdMatch && method === 'PATCH') {
    const category = state.categories.find((item) => item.id === categoryIdMatch[1]);
    if (category) Object.assign(category, body);
    writeState(state);
    return clone(category) as T;
  }
  if (categoryIdMatch && method === 'DELETE') {
    state.categories = state.categories.filter((item) => item.id !== categoryIdMatch[1]);
    writeState(state);
    return undefined as T;
  }

  if (pathname === '/providers/stats' && method === 'GET') {
    return {
      total: state.providers.length,
      verified: state.providers.filter((item) => item.is_verified).length,
      unverified: state.providers.filter((item) => !item.is_verified).length,
      avg_rating: 4.8,
      total_services: state.services.length,
      total_users: state.users.length,
    } as T;
  }

  if (pathname === '/services' && method === 'GET') {
    return clone(state.services) as T;
  }
  if (pathname === '/services/my-services' && method === 'GET') {
    return clone(currentUser ? state.services.filter((item) => item.provider_id === currentUser.id) : []) as T;
  }
  if (pathname.startsWith('/services/category/') && method === 'GET') {
    const categoryId = pathname.split('/').pop();
    return clone(state.services.filter((item) => item.category_id === categoryId)) as T;
  }

  const serviceIdMatch = match(pathname, /^\/services\/id\/([^/]+)$/);
  if (serviceIdMatch && method === 'GET') {
    const service = state.services.find((item) => item.id === serviceIdMatch[1]);
    if (!service) throw new Error('Service introuvable');
    return clone(service) as T;
  }
  if (pathname === '/services' && method === 'POST') {
    const service: ServiceItem = {
      id: makeId('service'),
      title: body.title || 'Nouveau service',
      description: body.description || '',
      base_price: Number(body.base_price || body.price || 0),
      price_type: body.price_type || 'fixed',
      provider_id: currentUser?.id || 'user-provider-1',
      category_id: body.category_id || state.categories[0]?.id || 'cat-photo',
      is_active: body.is_active !== false,
      created_at: ISO_NOW,
      images: body.images || [],
      providers: { id: 'provider-1', city: 'Tunis', company_name: 'Studio Amal', business_name: 'Studio Amal', is_verified: true },
    };
    state.services.unshift(service);
    writeState(state);
    return clone(service) as T;
  }
  if (serviceIdMatch && method === 'PATCH') {
    const service = state.services.find((item) => item.id === serviceIdMatch[1]);
    if (service) Object.assign(service, body);
    writeState(state);
    return clone(service) as T;
  }
  if (serviceIdMatch && method === 'DELETE') {
    state.services = state.services.filter((item) => item.id !== serviceIdMatch[1]);
    writeState(state);
    return undefined as T;
  }

  if (pathname.startsWith('/reviews/service/') && method === 'GET') {
    const serviceId = pathname.split('/').pop();
    return clone(state.reviews.filter((item) => item.service_id === serviceId)) as T;
  }
  if (pathname === '/reviews' && method === 'POST') {
    const review = {
      id: makeId('review'),
      service_id: body.service_id,
      rating: Number(body.rating || 5),
      comment: body.comment || '',
      created_at: ISO_NOW,
      user_profiles: { full_name: currentUser?.full_name || 'Utilisateur' },
    };
    state.reviews.unshift(review);
    writeState(state);
    return clone(review) as T;
  }

  if (pathname === '/events' && method === 'GET') {
    return clone({ data: state.events, total: state.events.length }) as T;
  }
  if (pathname === '/events/my-events' && method === 'GET') {
    const mine = currentUser ? state.events.filter((item) => item.client_id === currentUser.id) : [];
    return clone(paginate(mine, searchParams)) as T;
  }
  if (pathname === '/events' && method === 'POST') {
    const event: Event = {
      id: makeId('event'),
      title: body.title || 'Nouvel evenement',
      description: body.description || '',
      event_type: body.event_type || 'wedding',
      event_date: body.event_date || '2026-09-20',
      location: body.venue_city || 'Tunis',
      venue_city: body.venue_city || 'Tunis',
      venue_name: body.venue_name || 'Salle Jasmine',
      budget: Number(body.budget || 0),
      guest_count: Number(body.guest_count || 0),
      status: 'planning',
      client_id: currentUser?.id || 'user-client-1',
      created_at: ISO_NOW,
      event_budgets: [],
      event_tasks: [],
    };
    state.events.unshift(event);
    writeState(state);
    return clone(event) as T;
  }
  if (pathname === '/events/stats' && method === 'GET') {
    return {
      total: state.events.length,
      by_status: { planning: state.events.filter((item) => item.status === 'planning').length },
      by_type: { wedding: state.events.filter((item) => item.event_type === 'wedding').length },
    } as T;
  }

  const eventIdMatch = match(pathname, /^\/events\/id\/([^/]+)$/);
  if (eventIdMatch && method === 'GET') {
    const event = state.events.find((item) => item.id === eventIdMatch[1]);
    if (!event) throw new Error('Evenement introuvable');
    return clone(event) as T;
  }
  if (eventIdMatch && method === 'DELETE') {
    state.events = state.events.filter((item) => item.id !== eventIdMatch[1]);
    writeState(state);
    return undefined as T;
  }

  const eventBudgetMatch = match(pathname, /^\/events\/id\/([^/]+)\/budget$/);
  if (eventBudgetMatch && method === 'GET') {
    return clone(state.budgets.filter((item) => item.event_id === eventBudgetMatch[1])) as T;
  }
  if (eventBudgetMatch && method === 'POST') {
    const budget = {
      id: makeId('budget'),
      event_id: eventBudgetMatch[1],
      category: body.category || 'Depense',
      estimated_cost: Number(body.estimated_cost || 0),
      actual_cost: Number(body.actual_cost || 0),
    };
    state.budgets.unshift(budget);
    writeState(state);
    return clone(budget) as T;
  }

  const eventTasksMatch = match(pathname, /^\/events\/id\/([^/]+)\/tasks$/);
  if (eventTasksMatch && method === 'GET') {
    return clone(state.tasks.filter((item) => item.event_id === eventTasksMatch[1])) as T;
  }
  if (eventTasksMatch && method === 'POST') {
    const task = { id: makeId('task'), event_id: eventTasksMatch[1], title: body.title || 'Nouvelle tache', status: 'pending' as const };
    state.tasks.unshift(task);
    writeState(state);
    return clone(task) as T;
  }
  const taskIdMatch = match(pathname, /^\/events\/tasks\/([^/]+)$/);
  if (taskIdMatch && method === 'PATCH') {
    const task = state.tasks.find((item) => item.id === taskIdMatch[1]);
    if (task) Object.assign(task, body);
    writeState(state);
    return clone(task) as T;
  }

  const eventGuestsMatch = match(pathname, /^\/events\/id\/([^/]+)\/guests$/);
  if (eventGuestsMatch && method === 'GET') {
    return clone(state.guests.filter((item) => item.event_id === eventGuestsMatch[1])) as T;
  }
  if (eventGuestsMatch && method === 'POST') {
    const guest: EventGuest = {
      id: makeId('guest'),
      event_id: eventGuestsMatch[1],
      full_name: body.full_name || 'Invite',
      email: body.email,
      status: body.status || 'invited',
      created_at: ISO_NOW,
      updated_at: ISO_NOW,
    };
    state.guests.unshift(guest);
    writeState(state);
    return clone(guest) as T;
  }
  const guestStatsMatch = match(pathname, /^\/events\/id\/([^/]+)\/guests\/stats$/);
  if (guestStatsMatch && method === 'GET') {
    const guests = state.guests.filter((item) => item.event_id === guestStatsMatch[1]);
    return {
      total: guests.length,
      invited: guests.filter((item) => item.status === 'invited').length,
      confirmed: guests.filter((item) => item.status === 'confirmed').length,
      declined: guests.filter((item) => item.status === 'declined').length,
    } as T;
  }
  if (pathname.endsWith('/timeline') && method === 'GET') {
    return [] as T;
  }

  if (pathname === '/bookings' && method === 'GET') {
    return clone({ data: state.bookings, total: state.bookings.length }) as T;
  }
  if (pathname === '/bookings/my-bookings' && method === 'GET') {
    const mine = currentUser ? state.bookings.filter((item) => item.client_id === currentUser.id) : [];
    return clone(paginate(mine, searchParams)) as T;
  }
  if (pathname.startsWith('/bookings/provider/') && method === 'GET') {
    const providerId = pathname.split('/').pop();
    const mine = state.bookings.filter((item) => item.provider_id === providerId);
    return clone(paginate(mine, searchParams)) as T;
  }
  if (pathname === '/bookings/admin/stats' && method === 'GET') {
    return {
      total_bookings: state.bookings.length,
      total_revenue: state.bookings.reduce((sum, item) => sum + item.amount, 0),
      pending: state.bookings.filter((item) => item.status === 'pending').length,
      confirmed: state.bookings.filter((item) => item.status === 'confirmed').length,
      completed: state.bookings.filter((item) => item.status === 'completed').length,
      cancelled: state.bookings.filter((item) => item.status === 'cancelled').length,
      monthly_revenue: [{ month: 'Apr', revenue: 8200 }],
    } as T;
  }
  if (pathname === '/bookings' && method === 'POST') {
    const booking: Booking = {
      id: makeId('booking'),
      client_id: currentUser?.id || 'user-client-1',
      provider_id: body.provider_id || 'user-provider-1',
      service_id: body.service_id,
      event_id: body.event_id || 'event-1',
      booking_date: body.booking_date,
      status: 'pending',
      amount: Number(body.amount || 0),
      deposit_amount: Number(body.deposit_amount || 0),
      balance_amount: Number(body.amount || 0),
      platform_fee: Number(body.amount || 0) * 0.1,
      payment_status: 'pending',
      notes: body.notes,
      created_at: ISO_NOW,
      updated_at: ISO_NOW,
      services: { id: body.service_id, title: state.services.find((item) => item.id === body.service_id)?.title || 'Service' },
      providers: { id: 'provider-1', company_name: 'Studio Amal', city: 'Tunis', business_name: 'Studio Amal' },
    };
    state.bookings.unshift(booking);
    state.auditLogs.unshift({
      id: makeId('audit'),
      action: 'booking_created',
      entity_type: 'booking',
      entity_id: booking.id,
      user_email: currentUser?.email,
      user_name: currentUser?.full_name,
      details: `Reservation creee pour ${booking.services?.title || 'service'}`,
      created_at: ISO_NOW,
      severity: 'info',
    });
    writeState(state);
    return clone(booking) as T;
  }

  const bookingIdMatch = match(pathname, /^\/bookings\/id\/([^/]+)$/);
  if (bookingIdMatch && method === 'GET') {
    const booking = state.bookings.find((item) => item.id === bookingIdMatch[1]);
    if (!booking) throw new Error('Booking introuvable');
    return clone(booking) as T;
  }
  const bookingStatusMatch = match(pathname, /^\/bookings\/id\/([^/]+)\/status$/);
  if (bookingStatusMatch && method === 'PATCH') {
    const booking = state.bookings.find((item) => item.id === bookingStatusMatch[1]);
    if (booking) {
      booking.status = body.status || booking.status;
      if (body.cancellation_reason) booking.cancellation_reason = body.cancellation_reason;
      booking.updated_at = ISO_NOW;
    }
    writeState(state);
    return clone(booking) as T;
  }

  if (pathname.startsWith('/payments/status/') && method === 'GET') {
    const bookingId = pathname.split('/').pop();
    const booking = state.bookings.find((item) => item.id === bookingId);
    return clone(booking) as T;
  }
  if (pathname.startsWith('/payments/create-intent/') && method === 'POST') {
    return { clientSecret: 'pi_mock_secret', paymentIntentId: 'pi_mock_123' } as T;
  }
  if (pathname.startsWith('/payments/confirm/') && method === 'POST') {
    const bookingId = pathname.split('/').pop();
    const booking = state.bookings.find((item) => item.id === bookingId);
    if (booking) {
      booking.payment_status = 'fully_paid';
      booking.status = booking.status === 'pending' ? 'confirmed' : booking.status;
      booking.balance_amount = 0;
      booking.updated_at = ISO_NOW;
    }
    writeState(state);
    return clone({ success: true }) as T;
  }

  if (pathname === '/quotes/my-quotes' && method === 'GET') {
    const mine = currentUser?.role === 'provider'
      ? state.quotes.filter((item) => item.provider_id === currentUser.id || item.provider_id === 'user-provider-1')
      : state.quotes.filter((item) => item.client_id === currentUser?.id);
    return clone(paginate(mine, searchParams)) as T;
  }
  if (pathname === '/quotes/request' && method === 'POST') {
    const quote: Quote = {
      id: makeId('quote'),
      client_id: currentUser?.id || 'user-client-1',
      provider_id: 'user-provider-1',
      event_id: body.event_id || 'event-1',
      service_id: 'service-deco-1',
      status: 'sent',
      total_amount: Number(body.max_budget || 8000),
      valid_until: '2026-09-10',
      notes: body.notes || body.description || '',
      items: [{ id: makeId('quote-item'), description: body.title || 'Demande devis', quantity: 1, unit_price: Number(body.max_budget || 8000), total: Number(body.max_budget || 8000) }],
      created_at: ISO_NOW,
    };
    state.quotes.unshift(quote);
    writeState(state);
    return clone(quote) as T;
  }
  if (pathname === '/quotes' && method === 'POST') {
    const quote: Quote = {
      id: makeId('quote'),
      client_id: 'user-client-1',
      provider_id: currentUser?.id || 'user-provider-1',
      service_id: 'service-deco-1',
      event_id: 'event-1',
      status: 'draft',
      total_amount: Number(body.total_amount || body.amount || 8000),
      valid_until: '2026-09-10',
      notes: body.notes || '',
      items: [{ id: makeId('quote-item'), description: 'Proposition', quantity: 1, unit_price: Number(body.total_amount || body.amount || 8000), total: Number(body.total_amount || body.amount || 8000) }],
      created_at: ISO_NOW,
    };
    state.quotes.unshift(quote);
    writeState(state);
    return clone(quote) as T;
  }
  const quoteStatusMatch = match(pathname, /^\/quotes\/id\/([^/]+)\/status$/);
  if (quoteStatusMatch && method === 'PATCH') {
    const quote = state.quotes.find((item) => item.id === quoteStatusMatch[1]);
    if (quote) quote.status = body.status || quote.status;
    writeState(state);
    return clone(quote) as T;
  }

  if (pathname === '/messages/conversations' && method === 'GET') {
    const conversations = state.conversations.map((conversation) => (
      currentUser?.role === 'client'
        ? { ...conversation, recipient_name: 'Studio Amal', recipient_role: 'provider' }
        : { ...conversation, recipient_name: 'Client Demo', recipient_role: 'client' }
    ));
    return clone(conversations) as T;
  }

  const conversationMessagesMatch = match(pathname, /^\/messages\/conversations\/id\/([^/]+)$/);
  if (conversationMessagesMatch && method === 'GET') {
    return clone(state.messages.filter((item) => item.conversation_id === conversationMessagesMatch[1])) as T;
  }

  if (pathname === '/messages' && method === 'POST') {
    const message: Message = {
      id: makeId('message'),
      conversation_id: body.conversation_id || 'conversation-1',
      sender_id: currentUser?.id || 'user-client-1',
      content: body.content || '',
      created_at: ISO_NOW,
      sender: { id: currentUser?.id || 'user-client-1', full_name: currentUser?.full_name || 'Utilisateur' },
    };

    if (!body.conversation_id && body.recipient_id) {
      const conversation: Conversation = {
        id: makeId('conversation'),
        participant_ids: [currentUser?.id || 'user-client-1', body.recipient_id],
        last_message_at: ISO_NOW,
        created_at: ISO_NOW,
        updated_at: ISO_NOW,
        recipient_name: body.recipient_id === 'user-provider-1' ? 'Studio Amal' : 'Client Demo',
      };
      state.conversations.unshift(conversation);
      message.conversation_id = conversation.id;
    }

    state.messages.push(message);
    writeState(state);
    return clone(message) as T;
  }

  if (pathname.endsWith('/read') && method === 'PATCH') {
    return undefined as T;
  }

  if (pathname === '/moderation/reports' && method === 'GET') {
    return clone([
      {
        id: 'report-1',
        reporter_id: 'user-client-1',
        reporter: { full_name: 'Client Demo', email: 'client@test.com' },
        reported_type: 'review',
        reported_id: 'review-1',
        reason: 'Contenu inapproprie',
        description: 'Avis signale pour moderation',
        evidence_urls: [],
        status: 'pending',
        created_at: ISO_NOW,
      },
    ]) as T;
  }

  if (pathname === '/moderation/kyc/pending' && method === 'GET') {
    return clone([
      {
        id: 'kyc-1',
        provider_id: 'provider-1',
        provider: { company_name: 'Studio Amal', user_id: 'user-provider-1' },
        document_type: 'business_license',
        document_url: 'https://example.com/license.pdf',
        document_name: 'license.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        status: 'pending',
        submitted_at: ISO_NOW,
      },
    ]) as T;
  }

  if (pathname === '/moderation/stats' && method === 'GET') {
    return {
      reports: { total: 1, pending: 1, resolved: 0 },
      kyc: { total: 1, pending: 1, approved: 0, rejected: 0 },
      enforcement: { banned: 0, suspended: 1 },
    } as T;
  }

  if (pathname === '/audit-logs' && method === 'GET') {
    return clone({ data: state.auditLogs }) as T;
  }

  if (pathname === '/providers/my-profile' && method === 'PATCH') {
    return clone(body) as T;
  }

  return undefined as T;
}
