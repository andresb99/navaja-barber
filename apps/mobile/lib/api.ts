import type { DocumentPickerAsset } from 'expo-document-picker';
import type {
  AccountAppointmentItemApi,
  AdminBarbershopPayload,
  AdminMembershipNotificationApi,
  AdminNotificationDigestItemApi,
  AdminNotificationsSummaryResponse,
  AdminPaymentNotificationApi,
  AdminTimeOffNotificationApi,
  AppAdminSubscriptionItemApi,
  BookingApiResponse,
  BookingPayload,
  CourseEnrollmentPayload,
  DirectJobPayload,
  MarketplaceSearchIntent,
  MarketplaceSearchMode,
  ModelRegistrationPayload,
  NetworkJobPayload,
  ReviewInvitePreviewResponse,
  SubscriptionCheckoutPayload,
  SubscriptionStatus,
  SubscriptionTier,
} from '@navaja/shared';
import type { MarketplaceShop } from './marketplace';
import { env } from './env';

export type { MarketplaceSearchMode } from '@navaja/shared';
export type { AccountAppointmentItemApi } from '@navaja/shared';
export type { AdminNotificationDigestItemApi } from '@navaja/shared';
export type { AdminTimeOffNotificationApi } from '@navaja/shared';
export type { AdminMembershipNotificationApi } from '@navaja/shared';
export type { AdminPaymentNotificationApi } from '@navaja/shared';
export type { AppAdminSubscriptionItemApi } from '@navaja/shared';

interface MarketplaceSearchResponse {
  items: MarketplaceShop[];
  mode: MarketplaceSearchMode;
}

interface MarketplaceViewportResponse {
  items: MarketplaceShop[];
}

interface AccountAppointmentsResponse {
  items: AccountAppointmentItemApi[];
}

interface AppAdminStatusResponse {
  is_platform_admin: boolean;
}

interface AppAdminSubscriptionsResponse {
  items: AppAdminSubscriptionItemApi[];
}

