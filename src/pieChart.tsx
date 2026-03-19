import React from "react";
import ReactECharts from "echarts-for-react";

interface Props {
    data: { name: string; value: number }[];
}

const PieChart: React.FC<Props> = ({ data }) => {
    const option = {
    title: {
        text: "Plugin Health Distribution",
        left: "center",
    },
    tooltip: {
        trigger: "item",
    },
    series: [
        {
            type: "pie",
            radius: "50%",
            data: data,
        },
    ],
    };

    return <ReactECharts option={option} style={{ height: "300px" }} />;
};

export default PieChart;