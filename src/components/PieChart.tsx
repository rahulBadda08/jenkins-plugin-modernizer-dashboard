import React from "react";
import ReactECharts from "echarts-for-react";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ECHARTS PIE CHART ENGINE
 * Specifically designed to fulfill the GSoC "Dashboards: filters by modernization 
 * topic" requirement by mathematically aggregating OpenRewrite tag dimensions.
 * Features central interactive display and glassmorphic styling.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface PieChartProperties {
  data: { name: string; value: number }[];
  title?: string;
  colors?: string[];
}

const PieChart: React.FC<PieChartProperties> = ({
  data,
  title,
  colors = ["#A78BFA", "#F472B6", "#60A5FA", "#34D399", "#FBBF24", "#00E5FF"]
}) => {
  const chartConfiguration = {
    backgroundColor: "transparent",
    title: {
      text: title,
      left: "center",
      textStyle: { fontSize: 16, fontWeight: 600, color: "#F3F4F6", fontFamily: 'Inter' },
    },
    tooltip: { 
      trigger: 'item', 
      backgroundColor: "rgba(17, 24, 39, 0.9)", 
      borderColor: "rgba(255,255,255,0.1)", 
      textStyle: { color: "#FFF", fontFamily: 'Inter' } 
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: { color: '#9CA3AF', fontFamily: 'Inter', fontSize: 13 }
    },
    series: [
      {
        name: 'Plugins Affected',
        type: 'pie',
        radius: ['55%', '85%'], // Hollow 'Donut' look is vastly more modern than flat pies
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: 'rgba(17, 24, 39, 1)', // Dark dashboard background slicing
          borderWidth: 3
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: {
            show: true,
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
            formatter: '{d}%' // Shows percentage dynamically in the center hole!
          },
          itemStyle: {
            shadowBlur: 15,
            shadowColor: 'rgba(167, 139, 250, 0.5)'
          }
        },
        labelLine: { show: false },
        data: data,
        color: colors
      }
    ]
  };

  return <ReactECharts option={chartConfiguration} style={{ height: "350px", width: "100%" }} />;
};

export default PieChart;
