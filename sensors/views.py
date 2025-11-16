from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Max
from .models import (
    SensorReading,
    SensorAggregated1Sec,
    SensorAggregated1Min,
    SensorAggregated1Hour,
    Anomaly
)
from .serializers import (
    SensorReadingSerializer,
    SensorReadingBulkCreateSerializer,
    SensorAggregated1SecSerializer,
    SensorAggregated1MinSerializer,
    SensorAggregated1HourSerializer,
    AnomalySerializer,
    SensorListSerializer
)


@api_view(['POST'])
def ingest_sensor_data(request):
    """
    Batch insert sensor readings from Raspberry Pi.
    Expects array of readings: [{"sensor_id": 1, "timestamp": "...", "value": 123.45}, ...]
    """
    if not isinstance(request.data, list):
        return Response(
            {"error": "Expected an array of sensor readings"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate all readings
    serializer = SensorReadingBulkCreateSerializer(data=request.data, many=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Bulk create sensor readings for efficiency
    readings = [
        SensorReading(
            sensor_id=item['sensor_id'],
            timestamp=item['timestamp'],
            value=item['value']
        )
        for item in serializer.validated_data
    ]

    try:
        SensorReading.objects.bulk_create(readings, batch_size=500)
        return Response(
            {
                "success": True,
                "count": len(readings),
                "message": f"Successfully inserted {len(readings)} sensor readings"
            },
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_live_data(request, sensor_id):
    """
    Get the last 60 seconds of sensor data for real-time dashboard.
    Returns 1-second aggregated data for smoother visualization.
    """
    if sensor_id < 1 or sensor_id > 12:
        return Response(
            {"error": "sensor_id must be between 1 and 12"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get last 60 seconds of 1-second aggregated data
    cutoff_time = timezone.now() - timedelta(seconds=60)

    data = SensorAggregated1Sec.objects.filter(
        sensor_id=sensor_id,
        timestamp__gte=cutoff_time
    ).order_by('timestamp')

    serializer = SensorAggregated1SecSerializer(data, many=True)
    return Response({
        "sensor_id": sensor_id,
        "data": serializer.data,
        "count": len(serializer.data)
    })


@api_view(['GET'])
def get_historical_data(request, sensor_id):
    """
    Get historical sensor data with automatic aggregation level selection.
    Query params:
    - start_time: ISO datetime (required)
    - end_time: ISO datetime (required)
    - resolution: 'auto', '1sec', '1min', '1hour' (default: 'auto')
    """
    if sensor_id < 1 or sensor_id > 12:
        return Response(
            {"error": "sensor_id must be between 1 and 12"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Parse query parameters
    start_time_str = request.query_params.get('start_time')
    end_time_str = request.query_params.get('end_time')
    resolution = request.query_params.get('resolution', 'auto')

    if not start_time_str or not end_time_str:
        return Response(
            {"error": "start_time and end_time are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from django.utils.dateparse import parse_datetime
        start_time = parse_datetime(start_time_str)
        end_time = parse_datetime(end_time_str)

        if not start_time or not end_time:
            raise ValueError("Invalid datetime format")
    except Exception as e:
        return Response(
            {"error": f"Invalid datetime format: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Calculate time range for auto-resolution selection
    time_range = end_time - start_time

    # Auto-select resolution based on time range
    if resolution == 'auto':
        if time_range <= timedelta(hours=1):
            resolution = '1sec'
        elif time_range <= timedelta(days=1):
            resolution = '1min'
        else:
            resolution = '1hour'

    # Query appropriate aggregation table
    if resolution == '1sec':
        queryset = SensorAggregated1Sec.objects.filter(
            sensor_id=sensor_id,
            timestamp__gte=start_time,
            timestamp__lte=end_time
        ).order_by('timestamp')
        serializer = SensorAggregated1SecSerializer(queryset, many=True)
    elif resolution == '1min':
        queryset = SensorAggregated1Min.objects.filter(
            sensor_id=sensor_id,
            timestamp__gte=start_time,
            timestamp__lte=end_time
        ).order_by('timestamp')
        serializer = SensorAggregated1MinSerializer(queryset, many=True)
    elif resolution == '1hour':
        queryset = SensorAggregated1Hour.objects.filter(
            sensor_id=sensor_id,
            timestamp__gte=start_time,
            timestamp__lte=end_time
        ).order_by('timestamp')
        serializer = SensorAggregated1HourSerializer(queryset, many=True)
    else:
        return Response(
            {"error": "Invalid resolution. Use 'auto', '1sec', '1min', or '1hour'"},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        "sensor_id": sensor_id,
        "start_time": start_time,
        "end_time": end_time,
        "resolution": resolution,
        "data": serializer.data,
        "count": len(serializer.data)
    })


@api_view(['GET'])
def get_anomalies(request):
    """
    Get anomalies with optional filtering.
    Query params:
    - sensor_id: Filter by sensor (optional)
    - severity: Filter by severity (low, medium, high) (optional)
    - start_time: Filter from this time (optional)
    - limit: Number of results (default: 100)
    """
    queryset = Anomaly.objects.all()

    # Apply filters
    sensor_id = request.query_params.get('sensor_id')
    if sensor_id:
        try:
            sensor_id = int(sensor_id)
            if 1 <= sensor_id <= 12:
                queryset = queryset.filter(sensor_id=sensor_id)
        except ValueError:
            pass

    severity = request.query_params.get('severity')
    if severity and severity in ['low', 'medium', 'high']:
        queryset = queryset.filter(severity=severity)

    start_time_str = request.query_params.get('start_time')
    if start_time_str:
        try:
            from django.utils.dateparse import parse_datetime
            start_time = parse_datetime(start_time_str)
            if start_time:
                queryset = queryset.filter(timestamp__gte=start_time)
        except Exception:
            pass

    # Apply limit
    limit = request.query_params.get('limit', 100)
    try:
        limit = int(limit)
        if limit > 1000:
            limit = 1000
    except ValueError:
        limit = 100

    queryset = queryset.order_by('-timestamp')[:limit]
    serializer = AnomalySerializer(queryset, many=True)

    return Response({
        "anomalies": serializer.data,
        "count": len(serializer.data)
    })


@api_view(['GET'])
def list_sensors(request):
    """
    Get list of all 12 sensors with their current status and last reading.
    """
    sensors_data = []

    for sensor_id in range(1, 13):
        # Get last reading for this sensor
        last_reading = SensorReading.objects.filter(
            sensor_id=sensor_id
        ).order_by('-timestamp').first()

        # Determine status
        if last_reading:
            time_since_last = timezone.now() - last_reading.timestamp
            if time_since_last < timedelta(seconds=5):
                status_str = "online"
            elif time_since_last < timedelta(minutes=1):
                status_str = "degraded"
            else:
                status_str = "offline"
        else:
            status_str = "no_data"

        sensors_data.append({
            "sensor_id": sensor_id,
            "name": f"Sensor {sensor_id}",
            "status": status_str,
            "last_reading_time": last_reading.timestamp if last_reading else None,
            "last_value": last_reading.value if last_reading else None
        })

    serializer = SensorListSerializer(sensors_data, many=True)
    return Response({
        "sensors": serializer.data,
        "count": len(sensors_data)
    })
