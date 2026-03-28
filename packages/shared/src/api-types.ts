/**
 * Shared API payload and response types used by the mobile and web apps.
 *
 * These are the *client-side* representations of API contracts. They define
 * what the frontend sends and what it expects to receive, independently of
 * the server implementation (which uses Zod schemas for validation).
 *
 * Platform-specific fetch mechanics (timeouts, FormData, file uploads) remain
 * in each app's API client — these types only describe the data shapes.
 */

import type { SubscriptionStatus } from './schemas';
import type { SubscriptionTier } from './subscriptions';

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export type BookingPayload = {
  shop_id: string;
  service_id: string;
  staff_id: string;
  start_at: string;
  source_channel?: 'WEB' | 'MOBILE' | undefined;
  pay_in_store?: boolean | undefined;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null | undefined;
  notes?: string | null | undefined;
};

export type ModelRegistrationPayload = {
  shop_id?: string | undefined;
  session_id?: string | undefined;
  full_name: string;
  phone: string;
  email?: string | null | undefined;
  instagram?: string | null | undefined;
  preferences: string[];
  consent_photos_videos: boolean;
  marketing_opt_in: boolean;
};

export type DirectJobPayload = {
  shop_id: string;
  name: string;
  phone: string;
  email: string;
  instagram?: string | null | undefined;
  experience_years: number;
  availability: string;
};

export type NetworkJobPayload = Omit<DirectJobPayload, 'shop_id'>;

export type SubscriptionCheckoutPayload = {
  accessToken: string;
  shopId: string;
  targetPlan: 'pro' | 'business';
  billingMode: 'monthly' | 'annual_installments';
  returnTo?: string;
};

export type CourseEnrollmentPayload = {
  sessionId: string;
  name: string;
  phone: string;
  email: string;
  accessToken?: string | undefined;
  returnTo?: string;
};

export type AdminBarbershopPayload = {
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  timezone: string;
  phone?: string | null | undefined;
  description?: string | null | undefined;
  location_label?: string | null | undefined;
  city?: string | null | undefined;
  region?: string | null | undefined;
  country_code?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
};

// ---------------------------------------------------------------------------
// Marketplace types
// ---------------------------------------------------------------------------

export type MarketplaceSearchIntent = 'smart' | 'name' | 'area';
export type MarketplaceSearchMode = 'all' | 'name' | 'area' | 'nearby';

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

export interface AccountAppointmentItemApi {
  id: string;
  shopId: string;
  customerId: string;
  staffId: string;
  startAt: string;
  status: string;
  paymentStatus?: string | null;
  serviceName: string;
  staffName: string;
  hasReview: boolean;
  reviewRating: number | null;
}

export interface ReviewInvitePreviewResponse {
  appointmentId: string;
  staffId: string;
  staffName: string;
  serviceName: string;
  appointmentStartAt: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Admin notification types
// ---------------------------------------------------------------------------

export interface AdminNotificationDigestItemApi {
  id: string;
  kind: 'time_off' | 'membership' | 'payment';
  targetId: string;
  title: string;
  detail: string;
  createdAt: string | null;
  isNew: boolean;
}

export interface AdminTimeOffNotificationApi {
  id: string;
  staffName: string;
  startAt: string;
  endAt: string;
  reason: string;
  createdAt: string;
}

export interface AdminMembershipNotificationApi {
  id: string;
  profileName: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export interface AdminPaymentNotificationApi {
  id: string;
  intentType: 'booking' | 'subscription' | 'course_enrollment';
  createdAt: string;
  customerName: string | null;
}

export interface AdminNotificationsSummaryResponse {
  pending_count: number;
  pending_time_off_count: number;
  pending_membership_count: number;
  stale_pending_intents: number;
  pending_time_off_requests: AdminTimeOffNotificationApi[];
  pending_membership_notifications: AdminMembershipNotificationApi[];
  pending_payment_notifications: AdminPaymentNotificationApi[];
  items: AdminNotificationDigestItemApi[];
}

// ---------------------------------------------------------------------------
// App admin types
// ---------------------------------------------------------------------------

export interface AppAdminSubscriptionItemApi {
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopStatus: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}
