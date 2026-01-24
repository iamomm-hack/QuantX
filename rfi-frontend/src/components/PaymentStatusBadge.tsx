import { Badge } from "@/components/ui/badge";

interface PaymentStatusBadgeProps {
  status: number; // 0: Active, 1: Paused, 2: Failed, 3: Cancelled
}

export default function PaymentStatusBadge({
  status,
}: PaymentStatusBadgeProps) {
  const styles = {
    0: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200", // Active
    1: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200", // Paused
    2: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200", // Failed
    3: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200", // Cancelled
  };

  const labels = {
    0: "Active",
    1: "Paused",
    2: "Failed",
    3: "Cancelled",
  };

  // @ts-ignore
  const className = styles[status] || "bg-gray-100 text-gray-700";
  // @ts-ignore
  const label = labels[status] || "Unknown";

  return (
    <Badge
      className={`${className} border px-2 py-0.5 uppercase text-[10px] font-bold tracking-wider shadow-none`}
    >
      {label}
    </Badge>
  );
}
