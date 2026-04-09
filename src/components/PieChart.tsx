import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

interface PieChartProperties {
  data: { name: string; value: number }[];
  title?: string;
  colors?: string[];
}

const PieChart: React.FC<PieChartProperties> = ({
  data,
  title,
  colors = ["#8b5cf6", "#06b6d4", "#10b981", "#ef4444", "#f59e0b", "#6366f1"]
}) => {
  const chartConfiguration = useMemo(() => ({
    backgroundColor: "transparent",
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
      padding: 12,
      backdropFilter: 'blur(12px)'
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
        name: 'Plugins Affected',
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
        data: data,
        color: colors
      }
    ]
  }), [data, title, colors]);

  return <ReactECharts option={chartConfiguration} style={{ height: "400px", width: "100%" }} />;
};

export default React.memo(PieChart);
