import { useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';

/**
 * SensorGauge Component
 * Displays current sensor value as a gauge chart
 */
function SensorGauge({ sensorId, value, min = 0, max = 100, title }) {
  // Determine color based on value ranges
  const getColor = () => {
    const percentage = ((value - min) / (max - min)) * 100;

    if (percentage < 20) return 'var(--status-success)'; // Low (green)
    if (percentage < 40) return 'var(--chart-color-1)'; // Medium-low (blue)
    if (percentage < 60) return 'var(--chart-color-3)'; // Medium (cyan)
    if (percentage < 80) return 'var(--status-warning)'; // Medium-high (yellow)
    return 'var(--status-error)'; // High (red)
  };

  const gaugeData = [{
    type: 'indicator',
    mode: 'gauge+number+delta',
    value: value,
    delta: { reference: (min + max) / 2 },
    title: {
      text: title || `Sensor ${sensorId}`,
      font: {
        color: 'var(--text-primary)',
        size: 16,
        family: 'var(--font-family)'
      }
    },
    number: {
      font: {
        color: 'var(--text-primary)',
        size: 28,
        family: 'var(--font-family)'
      },
      suffix: '',
      valueformat: '.2f'
    },
    gauge: {
      axis: {
        range: [min, max],
        tickcolor: 'var(--text-secondary)',
        tickfont: {
          color: 'var(--text-secondary)',
          size: 10
        }
      },
      bar: { color: getColor() },
      bgcolor: 'var(--bg-secondary)',
      borderwidth: 2,
      bordercolor: 'var(--border-color)',
      steps: [
        { range: [min, min + (max - min) * 0.33], color: 'var(--bg-tertiary)' },
        { range: [min + (max - min) * 0.33, min + (max - min) * 0.67], color: 'rgba(79, 123, 255, 0.05)' },
        { range: [min + (max - min) * 0.67, max], color: 'rgba(255, 71, 87, 0.05)' }
      ],
      threshold: {
        line: { color: 'var(--status-error)', width: 4 },
        thickness: 0.75,
        value: max * 0.9
      }
    }
  }];

  const layout = {
    margin: { t: 40, b: 10, l: 10, r: 10 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      family: 'var(--font-family)',
      color: 'var(--text-primary)'
    },
    height: 200
  };

  const config = {
    displayModeBar: false,
    responsive: true
  };

  return (
    <div className="sensor-gauge">
      <Plot
        data={gaugeData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '200px' }}
      />
    </div>
  );
}

export default SensorGauge;
