import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import type {
  Campaign,
  CampaignWithStats,
  Recipient,
  ApiResponse,
  ApiListResponse,
} from "./types";

// Campaigns
export function useCampaigns(page = 1) {
  return useQuery({
    queryKey: ["campaigns", page],
    queryFn: () => api.get<ApiListResponse<Campaign>>(`/campaigns?page=${page}&limit=10`).then((r) => r.data),
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: () => api.get<ApiResponse<CampaignWithStats>>(`/campaigns/${id}`).then((r) => r.data.data),
    refetchInterval: (query) => {
      // Poll while sending
      const data = query.state.data;
      return data?.status === "sending" ? 2000 : false;
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; subject: string; body: string; recipientIds?: number[] }) =>
      api.post<ApiResponse<Campaign>>("/campaigns", data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<{ name: string; subject: string; body: string; recipientIds: number[] }>) =>
      api.patch<ApiResponse<Campaign>>(`/campaigns/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useScheduleCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduledAt: string) =>
      api.post<ApiResponse<Campaign>>(`/campaigns/${id}/schedule`, { scheduledAt }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useSendCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/campaigns/${id}/send`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

// Recipients
export function useRecipients() {
  return useQuery({
    queryKey: ["recipients"],
    queryFn: () => api.get<ApiResponse<Recipient[]>>("/recipients").then((r) => r.data.data),
  });
}

export function useCreateRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name?: string }) =>
      api.post<ApiResponse<Recipient>>("/recipients", data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipients"] }),
  });
}
