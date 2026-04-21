import React, { useMemo, useRef, useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * JENKINS ECOSYSTEM BAR CHART
 * Implements high-fidelity animations, professional structured layouts, 
 * and referential stability for ecosystem data persistence.
 * ─────────────────────────────────────────────────────────────────────────────
 */
interface BarChartProperties {
  labels: string[];
  data: number[];
  benchmarkData?: number[]; // Global average for comparison
  insights?: string[];
  severities?: string[];
  colors?: string[];
  title?: string;
  rotateLabel?: number;
  yMax?: number;
  theme?: 'dark' | 'light';
  yFormatter?: (value: number) => string;
  onItemClick?: (name: string) => void;
}

const SEVERITY_COLORS = {
  danger: "#c92a2a",
  warning: "#e67e22",
  success: "#2b8a3e",
  info: "#1864ab",
  default: "#003056"
};

const BarChart: React.FC<BarChartProperties> = ({
  labels,
  data,
  benchmarkData,
  insights,
  severities,
  colors,
  title,
  rotateLabel,
  yMax,
  theme = 'dark',
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
    const mainBarData = data.map((val, idx) => {
      const severity = severities?.[idx];
      const mainColor = severity ? SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] : (colors?.[idx] || "#8B5CF6");
      return {
        value: val,
        itemStyle: {
          color: mainColor,
          borderRadius: [4, 4, 0, 0] // Professional slight radius
        }
      };
    });

    const standardBarData = benchmarkData ? benchmarkData.map((val) => ({
      value: val,
      itemStyle: {
        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        borderRadius: [10, 10, 10, 10]
      }
    })) : [];

    return {
      textStyle: { fontFamily: 'Inter, sans-serif' },
      title: {
        text: title,
        left: "center",
        textStyle: { 
          fontSize: isMobile ? 14 : 16, 
          fontWeight: 700, 
          color: theme === 'dark' ? "#F3F4F6" : "#0f172a", 
          fontFamily: 'Outfit, sans-serif' 
        },
      },
      /* ── BEYOND DECORATION: COMPARATIVE ENGINE ── */
      legend: benchmarkData ? {
        show: true,
        bottom: isMobile ? '35%' : '24%',
        textStyle: { color: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: 10 },
        data: ['Current Plugin', 'Ecosystem Standard']
      } : undefined,
      animationEasing: 'cubicOut',
      animationDuration: 1200,
      animationDurationUpdate: 800,
      animationDelay: (idx: number) => idx * 25,
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        textStyle: { color: theme === 'dark' ? '#fff' : '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: 13 },
        borderRadius: 12,
        padding: 16,
        backdropFilter: 'blur(12px)',
        formatter: (params: any) => {
          const mainSeries = params.find((p: any) => p.seriesName === 'Current Plugin') || params[0];
          const benchSeries = params.find((p: any) => p.seriesName === 'Ecosystem Standard');
          
          const insightText = insights?.[mainSeries.dataIndex];
          const insightHtml = insightText ? `<div style="margin-top: 10px; font-size: 11px; opacity: 0.7; border-top: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; padding-top: 10px; white-space: normal; line-height: 1.5; max-width: 240px;">${insightText}</div>` : '';
          
          const benchmarkHtml = benchSeries ? `
            <div style="display: flex; justify-content: space-between; gap: 20px; margin-top: 4px; font-family: 'JetBrains Mono', monospace; font-size: 10px;">
              <span style="opacity: 0.6;">ECOSYSTEM_STANDARD:</span>
              <span style="color: ${theme === 'dark' ? '#94a3b8' : '#475569'};">${(benchSeries.value * 100).toFixed(0)}% SUCCESS RATE</span>
            </div>
          ` : '';

          const statusText = mainSeries.value === 1 ? '<span style="color: #10B981;">ALIGNED</span>' : '<span style="color: #EF4444;">LEGACY / MISSING</span>';

          return `<div style="font-family: 'Inter', sans-serif;">
                    <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px;">${mainSeries.name}</div>
                    <div style="display: flex; justify-content: space-between; gap: 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px;">
                      <span style="opacity: 0.6;">PLUGIN_STATUS:</span>
                      <span style="font-weight: 700;">${statusText}</span>
                    </div>
                    ${benchmarkHtml}
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
          backgroundColor: theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          fillerColor: theme === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
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
          color: theme === 'dark' ? "#94a3b8" : "#475569",
          fontFamily: 'Inter, sans-serif',
          fontSize: isMobile ? 9 : 10,
          formatter: (value: string) => value.length > (isMobile ? 10 : 14) ? value.substring(0, (isMobile ? 10 : 14)) + '...' : value
        },
        axisLine: { lineStyle: { color: theme === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)" } },
        axisTick: { show: false }
      },
      yAxis: {
        type: "value",
        max: yMax,
        axisLabel: {
          color: theme === 'dark' ? "#94a3b8" : "#475569",
          fontFamily: 'Inter, sans-serif',
          fontSize: isMobile ? 9 : 10,
          formatter: yFormatter || (yMax === 1 ? (val: number) => `${(val * 100).toFixed(0)}%` : (val: number) => val.toLocaleString()),
        },
        splitLine: {
          lineStyle: { color: theme === 'dark' ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)", type: 'solid' },
        },
        axisLine: { show: false }
      },
      series: [
        {
          name: 'Ecosystem Standard',
          data: standardBarData,
          type: "bar",
          barWidth: '60%',
          silent: true,
          itemStyle: { opacity: 0.8 }
        },
        {
          name: 'Current Plugin',
          data: mainBarData,
          type: "bar",
          barWidth: '60%',
          barGap: '-100%',
          itemStyle: {
            borderRadius: [10, 10, 10, 10]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: theme === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"
            }
          }
        },
      ],
    };
  }, [labels, data, benchmarkData, colors, title, rotateLabel, yMax, isMobile, insights, severities, theme]);

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