import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import api from '../services/api';
import './Analytics.css';

/**
 * Analytics Page
 * Historical sensor data analysis with interactive charts
 */
function Analytics() {
  const [selectedSensor, setSelectedSensor] = useState(1);
  const [sensors, setSensors] = useState([]);
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 6h, 24h, 7d, 30d
  const [resolution, setResolution] = useState('auto');
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [customRange, setCustomRange] = useState({
    start: '',
    end: ''
  });

  // Load sensors on mount
  useEffect(() => {
    loadSensors();
  }, []);

  // Load historical data when sensor or time range changes
  useEffect(() => {
    if (selectedSensor) {
      loadHistoricalData();
    }
  }, [selectedSensor, timeRange, resolution]);

  const loadSensors = async () => {
    try {
      const response = await api.getSensorList();
      const sensorsData = response.sensors || [];

      // Map sensor_id to id for consistency
      const mappedSensors = sensorsData.map(sensor => ({
        ...sensor,
        id: sensor.sensor_id
      }));

      setSensors(mappedSensors);
    } catch (error) {
      console.error('[Analytics] Error loading sensors:', error);
    }
  };

  const loadHistoricalData = async () => {
    setLoading(true);

    try {
      // Calculate time range
      const endTime = new Date();
      const startTime = new Date();

      switch (timeRange) {
        case '1h':
          startTime.setHours(endTime.getHours() - 1);
          break;
        case '6h':
          startTime.setHours(endTime.getHours() - 6);
          break;
        case '24h':
          startTime.setHours(endTime.getHours() - 24);
          break;
        case '7d':
          startTime.setDate(endTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(endTime.getDate() - 30);
          break;
        case 'custom':
          if (customRange.start && customRange.end) {
            startTime.setTime(new Date(customRange.start).getTime());
            endTime.setTime(new Date(customRange.end).getTime());
          } else {
            setLoading(false);
            return;
          }
          break;
        default:
          startTime.setHours(endTime.getHours() - 1);
      }

      const params = {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        resolution: resolution
      };

      const response = await api.getHistoricalData(selectedSensor, params);
      const data = response.data || [];
      setHistoricalData(data);

      // Calculate statistics
      if (data && data.length > 0) {
        const values = data.map(d => d.avg || d.value);
        const statistics = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          count: data.length,
          std: calculateStd(values)
        };
        setStats(statistics);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('[Analytics] Error loading historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStd = (values) => {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  // Prepare chart data
  const getChartData = () => {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    const timestamps = historicalData.map(d => d.timestamp);
    const values = historicalData.map(d => d.avg || d.value);
    const mins = historicalData.map(d => d.min || d.value);
    const maxs = historicalData.map(d => d.max || d.value);

    return [
      {
        type: 'scattergl', // Use WebGL for better performance
        mode: 'lines',
        name: 'Average',
        x: timestamps,
        y: values,
        line: {
          color: 'var(--chart-color-1)',
          width: 2
        },
        hovertemplate: '<b>%{y:.2f}</b><br>%{x|%Y-%m-%d %H:%M:%S}<extra></extra>'
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Range',
        x: timestamps,
        y: maxs,
        line: {
          color: 'rgba(160, 168, 192, 0.3)',
          width: 1
        },
        fill: 'tonexty',
        fillcolor: 'rgba(79, 123, 255, 0.1)',
        hovertemplate: '<b>Max: %{y:.2f}</b><extra></extra>',
        showlegend: false
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Min',
        x: timestamps,
        y: mins,
        line: {
          color: 'rgba(160, 168, 192, 0.3)',
          width: 1
        },
        hovertemplate: '<b>Min: %{y:.2f}</b><extra></extra>',
        showlegend: false
      }
    ];
  };

  const chartLayout = {
    title: {
      text: `Sensor ${selectedSensor} - Historical Data`,
      font: {
        color: 'var(--text-primary)',
        size: 18,
        family: 'var(--font-family)'
      }
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'var(--bg-secondary)',
    xaxis: {
      title: 'Time',
      gridcolor: 'rgba(160, 168, 192, 0.1)',
      color: 'var(--text-secondary)',
      tickfont: { color: 'var(--text-secondary)' }
    },
    yaxis: {
      title: 'Value',
      gridcolor: 'rgba(160, 168, 192, 0.1)',
      color: 'var(--text-secondary)',
      tickfont: { color: 'var(--text-secondary)' }
    },
    margin: { t: 60, b: 60, l: 60, r: 40 },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      font: { color: 'var(--text-secondary)' },
      bgcolor: 'var(--bg-tertiary)',
      bordercolor: 'var(--border-color)',
      borderwidth: 1
    }
  };

  const chartConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
  };

  const exportCSV = () => {
    if (!historicalData || historicalData.length === 0) return;

    const headers = ['Timestamp', 'Value', 'Min', 'Max', 'Std', 'Count'];
    const rows = historicalData.map(d => [
      d.timestamp,
      d.avg || d.value,
      d.min || '',
      d.max || '',
      d.std || '',
      d.count || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor_${selectedSensor}_${timeRange}_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1>Historical Analytics</h1>
          <p className="analytics-subtitle">Analyze sensor data trends and patterns</p>
        </div>

        <button className="export-btn" onClick={exportCSV} disabled={!historicalData || historicalData.length === 0}>
          Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className="analytics-controls">
        <div className="control-group">
          <label>Sensor</label>
          <select
            value={selectedSensor}
            onChange={(e) => setSelectedSensor(Number(e.target.value))}
          >
            {sensors.map(sensor => (
              <option key={sensor.id} value={sensor.id}>
                Sensor {sensor.id}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {timeRange === 'custom' && (
          <>
            <div className="control-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="control-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <button className="apply-btn" onClick={loadHistoricalData}>
              Apply
            </button>
          </>
        )}

        <div className="control-group">
          <label>Resolution</label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="1sec">1 Second</option>
            <option value="1min">1 Minute</option>
            <option value="1hour">1 Hour</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Minimum</span>
            <span className="stat-value">{stats.min.toFixed(2)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Maximum</span>
            <span className="stat-value">{stats.max.toFixed(2)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Average</span>
            <span className="stat-value">{stats.avg.toFixed(2)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Std Dev</span>
            <span className="stat-value">{stats.std.toFixed(2)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Data Points</span>
            <span className="stat-value">{stats.count.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="chart-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading historical data...</p>
          </div>
        ) : historicalData && historicalData.length > 0 ? (
          <Plot
            data={getChartData()}
            layout={chartLayout}
            config={chartConfig}
            style={{ width: '100%', height: '600px' }}
          />
        ) : (
          <div className="empty-state">
            <p>No data available for the selected time range</p>
            <p className="empty-subtitle">Try selecting a different time range or sensor</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
