import { useState, useEffect, useCallback } from 'react';
import SensorCard from '../components/SensorCard';
import AnomalyAlert from '../components/AnomalyAlert';
import api from '../services/api';
import websocketService from '../services/websocket';
import './Dashboard.css';

/**
 * Dashboard Page
 * Real-time monitoring of all 12 sensors with WebSocket updates
 */
function Dashboard() {
  const [sensors, setSensors] = useState([]);
  const [sensorData, setSensorData] = useState({}); // { sensorId: [] }
  const [latestValues, setLatestValues] = useState({}); // { sensorId: value }
  const [anomalies, setAnomalies] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [lastUpdate, setLastUpdate] = useState(null);

  // Initialize - load sensor list and anomalies
  useEffect(() => {
    loadSensors();
    loadAnomalies();
    checkBackendHealth();

    // Refresh anomalies every 30 seconds
    const anomalyInterval = setInterval(loadAnomalies, 30000);

    return () => {
      clearInterval(anomalyInterval);
    };
  }, []);

  // WebSocket connection management
  useEffect(() => {
    console.log('[Dashboard] Initializing WebSocket connection');

    // Connect to WebSocket
    websocketService.connect();

    // Listen for connection events
    const unsubscribeConnected = websocketService.on('connected', () => {
      console.log('[Dashboard] WebSocket connected');
      setWsStatus('connected');
    });

    const unsubscribeDisconnected = websocketService.on('disconnected', () => {
      console.log('[Dashboard] WebSocket disconnected');
      setWsStatus('disconnected');
    });

    // Listen for sensor updates
    const unsubscribeSensorUpdate = websocketService.on('sensor_update', handleSensorUpdate);

    // Listen for anomalies
    const unsubscribeAnomaly = websocketService.on('anomaly', handleAnomaly);

    // Cleanup on unmount
    return () => {
      console.log('[Dashboard] Cleaning up WebSocket');
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeSensorUpdate();
      unsubscribeAnomaly();
      websocketService.disconnect();
    };
  }, []);

  // Load sensor list from API
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

      // Initialize sensor data buffers
      const initialData = {};
      const initialValues = {};
      mappedSensors.forEach(sensor => {
        initialData[sensor.id] = [];
        initialValues[sensor.id] = null;
      });
      setSensorData(initialData);
      setLatestValues(initialValues);

      // Load live data for each sensor
      mappedSensors.forEach(sensor => {
        loadLiveData(sensor.id);
      });
    } catch (error) {
      console.error('[Dashboard] Error loading sensors:', error);
    }
  };

  // Load live data (last 60 seconds) for a sensor
  const loadLiveData = async (sensorId) => {
    try {
      const response = await api.getLiveSensorData(sensorId);
      const data = response.data || [];

      if (data && data.length > 0) {
        setSensorData(prev => ({
          ...prev,
          [sensorId]: data.slice(-60) // Keep last 60 readings
        }));

        setLatestValues(prev => ({
          ...prev,
          [sensorId]: data[data.length - 1].value
        }));
      }
    } catch (error) {
      console.error(`[Dashboard] Error loading live data for sensor ${sensorId}:`, error);
    }
  };

  // Load recent anomalies
  const loadAnomalies = async () => {
    try {
      const response = await api.getAnomalies({ hours: 24 });
      const anomaliesData = response.anomalies || [];
      setAnomalies(anomaliesData.slice(0, 10)); // Show latest 10
    } catch (error) {
      console.error('[Dashboard] Error loading anomalies:', error);
    }
  };

  // Check backend health
  const checkBackendHealth = async () => {
    const isHealthy = await api.healthCheck();
    setBackendStatus(isHealthy ? 'online' : 'offline');
  };

  // Handle WebSocket sensor update
  const handleSensorUpdate = useCallback((data) => {
    console.log('[Dashboard] Sensor update received:', data);

    if (!data || !data.sensor_id) return;

    const sensorId = data.sensor_id;
    const reading = {
      timestamp: data.timestamp,
      value: data.avg || data.value
    };

    // Update sensor data buffer (keep last 60 readings)
    setSensorData(prev => {
      const currentData = prev[sensorId] || [];
      const newData = [...currentData, reading].slice(-60);
      return { ...prev, [sensorId]: newData };
    });

    // Update latest value
    setLatestValues(prev => ({
      ...prev,
      [sensorId]: reading.value
    }));

    setLastUpdate(new Date());
  }, []);

  // Handle WebSocket anomaly detection
  const handleAnomaly = useCallback((anomaly) => {
    console.log('[Dashboard] Anomaly detected:', anomaly);

    setAnomalies(prev => [anomaly, ...prev].slice(0, 10));

    // Optional: Show notification
    if (Notification.permission === 'granted') {
      new Notification(`Sensor ${anomaly.sensor_id} Anomaly`, {
        body: `${anomaly.anomaly_type} detected - ${anomaly.severity} severity`,
        icon: '/favicon.ico'
      });
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Environmental Sensor Monitoring</h1>
          <p className="dashboard-subtitle">Real-time monitoring of 12 sensors</p>
        </div>

        <div className="status-indicators">
          <div className="status-item">
            <span className="status-label">Backend</span>
            <span className={`status-badge status-${backendStatus}`}>
              {backendStatus === 'online' ? '● Online' : '● Offline'}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">WebSocket</span>
            <span className={`status-badge status-${wsStatus}`}>
              {wsStatus === 'connected' ? '● Connected' : '● Disconnected'}
            </span>
          </div>

          {lastUpdate && (
            <div className="status-item">
              <span className="status-label">Last Update</span>
              <span className="status-badge">
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Sensor Grid */}
        <div className="sensor-grid">
          {sensors.map(sensor => (
            <SensorCard
              key={sensor.id}
              sensorId={sensor.id}
              liveData={sensorData[sensor.id] || []}
              latestValue={latestValues[sensor.id]}
              min={0}
              max={100}
            />
          ))}
        </div>

        {/* Anomaly Panel */}
        <div className="anomaly-panel">
          <AnomalyAlert anomalies={anomalies} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
