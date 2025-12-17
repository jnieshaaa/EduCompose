import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export interface VocabularyComplexityData {
  level: string;
  value: number;
  color: string;
  [key: string]: any;
}

interface VocabularyComplexityChartProps {
  data: VocabularyComplexityData[];
  height?: number;
  outerRadius?: number;
}

export function VocabularyComplexityChart({ 
  data, 
  height = 300,
  outerRadius = 100 
}: VocabularyComplexityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: any) => (
            <text 
              x={props.x} 
              y={props.y} 
              fill="#000" 
              textAnchor={props.textAnchor} 
              dominantBaseline="central"
            >
              {`${props.level}: ${props.value}%`}
            </text>
          )}
          outerRadius={outerRadius}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

