import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface GrammarTrendData {
  week: string;
  errors: number;
}

interface GrammarTrendChartProps {
  data: GrammarTrendData[];
  height?: number;
  lineColor?: string;
}

export function GrammarTrendChart({ 
  data, 
  height = 300,
  lineColor = '#10B981' 
}: GrammarTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="errors" 
          stroke={lineColor} 
          strokeWidth={3} 
          dot={{ fill: lineColor, r: 4 }} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

