import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

interface PieChartProperties {
  data: { name: string; value: number; insight?: string; severity?: string }[];
  title?: string;
  colors?: string[];
  onItemClick?: (name: string) => void;
}

const SEVERITY_COLORS = {
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#3B82F6",
  default: "#8B5CF6"
};

const VIBRANT_INFO_PALETTE = [
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#3B82F6", // Blue
  "#EC4899", // Pink
];

const PieChart: React.FC<PieChartProperties> = ({
  data,
  title,
  colors: manualColors,
  onItemClick
}) => {
  const chartConfiguration = useMemo(() => {
    // Inject semantic coloring if severity is present
    const semanticData = data.map((item, idx) => {
      // V26.3: Prioritize passed itemStyle color for cross-tab synchronization
      const passedColor = (item as any).itemStyle?.color;
      if (passedColor) {
        return {
          ...item,
          itemStyle: { color: passedColor }
        };
      }

      let finalColor = manualColors?.[idx] || "#8B5CF6";

      if (item.severity === 'danger' || item.severity === 'warning' || item.severity === 'success') {
        finalColor = SEVERITY_COLORS[item.severity as keyof typeof SEVERITY_COLORS];
      } else {
        // Use vibrant palette for info/default/unknown topics
        finalColor = VIBRANT_INFO_PALETTE[idx % VIBRANT_INFO_PALETTE.length];
      }

      return {
        ...item,
        itemStyle: { color: finalColor }
      };
    });

    return {
      textStyle: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: "transparent",
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDuration: 2400,
      animationDurationUpdate: 1200,
      title: {
        text: title,
        left: "center",
        top: 10,
        textStyle: { fontSize: 18, fontWeight: 800, color: "#F3F4F6", fontFamily: 'Outfit, sans-serif', letterSpacing: 1 },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(255,255,255,0.1)",
        textStyle: { color: "#FFF", fontFamily: 'Inter, sans-serif', fontSize: 13 },
        borderRadius: 12,
        padding: 16,
        backdropFilter: 'blur(12px)',
        formatter: (params: any) => {
          const item = data[params.dataIndex];
          const insight = item.insight ? `<div style="margin-top: 8px; font-size: 11px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; white-space: normal; line-height: 1.4; max-width: 220px;">${item.insight}</div>` : '';
          return `<div style="font-family: 'Inter', sans-serif;">
                    <div style="font-weight: 700;">${params.name}</div>
                    <div style="font-family: 'JetBrains Mono', monospace; margin-top: 4px; color: #10B981;">${params.value} PLUGINS <span style="color: #64748b; font-size: 10px;">(${params.percent}%)</span></div>
                    ${insight}
                  </div>`;
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: '0%',
        left: 'center',
        textStyle: { color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 11 },
        icon: 'circle'
      },
      series: [
        {
          name: 'Diagnosis',
          type: 'pie',
          radius: ['25%', '70%'], // Enlarged radius
          center: ['50%', '50%'], // Perfectly centered for equal top and bottom padding
          roseType: 'area', // Implement Nightingale Rose Chart
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 12,
            borderColor: 'rgba(3, 7, 18, 1)',
            borderWidth: 4
          },
          label: { 
            show: true, 
            position: 'outside',
            formatter: '{name|{b}}\n{value|{d}%}',
            rich: {
              name: {
                fontFamily: 'Outfit, sans-serif',
                fontSize: 12,
                fontWeight: 700,
                color: '#F3F4F6',
                padding: [0, 0, 4, 0]
              },
              value: {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 13,
                fontWeight: 800,
                color: '#D4ED2C'
              }
            }
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 800,
            },
            itemStyle: {
              shadowBlur: 25,
              shadowColor: 'rgba(139, 92, 246, 0.4)'
            }
          },
          labelLine: { 
            show: true,
            length: 10,
            length2: 15,
            smooth: true,
            lineStyle: {
              color: 'rgba(255,255,255,0.4)',
              width: 1.5
            }
          },
          data: semanticData
        }
      ]
    };
  }, [data, title, manualColors]);

  return (
    <ReactECharts
      option={chartConfiguration}
      style={{ height: "450px", width: "100%" }}
      onEvents={{
        'click': (params: any) => {
          if (onItemClick) onItemClick(params.name);
        }
      }}
    />
  );
};

export default React.memo(PieChart);
