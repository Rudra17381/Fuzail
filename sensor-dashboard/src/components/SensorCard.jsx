import { useState, useEffect } from 'react';
import SensorGauge from './SensorGauge';
import Sparkline from './Sparkline';
import './SensorCard.css';

/**
 * SensorCard Component
 * Displays sensor gauge, sparkline, and status information
 */
function SensorCard({ sensorId, liveData = [], latestValue, min = 0, max = 100 }) {
  const [status, setStatus] = useState('normal');
  const [lastUpdate, setLastUpdate] = useState(null);

  // Determine sensor status based on latest value
  useEffect(() => {
    if (latestValue === null || latestValue === undefined) {
      setStatus('offline');
      return;
    }

    const percentage = ((latestValue - min) / (max - min)) * 100;

    if (percentage > 90 || percentage < 10) {
      setStatus('critical');
    } else if (percentage > 80 || percentage < 20) {
      setStatus('warning');
    } else {
      setStatus('normal');
    }

    setLastUpdate(new Date());
  }, [latestValue, min, max]);

  const getStatusColor = () => {
    switch (status) {
      case 'critical':
        return 'var(--status-error)';
      case 'warning':
        return 'var(--status-warning)';
      case 'normal':
        return 'var(--status-success)';
      case 'offline':
        return 'var(--text-secondary)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'critical':
        return 'CRITICAL';
      case 'warning':
        return 'WARNING';
      case 'normal':
        return 'NORMAL';
      case 'offline':
        return 'OFFLINE';
      default:
        return 'UNKNOWN';
    }
  };

  // Get chart color based on sensor ID
  const getChartColor = () => {
    const colors = [
      'var(--chart-color-1)', 'var(--chart-color-2)', 'var(--chart-color-3)',
      'var(--chart-color-4)', 'var(--chart-color-5)', 'var(--chart-color-6)',
      'var(--chart-color-7)', 'var(--chart-color-8)', 'var(--chart-color-9)',
      'var(--chart-color-10)', 'var(--chart-color-11)', 'var(--chart-color-12)'
    ];
    return colors[(sensorId - 1) % 12];
  };

  return (
    <div className="sensor-card">
      <div className="sensor-card-header">
        <div className="sensor-title">
          <span className="sensor-id">Sensor {sensorId}</span>
          <span
            className="sensor-status"
            style={{ color: getStatusColor() }}
          >
            {getStatusText()}
          </span>
        </div>
        {lastUpdate && (
          <div className="last-update">
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="sensor-card-body">
        <SensorGauge
          sensorId={sensorId}
          value={latestValue || 0}
          min={min}
          max={max}
          title={`Sensor ${sensorId}`}
        />

        <div className="sparkline-section">
          <div className="sparkline-label">Last 60 seconds</div>
          <Sparkline
            data={liveData}
            color={getChartColor()}
            height={60}
          />
        </div>
      </div>

      <div className="sensor-card-footer">
        <div className="stat">
          <span className="stat-label">Current</span>
          <span className="stat-value">{latestValue !== null && latestValue !== undefined ? latestValue.toFixed(2) : 'N/A'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Min</span>
          <span className="stat-value">{liveData.length > 0 ? Math.min(...liveData.map(d => d.value)).toFixed(2) : 'N/A'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Max</span>
          <span className="stat-value">{liveData.length > 0 ? Math.max(...liveData.map(d => d.value)).toFixed(2) : 'N/A'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Avg</span>
          <span className="stat-value">
            {liveData.length > 0
              ? (liveData.reduce((sum, d) => sum + d.value, 0) / liveData.length).toFixed(2)
              : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SensorCard;
