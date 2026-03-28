import React from "react";
import ReactECharts from "echarts-for-react";

interface Props {
  data: { name: string; value: number }[];
  title?: string;
  colors?: string[];
  donut?: boolean;
}

const PieChart: React.FC<Props> = ({
  data,
  title = "Pie Chart",
  colors,
  donut = false,
}) => {
  const option = {
    title: {
      text: title,
      left: "center",
      textStyle: { fontSize: 15, fontWeight: 600, color: "#F3F4F6", fontFamily: 'Inter' },
    },
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
      backgroundColor: "rgba(30, 41, 59, 0.9)",
      borderColor: "rgba(255,255,255,0.1)",
      textStyle: { color: "#F3F4F6", fontFamily: 'Inter' }
    },
    color: colors ?? ["#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6"],
    series: [
      {
        type: "pie",
        radius: donut ? ["45%", "70%"] : "65%",
        center: ["50%", "55%"],
        data: data,
        itemStyle: {
          borderRadius: 4,
          borderColor: "rgba(30, 41, 59, 1)",
          borderWidth: 2
        },
        label: {
          formatter: "{b}\n{c}",
          color: "#9CA3AF",
          fontFamily: 'Inter',
        },
        labelLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.2)"
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px" }} />;
};

export default PieChart;
