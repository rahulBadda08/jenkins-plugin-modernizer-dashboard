import React, { useMemo, useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { escapeHtml } from "../domain/security";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * JENKINS ECOSYSTEM BAR CHART
 * Implements high-fidelity animations, professional structured layouts, 
 * accessible screen-reader fallbacks, and referential stability.
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
  tooltipMode?: 'status' | 'metric' | 'drift';
  onItemClick?: (name: string) => void;
}

interface BarChartTooltipItem {
  seriesName?: string;
  name?: string;
  value?: number;
  dataIndex?: number;
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
  tooltipMode,
  onItemClick,
}) => {
  // ── ECOSYSTEM PERSISTENCE ENGINE ──
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Monitor viewport changes for responsive chart scaling
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const chartConfiguration = useMemo(() => {
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
        top: 0,
        textStyle: { 
          fontSize: isMobile ? 12 : 14, 
          fontWeight: 700, 
          color: theme === 'dark' ? "#F3F4F6" : "#0f172a", 
          letterSpacing: '-0.3px'
        }
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: theme === 'dark' ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderColor: theme === 'dark' ? "#374151" : "#E5E7EB",
        borderRadius: 8,
        textStyle: { color: theme === 'dark' ? "#F3F4F6" : "#1F2937", fontSize: 12 },
        formatter: (params: unknown) => {
          const items = params as BarChartTooltipItem[];
          if (!items || !items.length) return "";
          const target = items.find(i => i.seriesName === "Current Plugin") || items[0];
          const rawName = target.name || "";
          const val = target.value ?? 0;
          const displayVal = yFormatter ? yFormatter(val) : val;
          const idx = target.dataIndex ?? -1;
          const insight = insights?.[idx];

          let html = `<div style="font-weight: 700; margin-bottom: 4px; font-size: 13px;">${escapeHtml(rawName)}</div>`;
          
          if (tooltipMode === 'status') {
            const statusColor = val >= 80 ? '#10B981' : val >= 50 ? '#F59E0B' : '#EF4444';
            html += `<div style="display:flex; align-items:center; gap: 6px; margin-bottom: 4px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${statusColor};"></span>
              <span>Health Score: <strong>${escapeHtml(String(displayVal))}</strong></span>
            </div>`;
          } else if (tooltipMode === 'drift') {
            html += `<div style="margin-bottom: 4px;">Baseline Drift: <strong>${escapeHtml(String(displayVal))}</strong> minor releases</div>`;
          } else {
            html += `<div style="margin-bottom: 4px;">Value: <strong>${escapeHtml(String(displayVal))}</strong></div>`;
          }

          if (insight) {
            html += `<div style="font-size: 11px; opacity: 0.8; max-width: 200px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px; margin-top: 4px;">${escapeHtml(insight)}</div>`;
          }
          return html;
        }
      },
      grid: {
        left: "4%",
        right: "4%",
        bottom: rotateLabel ? (isMobile ? "25%" : "18%") : (isMobile ? "15%" : "12%"),
        top: title ? "20%" : "12%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: {
          rotate: rotateLabel || (isMobile ? 45 : 0),
          interval: 0,
          color: theme === 'dark' ? "#9CA3AF" : "#6B7280",
          fontSize: isMobile ? 9 : 11,
          formatter: (value: string) => {
            const clean = value.replace(/-/g, ' ');
            if (isMobile && clean.length > 8) return clean.slice(0, 7) + "…";
            return clean.length > 15 ? clean.slice(0, 13) + "…" : clean;
          }
        },
        axisLine: { lineStyle: { color: theme === 'dark' ? "#374151" : "#E5E7EB" } },
        axisTick: { show: false }
      },
      yAxis: {
        type: "value",
        max: yMax,
        axisLabel: {
          formatter: (val: number) => yFormatter ? yFormatter(val) : `${val}`,
          color: theme === 'dark' ? "#9CA3AF" : "#6B7280",
          fontSize: isMobile ? 10 : 11,
        },
        splitLine: {
          lineStyle: {
            color: theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
            type: "dashed"
          }
        }
      },
      series: [
        {
          name: 'Ecosystem Standard',
          data: standardBarData,
          type: "bar",
          barWidth: '60%',
          silent: true,
          showBackground: false
        },
        {
          name: 'Current Plugin',
          data: mainBarData,
          type: "bar",
          barWidth: '60%',
          barGap: '-100%',
          itemStyle: {
            borderRadius: [20, 20, 20, 20],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#818cf8' }
            ])
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
  }, [labels, data, benchmarkData, colors, title, rotateLabel, yMax, yFormatter, isMobile, insights, severities, theme, tooltipMode]);

  return (
    <div
      role="region"
      aria-label={title ? `Chart: ${title}` : 'Bar chart visualization'}
      tabIndex={0}
      style={{ width: '100%', position: 'relative' }}
    >
      <div
        className="sr-only"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        <h4>{title || 'Bar Chart Summary'}</h4>
        <ul>
          {labels.map((label, idx) => (
            <li key={label}>
              {label}: {yFormatter ? yFormatter(data[idx]) : data[idx]}
            </li>
          ))}
        </ul>
      </div>
      <ReactECharts
        option={chartConfiguration}
        style={{ height: isMobile ? 300 : 350, width: "100%" }}
        onEvents={{
          'click': (params: { name?: string }) => {
            if (onItemClick && params.name) onItemClick(params.name);
          }
        }}
        notMerge={false}
        lazyUpdate={true}
      />
    </div>
  );
};

export default React.memo(BarChart);
