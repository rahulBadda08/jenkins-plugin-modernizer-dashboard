import React from "react";
import ReactECharts from "echarts-for-react";

interface Props {
  labels: string[];
  data: number[];
  colors?: string[];
  title?: string;
  rotateLabel?: number;
  yMax?: number;
  yFormatter?: (value: number) => string;
}

const BarChart: React.FC<Props> = ({
  labels,
  data,
  colors,
  title,
  rotateLabel,
  yMax,
  yFormatter,
}) => {
  const option = {
    title: {
      text: title,
      left: "center",
      textStyle: { fontSize: 15, fontWeight: 600, color: "#F3F4F6", fontFamily: 'Inter' },
    },
    tooltip: { trigger: 'axis' },
    grid: {
      left: "5%",
      right: "5%",
      bottom: "20%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        rotate: rotateLabel ?? 0,
        interval: 0,
        color: "#9CA3AF",
        fontFamily: 'Inter',
        fontSize: 11
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
          color: (params: any) => {
            if (colors && colors.length === data.length) return colors[params.dataIndex];
            if (colors && colors.length > 0) return colors[0];
            return "#3B82F6";
          },
          borderRadius: [4, 4, 0, 0]
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 350, width: "100%" }} // 🔥 FIX SIZE
    />
  );
};

export default BarChart;