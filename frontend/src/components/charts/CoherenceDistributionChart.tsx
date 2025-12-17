import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface CoherenceDistributionData {
  range: string;
  count: number;
}

interface CoherenceDistributionChartProps {
  data: CoherenceDistributionData[];
  height?: number;
  barColor?: string;
}

export function CoherenceDistributionChart({ 
  data, 
  height = 300,
  barColor = '#38BDF8' 
}: CoherenceDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
        <XAxis dataKey="range" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill={barColor} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

