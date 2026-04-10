import React, { useMemo, useRef, useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CINEMATIC BAR CHART COMPONENT
 * Implements high-fidelity animations, custom gradient scrollbars, and
 * referential stability for ecosystem data persistence.
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
  const prevLabelsRef = useRef<string[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Monitor viewport changes for responsive chart scaling
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const chartConfiguration = useMemo(() => {
    // We track the labels reference to detect when the user has filtered/searched.
    // We ONLY provide startValue on the first render for a given dataset.
    const isNewData = prevLabelsRef.current !== labels;
    prevLabelsRef.current = labels;

    return {
      title: {
        text: title,
        left: "center",
        textStyle: { fontSize: isMobile ? 14 : 16, fontWeight: 700, color: "#F3F4F6", fontFamily: 'Outfit' },
      },
      /* ── SMOOTH ANIMATION ENGINE ── */
      animationEasing: 'cubicOut',
      animationDuration: 1200,
      animationDurationUpdate: 800,
      animationDelay: (idx: number) => idx * 25,
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
        bottom: isMobile ? "38%" : "28%",
        top: "15%",
        containLabel: true
      },
      dataZoom: labels.length > 15 ? [
        {
          type: 'slider',
          show: true,
          ...(isNewData ? {
            startValue: 0,
            endValue: 14, // 15 bars visible per scroll
          } : {}),
          zoomLock: true,
          height: 12,
          bottom: isMobile ? 10 : 25,
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
          rotate: isMobile ? 45 : (rotateLabel ?? 30),
          interval: 0,
          color: "#94a3b8",
          fontFamily: 'Inter',
          fontSize: isMobile ? 9 : 10,
          formatter: (value: string) => value.length > (isMobile ? 10 : 14) ? value.substring(0, (isMobile ? 10 : 14)) + '...' : value
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
          fontSize: isMobile ? 9 : 10,
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
  }, [labels, data, colors, title, rotateLabel, yMax, yFormatter, isMobile]);

  return (
    <ReactECharts
      option={chartConfiguration}
      style={{ height: isMobile ? 300 : 350, width: "100%" }}
      notMerge={false}
      lazyUpdate={true}
    />
  );
};

export default React.memo(BarChart);