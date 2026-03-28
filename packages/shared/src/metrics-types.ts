/**
 * Shared metric types for the analytics dashboard.
 *
 * These interfaces define the shape of computed metrics consumed by both web
 * and mobile admin dashboards. The actual data-fetching (Supabase queries)
 * remains platform-specific; these types only describe the output shapes.
 */

export type MetricRange = 'today' | 'last7' | 'month';
export type BookingMetricsChannelView = 'ALL' | 'ONLINE_ONLY' | 'WALK_INS_ONLY';

export interface DashboardMetrics {
  rangeLabel: string;
  countsByStatus: Record<string, number>;
  estimatedRevenueCents: number;
  revenuePerAvailableHourCents: number;
  averageTicketCents: number;
  topServices: Array<{ service: string; count: number }>;
  revenueByStaff: Array<{ staff_id: string; staff: string; revenue_cents: number }>;
  availableMinutes: number;
  bookedMinutes: number;
  occupancyRatio: number;
  statusSummary: {
    pendingAppointments: number;
    confirmedAppointments: number;
    doneAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    activeQueueAppointments: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
  };
  capacitySummary: {
    idleMinutes: number;
    utilizationGapRatio: number;
  };
  dailySeries: Array<{
    date: string;
    label: string;
    appointments: number;
    doneAppointments: number;
    revenueCents: number;
    onlineAppointments: number;
    walkInAppointments: number;
  }>;
  peakHours: Array<{
    hour: number;
    label: string;
    appointments: number;
  }>;
  channelMix: Array<{
    channel: string;
    label: string;
    appointments: number;
    doneAppointments: number;
    revenueCents: number;
    share: number;
  }>;
  channelBreakdown: {
    view: BookingMetricsChannelView;
    totalAppointments: number;
    onlineAppointments: number;
    walkInAppointments: number;
    filteredAppointments: number;
    onlineShare: number;
    walkInShare: number;
  };
}

export interface StaffPerformanceMetric {
  staffId: string;
  staffName: string;
  totalRevenueCents: number;
  completedAppointments: number;
  availableMinutes: number;
  bookedMinutes: number;
  serviceMinutes: number;
  revenuePerAvailableHourCents: number;
  occupancyRatio: number;
  staffCancellations: number;
  customerCancellations: number;
  adminCancellations: number;
  systemCancellations: number;
  totalCancellations: number;
  noShowAppointments: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatClientRate: number;
  reviewCount: number;
  averageRating: number;
  shopAverageRating: number;
  trustedRating: number;
  averageTicketCents: number;
  cancellationRate: number;
  health: 'top' | 'healthy' | 'attention';
  healthLabel: string;
  healthTone: 'success' | 'warning' | 'danger';
}

export interface StaffRatingTrendPoint {
  periodStart: string;
  averageRating: number;
  reviewCount: number;
}

export interface RecentStaffReview {
  id: string;
  rating: number;
  comment: string | null;
  submittedAt: string;
  customerName: string;
}

export interface StaffPerformanceDetail {
  rangeLabel: string;
  metric: StaffPerformanceMetric;
  ratingTrend: StaffRatingTrendPoint[];
  recentReviews: RecentStaffReview[];
  insights: string[];
}
