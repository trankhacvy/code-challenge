export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  body: string;
  status: "draft" | "sending" | "scheduled" | "sent";
  scheduledAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignWithStats extends Campaign {
  stats: CampaignStats;
  campaignRecipients: CampaignRecipientRow[];
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  open_rate: number;
  send_rate: number;
}

export interface CampaignRecipientRow {
  campaignId: number;
  recipientId: number;
  status: "pending" | "sent" | "failed";
  sentAt: string | null;
  openedAt: string | null;
  Recipient?: Recipient;
}

export interface Recipient {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
