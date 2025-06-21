let chart;
let globalData = []; // store data for CSV download

function fetchForecast() {
  const ticker = document.getElementById("ticker").value;
  const days = document.getElementById("days").value;
  const model = document.getElementById("models").value;

  // Hide download until data received
  document.getElementById("downloadSection").style.display = "none";

  fetch(`/predict?ticker=${ticker}&days=${days}&model=${model}`)
    .then(res => res.json())
    .then(data => {
      if (!data || data.length === 0) return alert("No data received.");

      globalData = data; // Save for CSV

      // === Table ===
      const tableHead = document.getElementById("tableHead");
      const tbody = document.querySelector("#forecastTable tbody");
      tbody.innerHTML = "";

      const keys = Object.keys(data[0]).filter(k => k !== 'Date');
      tableHead.innerHTML = `<th>Date</th>` + keys.map(k => `<th>${k}</th>`).join("");

      const limited = data.slice(0, 20); // limit table to 20
      limited.forEach(row => {
        const rowHTML = `<tr>
          <td>${row.Date}</td>
          ${keys.map(k => `<td>${row[k].toFixed(2)}</td>`).join("")}
        </tr>`;
        tbody.innerHTML += rowHTML;
      });

      // === Chart ===
      if (chart) chart.destroy();

      const labels = data.map(r => r.Date);
      const datasets = keys.map(key => ({
        label: key,
        data: data.map(r => r[key]),
        borderWidth: 2,
        borderColor: getColor(key),
        backgroundColor: getColor(key),
        fill: false,
        tension: 0.3
      }));

      chart = new Chart(document.getElementById('forecastChart'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: {
              beginAtZero: false,
              title: { display: true, text: 'Price (INR)' }
            },
            x: {
              title: { display: true, text: 'Date' }
            }
          }
        }
      });

      // Show download button
      document.getElementById("downloadSection").style.display = "block";
    })
    .catch(err => {
      console.error(err);
      alert("Error fetching forecast. Please try again.");
    });
}

function downloadCSV() {
  if (globalData.length === 0) return;

  const csvRows = [];
  const headers = Object.keys(globalData[0]);
  csvRows.push(headers.join(','));

  globalData.forEach(row => {
    csvRows.push(headers.map(h => row[h]).join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'forecast_data.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function getColor(modelName) {
  const colors = {
    SMA: 'blue',
    EMA: 'green',
    Naive: 'orange',
    ETS: 'purple',
    ARIMA: 'red',
    RandomForest: 'brown'
  };
  return colors[modelName] || 'black';
}
