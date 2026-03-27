import React from "react";
import ReactECharts from "echarts-for-react";

interface Props {
  labels: string[];
  data: number[];
  title?: string;
  colors?: string[];
  rotateLabel?: number;
  yMax?: number;
  yFormatter?: (v: number) => string;
}

const BarChart: React.FC<Props> = ({
  labels,
  data,
  title = "Bar Chart",
  colors,
  rotateLabel = 30,
  yMax,
  yFormatter,
}) => {
  const option = {
    title: {
      text: title,
      left: "center",
      textStyle: { fontSize: 14, fontWeight: 600, color: "#2c3e50" },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const p = params[0];
        return `${labels[p.dataIndex]}: ${p.value}`;
      },
    },
    grid: {
      left: "10%",
      right: "10%",
      bottom: rotateLabel > 0 ? "25%" : "15%",
      top: "15%",
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        rotate: rotateLabel,
        interval: 0,
        fontSize: 10,
        color: "#555",
      },
    },
    yAxis: {
      type: "value",
      max: yMax,
      axisLabel: {
        formatter: yFormatter ?? undefined,
        color: "#555",
      },
    },
    series: [
      {
        data: colors
          ? data.map((val, i) => ({
              value: val,
              itemStyle: { color: colors[i] ?? "#60a5fa" },
            }))
          : data,
        type: "bar",
        barMaxWidth: 50,
        itemStyle: colors ? undefined : { color: "#60a5fa" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px" }} />;
};

export default BarChart;
