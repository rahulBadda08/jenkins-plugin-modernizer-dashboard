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
      textStyle: { fontSize: 14, fontWeight: 600, color: "#2c3e50" },
    },
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    color: colors ?? ["#60a5fa", "#4ade80", "#f87171", "#facc15", "#a78bfa"],
    series: [
      {
        type: "pie",
        radius: donut ? ["40%", "65%"] : "55%",
        center: ["50%", "55%"],
        data: data,
        label: {
          formatter: "{b}: {c}",
          fontSize: 11,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.2)",
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px" }} />;
};

export default PieChart;
