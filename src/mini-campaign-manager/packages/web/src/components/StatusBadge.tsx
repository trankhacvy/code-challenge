const colors = {
  draft: "bg-gray-100 text-gray-700",
  sending: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = colors[status as keyof typeof colors] || colors.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
