import React from "react";
import ReactECharts from "echarts-for-react";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ECHARTS CORE RENDERER (BarChart)
 * A highly reusable, glassmorphic data visualization wrapper for Apache ECharts.
 * Handles dimensional rendering, responsive styling, and automated UX scrollbars.
 * ─────────────────────────────────────────────────────────────────────────────
 */
interface BarChartProperties {
  labels: string[];
  data: number[];
  colors?: string[];
  title?: string;
  rotateLabel?: number;
  yMax?: number;
  yFormatter?: (value: number) => string;
}

const BarChart: React.FC<BarChartProperties> = ({
  labels,
  data,
  colors,
  title,
  rotateLabel,
  yMax,
  yFormatter,
}) => {
  const chartConfiguration = {
    title: {
      text: title,
      left: "center",
      textStyle: { fontSize: 15, fontWeight: 600, color: "#F3F4F6", fontFamily: 'Inter' },
    },
    animationEasing: 'cubicOut',
    animationDuration: 1500,
    animationDelay: (idx: number) => Math.min(idx * 25, 1000), // Cap first-load cascade so it doesn't run forever
    animationDurationUpdate: 200,   // Updates while scrolling are now ultra-fast!
    animationDelayUpdate: 0,        // Zero delay while scrolling left/right
    tooltip: { trigger: 'axis' },
    grid: {
      left: "5%",
      right: "5%",
      bottom: "25%",
      containLabel: true
    },
    dataZoom: labels.length > 20 ? [
      {
        type: 'slider',
        show: true,
        startValue: 0,
        endValue: 24,
        zoomLock: true,
        showDataShadow: false,
        showDetail: false,
        brushSelect: false,
        height: 8, // Soft thin profile to create optical rounding
        bottom: 8,
        borderColor: "rgba(167, 139, 250, 0.3)", // Faint glowing aura around the track
        backgroundColor: "rgba(0, 0, 0, 0.4)", // Deep track
        fillerColor: "rgba(167, 139, 250, 0.9)", // Solid glowing neon tube core
        handleIcon: "none", // completely smooth, no sharp handles
      },
      {
        type: 'inside',
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true
      }
    ] : undefined,
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        rotate: rotateLabel ?? 30,
        interval: 0,
        color: "#9CA3AF",
        fontFamily: 'Inter',
        fontSize: 11,
        formatter: (value: string) => value.length > 16 ? value.substring(0, 16) + '...' : value
      },
      axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } }
    },
    yAxis: {
      type: "value",
      max: yMax,
      axisLabel: {
        color: "#9CA3AF",
        fontFamily: 'Inter',
        formatter: yFormatter,
      },
      splitLine: {
        lineStyle: { color: "rgba(255, 255, 255, 0.05)", type: 'dashed' },
      },
    },
    series: [
      {
        data: data,
        type: "bar",
        itemStyle: {
          color: (barData: any) => {
            if (colors && colors.length === data.length) return colors[barData.dataIndex];
            if (colors && colors.length > 0) return colors[0];
            return "#3B82F6";
          },
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: "#A78BFA",
            shadowBlur: 10,
            shadowColor: "rgba(167, 139, 250, 0.5)"
          }
        }
      },
    ],
  };

  return (
    <ReactECharts
      option={chartConfiguration}
      style={{ height: 350, width: "100%" }}
    />
  );
};

export default BarChart;