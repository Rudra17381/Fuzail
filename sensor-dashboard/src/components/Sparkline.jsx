import Plot from 'react-plotly.js';

/**
 * Sparkline Component
 * Small line chart showing recent sensor data trend
 */
function Sparkline({ data = [], color = 'var(--chart-color-1)', height = 60 }) {
  // Prepare data for plotting
  const timestamps = data.map(d => d.timestamp);
  const values = data.map(d => d.value);

  const traceData = [{
    type: 'scatter',
    mode: 'lines',
    x: timestamps,
    y: values,
    line: {
      color: color,
      width: 2,
      shape: 'spline' // Smooth curves
    },
    fill: 'tozeroy',
    fillcolor: color.replace(')', ', 0.1)').replace('rgb', 'rgba').replace('var(--chart-color', 'rgba(79, 123, 255'),
    hovertemplate: '<b>%{y:.2f}</b><br>%{x|%H:%M:%S}<extra></extra>'
  }];

  const layout = {
    margin: { t: 5, b: 20, l: 0, r: 0 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: {
      visible: true,
      showgrid: false,
      showticklabels: true,
      tickfont: {
        size: 8,
        color: 'var(--text-secondary)'
      },
      type: 'date',
      tickformat: '%H:%M:%S'
    },
    yaxis: {
      visible: true,
      showgrid: true,
      gridcolor: 'rgba(160, 168, 192, 0.05)',
      showticklabels: true,
      tickfont: {
        size: 8,
        color: 'var(--text-secondary)'
      }
    },
    height: height,
    showlegend: false,
    hovermode: 'x unified'
  };

  const config = {
    displayModeBar: false,
    responsive: true
  };

  return (
    <div className="sparkline">
      {data.length > 0 ? (
        <Plot
          data={traceData}
          layout={layout}
          config={config}
          style={{ width: '100%', height: `${height}px` }}
        />
      ) : (
        <div style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: '12px'
        }}>
          No data available
        </div>
      )}
    </div>
  );
}

export default Sparkline;
