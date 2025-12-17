import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface SectionPerformanceData {
  section: string;
  avgScore: number;
}

interface SectionPerformanceChartProps {
  data: SectionPerformanceData[];
  height?: number;
  barColor?: string;
}

export function SectionPerformanceChart({ 
  data, 
  height = 300,
  barColor = '#0791B2' 
}: SectionPerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
        <XAxis dataKey="section" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="avgScore" fill={barColor} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

