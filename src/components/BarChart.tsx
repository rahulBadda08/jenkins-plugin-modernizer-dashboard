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
  insights?: string[];
  severities?: string[];
  colors?: string[];
  title?: string;
  rotateLabel?: number;
  yMax?: number;
  yFormatter?: (value: number) => string;
  onItemClick?: (name: string) => void;
}

const SEVERITY_COLORS = {
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#3B82F6",
  default: "#8B5CF6"
};

const BarChart: React.FC<BarChartProperties> = ({
  labels,
  data,
  insights,
  severities,
  colors,
  title,
  rotateLabel,
  yMax,
  yFormatter,
  onItemClick,
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

    // Inject semantic coloring for bars
    const barData = data.map((val, idx) => {
      const severity = severities?.[idx];
      const mainColor = severity ? SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] : (colors?.[idx] || "#8B5CF6");
      return {
        value: val,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: mainColor },
              { offset: 1, color: mainColor + '33' } // 20% opacity
            ]
          }
        }
      };
    });

    return {
      textStyle: { fontFamily: 'Inter, sans-serif' },
      title: {
        text: title,
        left: "center",
        textStyle: { fontSize: isMobile ? 14 : 16, fontWeight: 700, color: "#F3F4F6", fontFamily: 'Outfit, sans-serif' },
      },
      /* ── SMOOTH ANIMATION ENGINE ── */
      animationEasing: 'cubicOut',
      animationDuration: 1200,
      animationDurationUpdate: 800,
      animationDelay: (idx: number) => idx * 25,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 13 },
        borderRadius: 12,
        padding: 16,
        backdropFilter: 'blur(12px)',
        formatter: (params: any) => {
          const p = params[0];
          const insightText = insights?.[p.dataIndex];
          const insightHtml = insightText ? `<div style="margin-top: 10px; font-size: 11px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; white-space: normal; line-height: 1.5; max-width: 240px;">${insightText}</div>` : '';
          return `<div style="font-family: 'Inter', sans-serif;">
                    <div style="font-weight: 700;">${p.name}</div>
                    <div style="font-family: 'JetBrains Mono', monospace; margin-top: 4px; color: ${p.color};">${p.value} UNITS</div>
                    ${insightHtml}
                  </div>`;
        }
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
          fillerColor: "rgba(255, 255, 255, 0.1)",
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
          fontFamily: 'Inter, sans-serif',
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
          fontFamily: 'Inter, sans-serif',
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
          data: barData,
          type: "bar",
          barWidth: '60%',
          itemStyle: {
            borderRadius: [10, 10, 10, 10]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: "rgba(255, 255, 255, 0.2)"
            }
          }
        },
      ],
    };
  }, [labels, data, colors, title, rotateLabel, yMax, yFormatter, isMobile, insights, severities]);

  return (
    <ReactECharts
      option={chartConfiguration}
      style={{ height: isMobile ? 300 : 350, width: "100%" }}
      onEvents={{
        'click': (params: any) => {
          if (onItemClick) onItemClick(params.name);
        }
      }}
      notMerge={false}
      lazyUpdate={true}
    />
  );
};

export default React.memo(BarChart);