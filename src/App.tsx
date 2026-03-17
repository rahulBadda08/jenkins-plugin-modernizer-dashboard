import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function App() {
  const data = {
    labels: ["Deprecated APIs", "Modern APIs"],
    datasets: [
      {
        label: "Plugin Status",
        data: [120, 80], // dummy data for now
      },
    ],
  };

  return (
    <div style={{ width: "600px", margin: "50px auto" }}>
      <h2>Jenkins Plugin Modernization Dashboard</h2>
      <Bar data={data} />
    </div>
  );
}

export default App;