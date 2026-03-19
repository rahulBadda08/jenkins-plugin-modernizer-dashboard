import { Bar, Pie } from "react-chartjs-2";
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
  const barData = {
    labels: ["Deprecated APIs", "Outdated Dependencies", "Test Migration"],
    datasets: [
      {
        label: "Number of Plugins",
        data: [120, 80, 45],
      },
    ],
  };

  const pieData = {
    labels: ["Modern", "Needs Update", "Critical"],
    datasets: [
      {
        label: "Plugin Health",
        data: [60, 30, 10],
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
}

export default App;