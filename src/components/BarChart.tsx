import React, { useMemo, useRef } from "react";
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
  // ── ECOSYSTEM PERSISTENCE ENGINE ──
  // We track the labels reference to detect when the user has filtered/searched.
  // We ONLY provide startValue on the first render for a given dataset.
  const prevLabelsRef = useRef<string[]>([]);
  
  const chartConfiguration = useMemo(() => {
    const isNewData = prevLabelsRef.current !== labels;
    prevLabelsRef.current = labels;

    return {
      title: {
        text: title,
        left: "center",
        textStyle: { fontSize: 16, fontWeight: 700, color: "#F3F4F6", fontFamily: 'Outfit' },
      },
      animationEasing: 'elasticOut',
      animationDuration: 2000,
      animationDelay: (idx: number) => idx * 10,
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#fff', fontFamily: 'Inter' },
        borderRadius: 12,
        padding: 12,
        backdropFilter: 'blur(12px)'
      },
      grid: {
        left: "4%",
        right: "4%",
        bottom: "28%",
        top: "15%",
        containLabel: true
      },
      dataZoom: labels.length > 15 ? [
        {
          type: 'slider',
          show: true,
          // CRITICAL: Only set initial values on a new dataset.
          ...(isNewData ? {
            startValue: 0,
            endValue: 14, // 15 bars visible per scroll (0 to 14)
          } : {}),
          zoomLock: true, // Disables ranging/expanding entirely
          height: 12,    // Slender scrollbar height
          bottom: 25,
          borderColor: "transparent",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          fillerColor: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#6A89E6' }, 
              { offset: 0.5, color: '#8E5FE2' }, 
              { offset: 1, color: '#D83D92' }
            ]
          },
          // Standard scrollbar behavior: no handles, no detail popups
          handleSize: 0, 
          showDetail: false,
          showDataShadow: false,
          brushSelect: false,
          moveOnMouseMove: true,
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
          color: "#94a3b8",
          fontFamily: 'Inter',
          fontSize: 10,
          formatter: (value: string) => value.length > 14 ? value.substring(0, 14) + '...' : value
        },
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.08)" } },
        axisTick: { show: false }
      },
      yAxis: {
        type: "value",
        max: yMax,
        axisLabel: {
          color: "#94a3b8",
          fontFamily: 'Inter',
          fontSize: 10,
          formatter: yFormatter,
        },
        splitLine: {
          lineStyle: { color: "rgba(255, 255, 255, 0.03)", type: 'solid' },
        },
        axisLine: { show: false }
      },
      series: [
        {
          data: data,
          type: "bar",
          barWidth: '60%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(139, 92, 246, 0.8)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0.2)' }
              ]
            },
            borderRadius: [10, 10, 10, 10]
          },
          emphasis: {
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(6, 182, 212, 1)' },
                  { offset: 1, color: 'rgba(6, 182, 212, 0.4)' }
                ]
              },
              shadowBlur: 20,
              shadowColor: "rgba(6, 182, 212, 0.5)"
            }
          }
        },
      ],
    };
  }, [labels, data, colors, title, rotateLabel, yMax, yFormatter]);

  return (
    <ReactECharts
      option={chartConfiguration}
      style={{ height: 350, width: "100%" }}
      notMerge={false}
      lazyUpdate={true}
    />
  );
};

export default React.memo(BarChart);