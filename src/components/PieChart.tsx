import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

interface PieChartProperties {
  data: { name: string; value: number; insight?: string; severity?: string }[];
  title?: string;
  colors?: string[];
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
  colors: manualColors
}) => {
  const chartConfiguration = useMemo(() => {
    // Inject semantic coloring if severity is present
    const semanticData = data.map((item, idx) => {
      let finalColor = manualColors?.[idx] || "#8B5CF6";
      
      if (item.severity === 'danger' || item.severity === 'warning' || item.severity === 'success') {
        finalColor = SEVERITY_COLORS[item.severity as keyof typeof SEVERITY_COLORS];
      } else {
        // Use vibrant palette for info/default/unknown topics
        finalColor = VIBRANT_INFO_PALETTE[idx % VIBRANT_INFO_PALETTE.length];
      }

      return {
        name: item.name,
        value: item.value,
        insight: item.insight,
        itemStyle: { color: finalColor }
      };
    });

    return {
      backgroundColor: "transparent",
      animationEasing: 'cubicOut',
      animationDuration: 1200,
      animationDurationUpdate: 800,
      title: {
        text: title,
        left: "center",
        textStyle: { fontSize: 16, fontWeight: 700, color: "#F3F4F6", fontFamily: 'Outfit' },
      },
      tooltip: { 
        trigger: 'item', 
        backgroundColor: "rgba(15, 23, 42, 0.95)", 
        borderColor: "rgba(255,255,255,0.1)", 
        textStyle: { color: "#FFF", fontFamily: 'Inter', fontSize: 13 },
        borderRadius: 12,
        padding: 16,
        backdropFilter: 'blur(12px)',
        formatter: (params: any) => {
          const item = data[params.dataIndex];
          const insight = item.insight ? `<div style="margin-top: 8px; font-size: 11px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; white-space: normal; line-height: 1.4; max-width: 220px;">${item.insight}</div>` : '';
          return `<div style="font-weight: 700;">${params.name}</div>
                  <div style="font-family: 'JetBrains Mono'; margin-top: 4px; color: #10B981;">${params.value} PLUGINS <span style="color: #64748b; font-size: 10px;">(${params.percent}%)</span></div>
                  ${insight}`;
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: '0%',
        left: 'center',
        textStyle: { color: '#94a3b8', fontFamily: 'Inter', fontSize: 11 },
        icon: 'circle'
      },
      series: [
        {
          name: 'Diagnosis',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '48%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 12,
            borderColor: 'rgba(3, 7, 18, 1)', 
            borderWidth: 4
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: {
              show: true,
              fontSize: 22,
              fontWeight: 800,
              color: '#fff',
              fontFamily: 'Outfit',
              formatter: '{d}%' 
            },
            itemStyle: {
              shadowBlur: 25,
              shadowColor: 'rgba(139, 92, 246, 0.4)'
            }
          },
          labelLine: { show: false },
          data: semanticData
        }
      ]
    };
  }, [data, title, manualColors]);

  return <ReactECharts option={chartConfiguration} style={{ height: "400px", width: "100%" }} />;
};

export default React.memo(PieChart);
