import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Shared color palette
// ---------------------------------------------------------------------------

export const CHART_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  lime: '#84CC16',
  palette: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
};

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const TICK_STYLE = { fontSize: 12, fill: '#6B7280' };

const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  border: '1px solid #E5E7EB',
  fontSize: 12,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineDescriptor {
  key: string;
  color: string;
  label: string;
}

interface BarDescriptor {
  key: string;
  color: string;
  label: string;
}

interface DonutDataItem {
  name: string;
  value: number;
  color?: string;
}

// ---------------------------------------------------------------------------
// ReportLineChart
// ---------------------------------------------------------------------------

interface ReportLineChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  lines: LineDescriptor[];
  height?: number;
  formatY?: (value: number) => string;
  formatTooltip?: (value: number) => string;
}

export const ReportLineChart: React.FC<ReportLineChartProps> = ({
  data,
  xKey,
  lines,
  height = 300,
  formatY,
  formatTooltip,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis dataKey={xKey} tick={TICK_STYLE} />
      <YAxis tick={TICK_STYLE} tickFormatter={formatY} width={80} />
      <Tooltip
        formatter={formatTooltip ? (value: number) => formatTooltip(value) : undefined}
        contentStyle={TOOLTIP_CONTENT_STYLE}
      />
      {lines.map((line) => (
        <Line
          key={line.key}
          type="monotone"
          dataKey={line.key}
          stroke={line.color}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          name={line.label}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

// ---------------------------------------------------------------------------
// ReportBarChart
// ---------------------------------------------------------------------------

interface ReportBarChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  bars: BarDescriptor[];
  height?: number;
  formatY?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  layout?: 'vertical' | 'horizontal';
}

export const ReportBarChart: React.FC<ReportBarChartProps> = ({
  data,
  xKey,
  bars,
  height = 300,
  formatY,
  formatTooltip,
  layout = 'horizontal',
}) => {
  const isVertical = layout === 'vertical';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        {isVertical ? (
          <>
            <XAxis type="number" tick={TICK_STYLE} tickFormatter={formatY} />
            <YAxis type="category" dataKey={xKey} tick={TICK_STYLE} width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={TICK_STYLE} />
            <YAxis tick={TICK_STYLE} tickFormatter={formatY} width={80} />
          </>
        )}
        <Tooltip
          formatter={formatTooltip ? (value: number) => formatTooltip(value) : undefined}
          contentStyle={TOOLTIP_CONTENT_STYLE}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
            name={bar.label}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// ---------------------------------------------------------------------------
// ReportDonutChart
// ---------------------------------------------------------------------------

interface ReportDonutChartProps {
  data: DonutDataItem[];
  height?: number;
  formatValue?: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
}

export const ReportDonutChart: React.FC<ReportDonutChartProps> = ({
  data,
  height = 250,
  formatValue,
  centerLabel,
  centerValue,
}) => {
  const showCenter = centerLabel || centerValue;

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="55%" outerRadius="80%" paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={formatValue ? (value: number) => formatValue(value) : undefined}
            contentStyle={TOOLTIP_CONTENT_STYLE}
          />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      {showCenter && (
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {centerValue && (
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{centerValue}</div>
          )}
          {centerLabel && (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{centerLabel}</div>
          )}
        </div>
      )}
    </div>
  );
};
