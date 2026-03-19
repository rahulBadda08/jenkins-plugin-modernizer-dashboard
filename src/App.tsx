import "./App.css";
import BarChart from "./barChart";
import PieChart from "./pieChart";
import { pluginData } from "./mockData";

function App() {
  const labels = pluginData.map((p) => p.name);
  const deprecatedData = pluginData.map((p) => p.deprecatedApis);

  const statusCount: Record<string, number> = {
    Modern: 0,
    "Needs Update": 0,
    Critical: 0,
  };

  pluginData.forEach((p) => {
    statusCount[p.status]++;
  });

  const pieData = Object.entries(statusCount).map(([key, value]) => ({
    name: key,
    value: value,
  }));

  return (
    <div className="container">
      <h1 className="title">Jenkins Plugin Modernization Dashboard</h1>

      <div className="grid">
        <div className="card">
          <BarChart labels={labels} data={deprecatedData} />
        </div>

        <div className="card">
          <PieChart data={pieData} />
        </div>
      </div>
    </div>
  );
}

export default App;