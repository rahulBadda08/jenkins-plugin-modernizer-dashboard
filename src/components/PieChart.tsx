import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

interface PieChartProperties {
  data: { name: string; value: number; insight?: string; severity?: string }[];
  title?: string;
  colors?: string[];
  theme?: 'dark' | 'light';
  onItemClick?: (name: string) => void;
}

const SEVERITY_COLORS = {
  danger: "#c92a2a",
  warning: "#e67e22",
  success: "#2b8a3e",
  info: "#1864ab",
  default: "#003056"
};

const PROFESSIONAL_PALETTE = [
  "#003056", // Navy
  "#007bff", // Blue
  "#1864ab", // Dark Blue
  "#adb5bd", // Gray
  "#6c757d", // Dim Gray
  "#495057", // Dark Gray
];

const PieChart: React.FC<PieChartProperties> = ({
  data,
  title,
  colors: manualColors,
  theme = 'dark',
  onItemClick
}) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        // Use professional palette for info/default/unknown topics
        finalColor = PROFESSIONAL_PALETTE[idx % PROFESSIONAL_PALETTE.length];
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
        top: 0,
        textStyle: { 
          fontSize: isMobile ? 14 : 16, 
          fontWeight: 800, 
          color: theme === 'dark' ? "#F3F4F6" : "#0f172a", 
          fontFamily: 'Outfit, sans-serif', 
          letterSpacing: 0.5 
        },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: theme === 'dark' ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderColor: theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0, 0, 0, 0.1)",
        textStyle: { color: theme === 'dark' ? "#FFF" : "#0f172a", fontFamily: 'Inter, sans-serif', fontSize: 12 },
        borderRadius: 12,
        padding: 12,
        backdropFilter: 'blur(12px)',
        formatter: (params: any) => {
          const item = data[params.dataIndex];
          const insight = item.insight ? `<div style="margin-top: 8px; font-size: 11px; opacity: 0.7; border-top: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; padding-top: 8px; white-space: normal; line-height: 1.4; max-width: 200px;">${item.insight}</div>` : '';
          return `<div style="font-family: 'Inter', sans-serif;">
                    <div style="font-weight: 700;">${params.name}</div>
                    <div style="font-family: 'JetBrains Mono', monospace; margin-top: 4px; color: #2b8a3e;">${params.value} ENTITIES <span style="color: ${theme === 'dark' ? '#94a3b8' : '#475569'}; font-size: 10px;">(${params.percent}%)</span></div>
                    ${insight}
                  </div>`;
        }
      },
      legend: {
        show: !isMobile, // Hide legend on mobile to save space
        orient: 'horizontal',
        bottom: '0%',
        left: 'center',
        textStyle: { color: theme === 'dark' ? '#94a3b8' : '#475569', fontFamily: 'Inter, sans-serif', fontSize: 10 },
        icon: 'circle',
        itemGap: 10
      },
      series: [
        {
          name: 'Diagnosis',
          type: 'pie',
          radius: isMobile ? ['15%', '50%'] : ['20%', '65%'], 
          center: ['50%', '50%'], 
          roseType: 'area', 
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: isMobile ? 8 : 12,
            borderColor: theme === 'dark' ? 'rgba(3, 7, 18, 1)' : 'rgba(248, 250, 252, 1)',
            borderWidth: 3
          },
          label: { 
            show: true, 
            position: isMobile ? 'inner' : 'outside', // Labels inside on mobile to avoid overflow
            formatter: isMobile ? '{value|{d}%}' : '{name|{b}}\n{value|{d}%}',
            rich: {
              name: {
                fontFamily: 'Outfit, sans-serif',
                fontSize: 10,
                fontWeight: 700,
                color: theme === 'dark' ? '#F3F4F6' : '#0f172a',
                padding: [0, 0, 2, 0]
              },
              value: {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: isMobile ? 9 : 12,
                fontWeight: 800,
                color: isMobile ? '#FFF' : (theme === 'dark' ? '#38d1ff' : '#003056')
              }
            }
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 800,
            },
            itemStyle: {
              shadowBlur: 25,
              shadowColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.2)'
            }
          },
          labelLine: { 
            show: !isMobile,
            length: 10,
            length2: 15,
            smooth: true,
            lineStyle: {
              color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              width: 1.5
            }
          },
          data: semanticData
        }
      ]
    };
  }, [data, title, manualColors, theme, isMobile]);

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
