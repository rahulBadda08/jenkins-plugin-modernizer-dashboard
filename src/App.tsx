import { Bar, Pie } from "react-chartjs-2";
import { pluginData } from "./mockData.ts"
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

import "./App.css";

ChartJS.register(
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

function App() {
  const deprecatedCount = pluginData.map(p => p.deprecatedApis);
  const pluginNames = pluginData.map(p => p.name);

  const barData = {
    labels: pluginNames,
    datasets: [
      {
        label: "Deprecated APIs per Plugin",
        data: deprecatedCount,
      },
    ],
  };

    const statusCount = {
      Modern: 0,
      "Needs Update": 0,
      Critical: 0,
    };
    
    pluginData.forEach(p => {
      statusCount[p.status]++;
    });
    
    const pieData = {
      labels: Object.keys(statusCount),
      datasets: [
        {
          data: Object.values(statusCount),
        },
      ],
    };

  return (
    <div className="container">
      <h1 className="title">Jenkins Plugin Modernization Dashboard</h1>

      <div className="grid">
        <div className="card">
          <h3>Modernization Metrics</h3>
          <Bar data={barData} />
        </div>

        <div className="card">
          <h3>Plugin Health Distribution</h3>
          <Pie data={pieData} />
        </div>
      </div>
    </div>
  );
};

export default App;