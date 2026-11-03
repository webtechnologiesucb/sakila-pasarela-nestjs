export type Money = string | number;

export type UserRole = 'ADMIN' | 'STAFF' | 'VIEWER';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';
export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';
export type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export type FilmRating = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>;
}

export interface Country {
  country_id: number;
  country: string;
}

export interface City {
  city_id: number;
  city: string;
  country?: Country;
}

export interface Address {
  address_id: number;
  address: string;
  address2?: string | null;
  district: string;
  postal_code?: string | null;
  phone: string;
  city?: City;
}

export interface Customer {
  customer_id: number;
  store_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  address_id: number;
  active: boolean;
  create_date: string;
  last_update: string;
  address?: Address;
  store?: { store_id: number };
  orders?: Order[];
  _count?: { orders: number; rentals: number };
}

export interface Category {
  category_id: number;
  name: string;
  _count?: { film_categories: number };
}

export interface Actor {
  actor_id: number;
  first_name: string;
  last_name: string;
}

export interface Film {
  film_id: number;
  title: string;
  description?: string | null;
  release_year?: number | null;
  rental_duration: number;
  rental_rate: Money;
  length?: number | null;
  replacement_cost: Money;
  rating: FilmRating;
  special_features: string[];
  language?: { name: string };
  film_categories?: Array<{ category: Category }>;
  film_actors?: Array<{ actor: Actor }>;
  _count?: { inventories: number };
}

export interface OrderItem {
  id: string;
  order_id: string;
  film_id: number;
  quantity: number;
  unit_price: Money;
  subtotal: Money;
  film?: Pick<Film, 'film_id' | 'title' | 'description' | 'rental_rate'>;
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  provider?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface Refund {
  id: string;
  transaction_id: string;
  amount: Money;
  reason: string;
  status: RefundStatus;
  reference: string;
  response_code?: string | null;
  response_message?: string | null;
  created_at: string;
  updated_at: string;
  transaction?: PaymentTransaction;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  transaction_ref: string;
  idempotency_key: string;
  amount: Money;
  currency: string;
  payment_method_id: string;
  status: TransactionStatus;
  response_code?: string | null;
  response_message?: string | null;
  provider_reference?: string | null;
  payer_identifier?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  payment_method?: PaymentMethod;
  order?: Order;
  refunds?: Refund[];
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: number;
  status: OrderStatus;
  currency: string;
  subtotal: Money;
  tax: Money;
  total: Money;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Pick<Customer, 'customer_id' | 'first_name' | 'last_name' | 'email'>;
  order_items?: OrderItem[];
  payment_transactions?: PaymentTransaction[];
  _count?: { order_items: number; payment_transactions: number };
}

export interface TimelinePoint {
  date: string;
  total: Money;
  count: number;
}

export interface DashboardMetrics {
  orders: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
  };
  revenue: {
    total: Money;
    net: Money;
    transactions_count: number;
  };
  refunds: {
    total: Money;
    count: number;
  };
  catalog: {
    customers: number;
    films: number;
  };
  failed_payments: number;
  sales_timeline: TimelinePoint[];
  recent_transactions: PaymentTransaction[];
}

export interface SalesReport {
  summary: {
    total_amount: Money;
    average_amount: Money;
    transaction_count: number;
    by_method: Array<{ code: string; count: number; total_amount: Money }>;
    timeline: TimelinePoint[];
  };
  transactions: PaymentTransaction[];
}

export interface PaymentsReport {
  by_status: Array<{ status: TransactionStatus; count: number; total_amount: Money }>;
  by_method: Array<{
    method?: PaymentMethod;
    count: number;
    total_amount: Money;
  }>;
  methods: PaymentMethod[];
}

export interface RefundsReport {
  summary: {
    total_refunded: Money;
    count: number;
    by_status: Array<{ status: RefundStatus; count: number }>;
  };
  refunds: Refund[];
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  user?: Pick<User, 'id' | 'email' | 'name' | 'role'> | null;
}
