import type {
  ArtistStatus,
  BookingStatus,
  ClientType,
  CommissionType,
  EnquirySource,
  EnquiryStatus,
  EventType,
  LostReason,
  Priority,
  TaskStatus,
} from "@/generated/prisma/enums";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  WEDDING: "Wedding",
  CORPORATE: "Corporate event",
  COLLEGE_FESTIVAL: "College festival",
  PRIVATE_PARTY: "Private party",
  CONCERT: "Concert",
  CULTURAL: "Cultural programme",
  FESTIVAL: "Festival",
  BRAND_ACTIVATION: "Brand activation",
  OTHER: "Other",
};

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTATION_SENT: "Quotation sent",
  NEGOTIATION: "Negotiation",
  CONFIRMED: "Confirmed",
  LOST: "Lost",
  CANCELLED: "Cancelled",
};

export const ENQUIRY_SOURCE_LABELS: Record<EnquirySource, string> = {
  BOOKING_FORM: "Booking form",
  ARTIST_PROFILE: "Artist profile",
  SERVICE_PAGE: "Service page",
  CONTACT_PAGE: "Contact page",
  ADMIN_MANUAL: "Added by staff",
  PHONE: "Phone",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  REFERRAL: "Referral",
  SOCIAL: "Social media",
  OTHER: "Other",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  BUDGET: "Budget mismatch",
  ARTIST_UNAVAILABLE: "Artist unavailable",
  DATE_CHANGED: "Date changed",
  CHOSE_COMPETITOR: "Chose another agency",
  NO_RESPONSE: "No response",
  EVENT_CANCELLED: "Event cancelled",
  NOT_A_FIT: "Not a fit",
  SPAM: "Spam",
  OTHER: "Other",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  ENQUIRY: "Enquiry",
  QUOTATION: "Quotation",
  NEGOTIATION: "Negotiation",
  CONFIRMED: "Confirmed",
  ADVANCE_RECEIVED: "Advance received",
  ARTIST_CONFIRMED: "Artist confirmed",
  UPCOMING: "Upcoming",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const ARTIST_STATUS_LABELS: Record<ArtistStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_HOLD: "On hold",
  ARCHIVED: "Archived",
};

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  INDIVIDUAL: "Individual",
  CORPORATE: "Corporate",
  COLLEGE: "College",
  EVENT_PLANNER: "Event planner",
  AGENCY: "Agency",
  VENUE: "Venue",
  OTHER: "Other",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  PERCENTAGE: "Percentage of fee",
  FIXED: "Fixed amount",
};

/** Budget ranges offered on the public enquiry form (rupees). `max: null` = open-ended. */
export const BUDGET_RANGES = [
  { id: "under-50k", label: "Under ₹50,000", filterLabel: "Up to ₹50,000", min: 0, max: 50_000 },
  { id: "50k-1l", label: "₹50,000 – ₹1 lakh", filterLabel: "Up to ₹1 lakh", min: 50_000, max: 100_000 },
  { id: "1l-3l", label: "₹1 – 3 lakh", filterLabel: "Up to ₹3 lakh", min: 100_000, max: 300_000 },
  { id: "3l-5l", label: "₹3 – 5 lakh", filterLabel: "Up to ₹5 lakh", min: 300_000, max: 500_000 },
  { id: "5l-10l", label: "₹5 – 10 lakh", filterLabel: "Up to ₹10 lakh", min: 500_000, max: 1_000_000 },
  { id: "10l-25l", label: "₹10 – 25 lakh", filterLabel: "Up to ₹25 lakh", min: 1_000_000, max: 2_500_000 },
  { id: "25l-plus", label: "₹25 lakh +", filterLabel: "Any published price", min: 2_500_000, max: null },
] as const;

export type BudgetRangeId = (typeof BUDGET_RANGES)[number]["id"];

export const AUDIENCE_SIZES = [
  { id: "lt-50", label: "Under 50", value: 50 },
  { id: "50-150", label: "50 – 150", value: 150 },
  { id: "150-500", label: "150 – 500", value: 500 },
  { id: "500-1500", label: "500 – 1,500", value: 1500 },
  { id: "1500-5000", label: "1,500 – 5,000", value: 5000 },
  { id: "5000-plus", label: "5,000 +", value: 10000 },
] as const;
