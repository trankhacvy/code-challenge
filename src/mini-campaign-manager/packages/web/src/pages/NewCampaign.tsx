import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCampaign, useRecipients } from "../api/hooks";
import { extractApiError } from "../api/errors";

export function NewCampaign() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const createMutation = useCreateCampaign();
  const { data: recipients, isLoading: loadingRecipients } = useRecipients();

  const toggleRecipient = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const campaign = await createMutation.mutateAsync({
        name,
        subject,
        body,
        recipientIds: selectedIds.length > 0 ? selectedIds : undefined,
      });
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(extractApiError(err, "Failed to create campaign"));
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Campaign</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Spring Sale"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Don't miss our sale!"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your email content..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
          {loadingRecipients ? (
            <p className="text-sm text-gray-400">Loading recipients...</p>
          ) : recipients?.length ? (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {recipients.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggleRecipient(r.id)}
                    className="rounded"
                  />
                  <span>{r.email}</span>
                  {r.name && <span className="text-gray-400">({r.name})</span>}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No recipients. Create some first via the API.</p>
          )}
          <p className="text-xs text-gray-400 mt-1">{selectedIds.length} selected</p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Campaign"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/campaigns")}
            className="px-4 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
