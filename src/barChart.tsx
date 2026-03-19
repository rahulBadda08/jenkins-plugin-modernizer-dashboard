import React from "react";
import ReactECharts from "echarts-for-react";

interface Props {
    labels: string[];
    data: number[];
}

const BarChart: React.FC<Props> = ({ labels, data }) => {
    const option = {
        title: {
            text: "Deprecated APIs per Plugin",
            left: "center",
        },
        tooltip: {},
        grid: {
            left: "10%",
            right: "10%",
            bottom: "20%",
        },
        
        xAxis: {
            type: "category",
            data: labels,
            axisLabel: {
                rotate: 30,
                interval: 0,
            },
        },
        yAxis: {
            type: "value",
        },
        series: [
            {
                data: data,
                type: "bar",
            },
        ],
        
        };

    return <ReactECharts option={option} style={{ height: "300px" }} />;
};

export default BarChart;