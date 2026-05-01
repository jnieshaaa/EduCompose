import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export interface VocabularyComplexityData {
  level: string;
  value: number;
  color: string;
  [key: string]: unknown;
}

interface VocabularyComplexityChartProps {
  data: VocabularyComplexityData[];
  height?: number;
  outerRadius?: number;
}

export function VocabularyComplexityChart({
  data,
  height = 300,
  outerRadius = 100,
}: VocabularyComplexityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: {
            x?: number;
            y?: number;
            textAnchor?: string;
            level?: string;
            value?: number;
          }) => {
            if (!props.value || props.value === 0) return null;
            return (
              <text
                x={props.x}
                y={props.y}
                fill="#404040"
                className="text-[10px] font-bold uppercase tracking-tight"
                textAnchor={props.textAnchor as "inherit" | "end" | "start" | "middle" | undefined}
                dominantBaseline="central"
              >
                {`${props.level}: ${props.value}%`}
              </text>
            );
          }}
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
