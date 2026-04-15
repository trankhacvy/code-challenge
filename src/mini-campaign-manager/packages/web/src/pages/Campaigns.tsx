import { useState } from "react";
import { Link } from "react-router-dom";
import { useCampaigns } from "../api/hooks";
import { StatusBadge } from "../components/StatusBadge";

export function Campaigns() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useCampaigns(page);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link
          to="/campaigns/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          New Campaign
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-600">Failed to load campaigns</p>}

      {data && (
        <>
          {data.data.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No campaigns yet. Create your first one!</p>
          ) : (
            <div className="space-y-3">
              {data.data.map((c) => (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="block bg-white rounded-lg border p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-medium text-gray-900">{c.name}</h2>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm text-gray-500">{c.subject}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Created {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
