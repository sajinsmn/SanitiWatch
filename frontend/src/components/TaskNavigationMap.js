import React, { useEffect, useRef, useState } from 'react';

const TaskNavigationMap = ({ taskLocation, onClose }) => {
  const mapRef = useRef(null);
  const [, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [workerLocation, setWorkerLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [error, setError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Get worker's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setWorkerLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your current location. Please enable GPS.');
          setLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLoadingLocation(false);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!window.google || !taskLocation || loadingLocation) return;

    const taskLatLng = {
      lat: parseFloat(taskLocation.latitude),
      lng: parseFloat(taskLocation.longitude)
    };

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: workerLocation || taskLatLng,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    setMap(mapInstance);
    setDirectionsService(new window.google.maps.DirectionsService());
    setDirectionsRenderer(new window.google.maps.DirectionsRenderer({
      map: mapInstance,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    }));

    // Add marker for task location
    new window.google.maps.Marker({
      position: taskLatLng,
      map: mapInstance,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new window.google.maps.Size(40, 40)
      },
      title: 'Issue Location',
      animation: window.google.maps.Animation.DROP
    });

    // Add marker for worker location if available
    if (workerLocation) {
      new window.google.maps.Marker({
        position: workerLocation,
        map: mapInstance,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: 'Your Location',
        animation: window.google.maps.Animation.DROP
      });
    }
  }, [taskLocation, workerLocation, loadingLocation]);

  // Calculate and display route
  useEffect(() => {
    if (!directionsService || !directionsRenderer || !workerLocation || !taskLocation) return;

    const taskLatLng = {
      lat: parseFloat(taskLocation.latitude),
      lng: parseFloat(taskLocation.longitude)
    };

    directionsService.route(
      {
        origin: workerLocation,
        destination: taskLatLng,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true
      },
      (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          const route = result.routes[0].legs[0];
          setDistance(route.distance.text);
          setDuration(route.duration.text);
        } else {
          console.error('Directions request failed:', status);
          setError('Unable to calculate route. Please try again.');
        }
      }
    );
  }, [directionsService, directionsRenderer, workerLocation, taskLocation]);

  // Open Google Maps for navigation
  const handleStartNavigation = () => {
    if (!taskLocation) return;

    const destination = `${taskLocation.latitude},${taskLocation.longitude}`;
    const origin = workerLocation ? `${workerLocation.lat},${workerLocation.lng}` : '';
    
    // Detect if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    let mapsUrl;
    if (isMobile) {
      // Open in Google Maps app on mobile
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    } else {
      // Open in Google Maps website on desktop
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>
              🗺️ Navigate to Task Location
            </h2>
            {distance && duration && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#e0e7ff' }}>
                📍 {distance} • ⏱️ {duration}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            ×
          </button>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative', minHeight: '400px' }}>
          {loadingLocation && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#111827',
              zIndex: 10
            }}>
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📍</div>
                <p>Getting your location...</p>
              </div>
            </div>
          )}
          {error && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#111827',
              zIndex: 10
            }}>
              <div style={{ textAlign: 'center', color: '#ef4444', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                <p>{error}</p>
              </div>
            </div>
          )}
          <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
        </div>

        {/* Action Buttons */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {workerLocation && taskLocation && !error && (
            <>
              <button
                onClick={handleStartNavigation}
                style={{
                  flex: 1,
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                🧭 Start Navigation in Google Maps
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '0.875rem 1.5rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#d1d5db',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              >
                Close
              </button>
            </>
          )}
          {!workerLocation && !error && !loadingLocation && (
            <p style={{ color: '#9ca3af', margin: 0, width: '100%', textAlign: 'center' }}>
              Location permission required to show navigation
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskNavigationMap;