function getApiUrl(path: string) {
  if (!env.EXPO_PUBLIC_API_BASE_URL) {
    return null;
  }

  return `${env.EXPO_PUBLIC_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const DEFAULT_API_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new Error('La API demoro demasiado en responder.');
    }

    throw cause;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const rawMessage = await response.text();
    if (rawMessage) {
      try {
        const parsed = JSON.parse(rawMessage) as { message?: string };
        if (typeof parsed?.message === 'string' && parsed.message.trim()) {
          throw new Error(parsed.message.trim());
        }
      } catch (cause) {
        if (cause instanceof Error && cause.message.trim()) {
          throw cause;
        }
      }
    }

    throw new Error(rawMessage || 'La solicitud no se pudo completar.');
  }

  return (await response.json()) as T;
}

function appendCvFile(formData: FormData, file: DocumentPickerAsset) {
  formData.append('cv', {
    uri: file.uri,
    name: file.name || 'cv.pdf',
    type: file.mimeType || 'application/octet-stream',
  } as never);
}

export const hasExternalApi = Boolean(env.EXPO_PUBLIC_API_BASE_URL);

function appendQueryParam(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return;
  }

  params.set(key, normalized);
}

export async function searchMarketplaceShopsViaApi(options: {
  query?: string | null;
  intent?: MarketplaceSearchIntent;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  limit?: number;
  timeoutMs?: number;
}) {
  const baseUrl = getApiUrl('/api/shops/search');
  if (!baseUrl) {
    return null;
  }

  const params = new URLSearchParams();
  appendQueryParam(params, 'q', options.query);
  appendQueryParam(params, 'intent', options.intent);
  appendQueryParam(params, 'lat', options.latitude);
  appendQueryParam(params, 'lng', options.longitude);
  appendQueryParam(params, 'radiusKm', options.radiusKm);
  appendQueryParam(params, 'limit', options.limit);

  const response = await fetchWithTimeout(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
  }, options.timeoutMs);

  return parseResponse<MarketplaceSearchResponse>(response);
}

export async function listMarketplaceShopsInViewportViaApi(options: {
  north: number;
  south: number;
  east: number;
  west: number;
  limit?: number;
  timeoutMs?: number;
}) {
  const baseUrl = getApiUrl('/api/shops/viewport');
  if (!baseUrl) {
    return null;
  }

  const params = new URLSearchParams();
  appendQueryParam(params, 'north', options.north);
  appendQueryParam(params, 'south', options.south);
  appendQueryParam(params, 'east', options.east);
  appendQueryParam(params, 'west', options.west);
  appendQueryParam(params, 'limit', options.limit);

  const response = await fetchWithTimeout(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
  }, options.timeoutMs);

  return parseResponse<MarketplaceViewportResponse>(response);
}

export async function respondToInvitationViaApi(options: {
  accessToken: string;
  membershipId: string;
  decision: 'accept' | 'decline';
}) {
  const url = getApiUrl('/api/account/invitations/respond');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      membership_id: options.membershipId,
      decision: options.decision,
    }),
  });

  return parseResponse<{ success: boolean; membership_status: string; message: string }>(response);
}

export async function listAccountAppointmentsViaApi(options: { accessToken: string }) {
  const url = getApiUrl('/api/account/appointments');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
    },
  });

  return parseResponse<AccountAppointmentsResponse>(response);
}

export async function submitAccountAppointmentReviewViaApi(options: {
  accessToken: string;
  appointmentId: string;
  rating: number;
  comment?: string | null;
}) {
  const url = getApiUrl('/api/account/reviews');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      appointment_id: options.appointmentId,
      rating: options.rating,
      comment: options.comment ?? null,
    }),
  });

  return parseResponse<{ success: boolean; review_id: string }>(response);
}

export async function getReviewInvitePreviewViaApi(options: { signedToken: string }) {
  const baseUrl = getApiUrl('/api/review/preview');
  if (!baseUrl) {
    return null;
  }

  const params = new URLSearchParams();
  appendQueryParam(params, 'token', options.signedToken);

  const response = await fetchWithTimeout(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
  });

  return parseResponse<ReviewInvitePreviewResponse>(response);
}

export async function submitSignedReviewViaApi(options: {
  signedToken: string;
  rating: number;
  comment?: string | null;
}) {
  const url = getApiUrl('/api/review/submit');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      signed_token: options.signedToken,
      rating: options.rating,
      comment: options.comment ?? null,
    }),
  });

  return parseResponse<{
    reviewId: string;
    appointmentId: string;
    staffId: string;
    rating: number;
    comment: string | null;
    submittedAt: string;
    status: string;
  }>(response);
}

export async function submitBookingViaApi(payload: BookingPayload) {
  const url = getApiUrl('/api/bookings');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<BookingApiResponse>(response);
}

export async function updateWorkspaceAppointmentStatusViaApi(options: {
  accessToken: string;
  appointmentId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'done';
  priceCents?: number;
}) {
  const url = getApiUrl('/api/workspace/appointments/status');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      appointment_id: options.appointmentId,
      status: options.status,
      ...(typeof options.priceCents === 'number' ? { price_cents: options.priceCents } : {}),
    }),
  });

  return parseResponse<{
    success: boolean;
    appointment_id: string;
    shop_id: string;
    review_link: string | null;
  }>(response);
}

export async function submitModelRegistrationViaApi(payload: ModelRegistrationPayload) {
  const url = getApiUrl('/api/modelos/registro');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{
    marketplace_model_id: string | null;
    model_id: string | null;
    application_id: string | null;
  }>(response);
}

export async function submitDirectJobApplicationViaApi(
  payload: DirectJobPayload,
  file: DocumentPickerAsset,
) {
  const url = getApiUrl('/api/jobs/apply');
  if (!url) {
    return null;
  }

  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));
  appendCvFile(formData, file);

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    body: formData,
  }, 30000);

  return parseResponse<{ application_id: string }>(response);
}

export async function submitNetworkJobApplicationViaApi(
  payload: NetworkJobPayload,
  file: DocumentPickerAsset,
) {
  const url = getApiUrl('/api/jobs/network');
  if (!url) {
    return null;
  }

  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));
  appendCvFile(formData, file);

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    body: formData,
  }, 30000);

  return parseResponse<{ profile_id: string }>(response);
}

export async function createSubscriptionCheckoutViaApi(payload: SubscriptionCheckoutPayload) {
  const url = getApiUrl('/api/subscriptions/checkout');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${payload.accessToken}`,
    },
    body: JSON.stringify({
      shop_id: payload.shopId,
      target_plan: payload.targetPlan,
      billing_mode: payload.billingMode,
      return_to: payload.returnTo || null,
    }),
  });

  return parseResponse<{
    payment_intent_id: string;
    checkout_url: string;
    requires_payment: boolean;
  }>(response);
}

