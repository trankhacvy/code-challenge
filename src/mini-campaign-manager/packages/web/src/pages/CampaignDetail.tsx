import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaign, useSendCampaign, useScheduleCampaign, useDeleteCampaign } from "../api/hooks";
import { extractApiError } from "../api/errors";
import { StatusBadge } from "../components/StatusBadge";
import { StatsBar } from "../components/StatsBar";

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading, error } = useCampaign(id!);
  const sendMutation = useSendCampaign(id!);
  const scheduleMutation = useScheduleCampaign(id!);
  const deleteMutation = useDeleteCampaign();
  const [scheduleDate, setScheduleDate] = useState("");
  const [actionError, setActionError] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error || !campaign) {
    return <p className="text-red-600">Failed to load campaign</p>;
  }

  const isDraft = campaign.status === "draft";
  const isSending = campaign.status === "sending";
  const stats = campaign.stats;

  const handleSend = async () => {
    if (!confirm("Send this campaign to all recipients?")) return;
    try {
      setActionError("");
      await sendMutation.mutateAsync();
    } catch (err) {
      setActionError(extractApiError(err, "Failed to send campaign"));
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return;
    try {
      setActionError("");
      await scheduleMutation.mutateAsync(new Date(scheduleDate).toISOString());
    } catch (err) {
      setActionError(extractApiError(err, "Failed to schedule campaign"));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync(campaign.id);
      navigate("/campaigns");
    } catch (err) {
      setActionError(extractApiError(err, "Failed to delete campaign"));
    }
  };

  return (
    <div>
      <button onClick={() => navigate("/campaigns")} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
        &larr; Back to campaigns
      </button>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-gray-500 mt-1">{campaign.subject}</p>
          </div>
          <StatusBadge status={campaign.status} />
        </div>

        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{campaign.body}</p>
        </div>

        <div className="text-xs text-gray-400 space-y-1">
          <p>Created: {new Date(campaign.createdAt).toLocaleString()}</p>
          {campaign.scheduledAt && <p>Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}</p>}
        </div>

        {isSending && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
            Sending in progress... This page will update automatically.
          </div>
        )}

        {actionError && (
          <p className="mt-4 text-red-600 text-sm">{actionError}</p>
        )}

        {isDraft && (
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {sendMutation.isPending ? "Sending..." : "Send Now"}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <button
                onClick={handleSchedule}
                disabled={!scheduleDate || scheduleMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Schedule
              </button>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 ml-auto"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="font-semibold mb-4">Campaign Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              <p className="text-xs text-gray-500">Sent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.opened}</p>
              <p className="text-xs text-gray-500">Opened</p>
            </div>
          </div>
          <div className="space-y-3">
            <StatsBar label="Send Rate" value={stats.sent} total={stats.total} color="bg-green-500" />
            <StatsBar label="Open Rate" value={stats.opened} total={stats.sent || 1} color="bg-blue-500" />
          </div>
        </div>
      )}

      {/* Recipient list */}
      {campaign.campaignRecipients?.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold mb-4">Recipients ({campaign.campaignRecipients.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Sent At</th>
                  <th className="pb-2 font-medium">Opened At</th>
                </tr>
              </thead>
              <tbody>
                {campaign.campaignRecipients.map((cr) => (
                  <tr key={cr.recipientId} className="border-b last:border-0">
                    <td className="py-2">{cr.Recipient?.email ?? "—"}</td>
                    <td className="py-2 text-gray-500">{cr.Recipient?.name ?? "—"}</td>
                    <td className="py-2"><StatusBadge status={cr.status} /></td>
                    <td className="py-2 text-gray-400">{cr.sentAt ? new Date(cr.sentAt).toLocaleString() : "—"}</td>
                    <td className="py-2 text-gray-400">{cr.openedAt ? new Date(cr.openedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
