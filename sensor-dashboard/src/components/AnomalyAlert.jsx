import './AnomalyAlert.css';

/**
 * AnomalyAlert Component
 * Displays recent sensor anomalies with severity indicators
 */
function AnomalyAlert({ anomalies = [] }) {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getSeverityClass = (severity) => {
    return `anomaly-item severity-${severity}`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getAnomalyTypeLabel = (type) => {
    const labels = {
      spike: 'Spike Detected',
      dropout: 'Signal Dropout',
      out_of_range: 'Out of Range',
      sudden_change: 'Sudden Change'
    };
    return labels[type] || type;
  };

  return (
    <div className="anomaly-alert-container">
      <div className="anomaly-header">
        <h3>Recent Anomalies</h3>
        <span className="anomaly-count">{anomalies.length}</span>
      </div>

      <div className="anomaly-list">
        {anomalies.length === 0 ? (
          <div className="no-anomalies">
            <span className="checkmark">✓</span>
            <p>All sensors operating normally</p>
          </div>
        ) : (
          anomalies.map((anomaly, index) => (
            <div key={index} className={getSeverityClass(anomaly.severity)}>
              <div className="anomaly-icon">{getSeverityIcon(anomaly.severity)}</div>

              <div className="anomaly-content">
                <div className="anomaly-title">
                  <span className="anomaly-sensor">Sensor {anomaly.sensor_id}</span>
                  <span className="anomaly-type">{getAnomalyTypeLabel(anomaly.anomaly_type)}</span>
                </div>

                <div className="anomaly-details">
                  <span className="anomaly-value">Value: {anomaly.value?.toFixed(2) || 'N/A'}</span>
                  <span className="anomaly-time">{formatTimestamp(anomaly.timestamp)}</span>
                </div>
              </div>

              <div className={`anomaly-severity-badge severity-${anomaly.severity}`}>
                {anomaly.severity.toUpperCase()}
              </div>
            </div>
          ))
        )}
      </div>

      {anomalies.length > 5 && (
        <div className="anomaly-footer">
          <button className="view-all-btn">View All Anomalies</button>
        </div>
      )}
    </div>
  );
}

export default AnomalyAlert;
