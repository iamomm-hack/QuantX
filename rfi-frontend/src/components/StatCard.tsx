import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
}

export default function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{value}</span>
          {subtext && <span className="text-sm text-gray-500">{subtext}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