export async function createCourseEnrollmentViaApi(payload: CourseEnrollmentPayload) {
  const url = getApiUrl('/api/courses/enroll');
  if (!url) {
    return null;
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (payload.accessToken) {
    headers.authorization = `Bearer ${payload.accessToken}`;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: payload.sessionId,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      return_to: payload.returnTo || null,
    }),
  });

  return parseResponse<{
    enrollment_id?: string;
    requires_payment?: boolean;
    payment_intent_id?: string;
    checkout_url?: string;
  }>(response);
}

export async function updateAdminBarbershopViaApi(options: {
  accessToken: string;
  payload: AdminBarbershopPayload;
}) {
  const url = getApiUrl('/api/admin/barbershop');
  if (!url) {
    return null;
  }

  const formData = new FormData();
  formData.append('payload', JSON.stringify(options.payload));

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${options.accessToken}`,
      },
      body: formData,
    },
    30000,
  );

  return parseResponse<{
    shop_id: string;
    shop_slug: string;
    total_images: number;
    recommended_images: number;
  }>(response);
}

export async function getAdminNotificationsSummaryViaApi(options: {
  accessToken: string;
  shopId: string;
}) {
  const baseUrl = getApiUrl('/api/workspace/admin/notifications/summary');
  if (!baseUrl) {
    return null;
  }

  const params = new URLSearchParams();
  appendQueryParam(params, 'shop_id', options.shopId);

  const response = await fetchWithTimeout(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
    },
  });

  return parseResponse<AdminNotificationsSummaryResponse>(response);
}

export async function reviewAdminTimeOffViaApi(options: {
  accessToken: string;
  shopId: string;
  timeOffId: string;
  decision: 'approve' | 'reject';
}) {
  const url = getApiUrl('/api/workspace/admin/notifications/time-off');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      shop_id: options.shopId,
      time_off_id: options.timeOffId,
      decision: options.decision,
    }),
  });

  return parseResponse<{ success: boolean }>(response);
}

export async function getAppAdminStatusViaApi(options: { accessToken: string }) {
  const url = getApiUrl('/api/app-admin/status');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
    },
  });

  return parseResponse<AppAdminStatusResponse>(response);
}

export async function listAppAdminSubscriptionsViaApi(options: { accessToken: string }) {
  const url = getApiUrl('/api/app-admin/subscriptions');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
    },
  });

  return parseResponse<AppAdminSubscriptionsResponse>(response);
}

export async function updateAppAdminSubscriptionViaApi(options: {
  accessToken: string;
  shopId: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
}) {
  const url = getApiUrl('/api/app-admin/subscriptions');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      shop_id: options.shopId,
      plan: options.plan,
      status: options.status,
    }),
  });

  return parseResponse<{ success: boolean }>(response);
}

export async function listAdminServicesViaApi(options: {
  accessToken: string;
  shopId: string;
}) {
  const baseUrl = getApiUrl('/api/workspace/admin/services');
  if (!baseUrl) {
    return null;
  }

  const params = new URLSearchParams();
  appendQueryParam(params, 'shop_id', options.shopId);

  const response = await fetchWithTimeout(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
    },
  });

  return parseResponse<{
    items: Array<{
      id: string;
      name: string;
      price_cents: number;
      duration_minutes: number;
      is_active: boolean;
    }>;
  }>(response);
}

export async function createAdminServiceViaApi(options: {
  accessToken: string;
  payload: {
    id?: string | undefined;
    shop_id: string;
    name: string;
    price_cents: number;
    duration_minutes: number;
    is_active: boolean;
  };
}) {
  const url = getApiUrl('/api/workspace/admin/services');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify(options.payload),
  });

  return parseResponse<{ success: boolean }>(response);
}

export async function listAdminStaffResourcesViaApi(options: {
  accessToken: string;
  shopId: string;
}) {
  const baseUrl = getApiUrl('/api/workspace/admin/staff');
  if (!baseUrl) {
    return null;
  }

  const params = new URLSearchParams();
  appendQueryParam(params, 'shop_id', options.shopId);

  const response = await fetchWithTimeout(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
    },
  });

  return parseResponse<{
    staff: Array<{
      id: string;
      name: string;
      role: string;
      phone: string;
      is_active: boolean;
    }>;
    working_hours: Array<{
      id: string;
      staff_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      staff_name: string;
    }>;
    time_off: Array<{
      id: string;
      staff_id: string;
      start_at: string;
      end_at: string;
      reason: string;
      staff_name: string;
    }>;
  }>(response);
}

export async function createAdminStaffResourceViaApi(options: {
  accessToken: string;
  payload:
    | {
        action: 'staff';
        payload: {
          id?: string | undefined;
          shop_id: string;
          auth_user_id?: string | null | undefined;
          name: string;
          role: 'admin' | 'staff';
          phone: string;
          is_active: boolean;
        };
      }
    | {
        action: 'working_hours';
        payload: {
          id?: string | undefined;
          shop_id: string;
          staff_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
        };
      }
    | {
        action: 'time_off';
        payload: {
          id?: string | undefined;
          shop_id: string;
          staff_id: string;
          start_at: string;
          end_at: string;
          reason?: string | null | undefined;
        };
      };
}) {
  const url = getApiUrl('/api/workspace/admin/staff');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify(options.payload),
  });

  return parseResponse<{ success: boolean }>(response);
}

export async function listAdminCoursesViaApi(options: {
  accessToken: string;
  shopId: string;
}) {
  const baseUrl = getApiUrl('/api/workspace/admin/courses');
  if (!baseUrl) {
    return null;
  }

  const params = new URLSearchParams();
  appendQueryParam(params, 'shop_id', options.shopId);

  const response = await fetchWithTimeout(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
    },
  });

  return parseResponse<{
    courses: Array<{
      id: string;
      title: string;
      level: string;
      price_cents: number;
      duration_hours: number;
      is_active: boolean;
    }>;
    sessions: Array<{
      id: string;
      course_id: string;
      start_at: string;
      capacity: number;
      location: string;
      status: string;
    }>;
    enrollments: Array<{
      id: string;
      session_id: string;
      name: string;
      phone: string;
      email: string;
      status: string;
      created_at: string;
    }>;
  }>(response);
}

export async function createAdminCourseResourceViaApi(options: {
  accessToken: string;
  payload:
    | {
        action: 'course';
        payload: {
          id?: string | undefined;
          shop_id: string;
          title: string;
          description: string;
          price_cents: number;
          duration_hours: number;
          level: string;
          requires_model?: boolean;
          model_categories?: string[];
          is_active: boolean;
          image_url?: string | null | undefined;
        };
      }
    | {
        action: 'session';
        shop_id: string;
        payload: {
          id?: string | undefined;
          course_id: string;
          start_at: string;
          capacity: number;
          location: string;
          status: 'scheduled' | 'cancelled' | 'completed';
        };
      };
}) {
  const url = getApiUrl('/api/workspace/admin/courses');
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify(options.payload),
  });

  return parseResponse<{ success: boolean }>(response);
}
