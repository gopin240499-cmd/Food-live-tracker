import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import useToast from '../hooks/useToast';
import Toast from '../components/Toast';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';
import api from '../services/api';
import { SOCKET_EVENTS, ORDER_STATUS } from '../constants';
import { formatDistance, formatETA, calculateDistance, calculateBearing } from '../utils/locationUtils';
import { slideUp } from '../animations/variants';

const libraries = ['places'];
const mapContainerStyle = { width: '100%', height: 'calc(100vh - 72px)' };
const defaultCenter = { lat: 28.6139, lng: 77.2090 };

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast, showToast, hideToast } = useToast();

  const [map, setMap] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [directions, setDirections] = useState(null);
  const [eta, setEta] = useState(null);
  const [distanceRemaining, setDistanceRemaining] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  const trackingIntervalRef = useRef(null);
  const simulationIndexRef = useRef(0);
  const routePathRef = useRef([]);

  // *** FIX: Use refs to always have the latest socket and activeOrder inside setInterval ***
  const socketRef = useRef(socket);
  const activeOrderRef = useRef(activeOrder);
  const userRef = useRef(user);

  // Keep refs in sync with state
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { activeOrderRef.current = activeOrder; }, [activeOrder]);
  useEffect(() => { userRef.current = user; }, [user]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Fetch pending orders
  const fetchPendingOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data } = await api.get('/orders/pending');
      setPendingOrders(data);
    } catch (err) {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      setLoadingOrders(true);
      try {
        const { data: active } = await api.get('/orders/active');
        if (active) {
          setActiveOrder(active);
          if (socket) {
            socket.emit(SOCKET_EVENTS.JOIN_ORDER_ROOM, active._id);
          }
        } else {
          fetchPendingOrders();
        }
      } catch (err) {
        showToast('Failed to load active status', 'error');
        fetchPendingOrders();
      } finally {
        setLoadingOrders(false);
      }
    };
    initDashboard();
  }, [socket]);

  // Resume tracking if active order is on the way
  useEffect(() => {
    if (activeOrder && activeOrder.status === ORDER_STATUS.ON_THE_WAY && currentPosition && isLoaded && !isTracking) {
      console.log('[Delivery] Resuming route tracking for active order');
      initiateRouteTracking(activeOrder, currentPosition);
    }
  }, [activeOrder, currentPosition, isLoaded, isTracking, initiateRouteTracking]);

  // Get current position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setCurrentPosition(defaultCenter);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (map && window.google) {
      setTimeout(() => {
        window.google.maps.event.trigger(map, 'resize');
      }, 300);
    }
  }, [map]);

  // Accept an order
  const handleAcceptOrder = async (orderId) => {
    setAcceptingId(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/accept`);
      setActiveOrder(data);
      setPendingOrders([]);
      showToast('Order accepted! Start delivery.', 'success');

      // Notify customer via socket
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_ORDER_ROOM, orderId);
        socket.emit(SOCKET_EVENTS.ORDER_ACCEPTED, {
          orderId,
          deliveryPartnerId: user._id,
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept order', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  // Mark delivery as complete
  const completeDelivery = async () => {
    const currentOrder = activeOrderRef.current;
    const currentSocket = socketRef.current;

    if (!currentOrder) return;

    try {
      await api.put(`/orders/${currentOrder._id}/status`, { status: ORDER_STATUS.DELIVERED });

      // Notify customer
      if (currentSocket) {
        currentSocket.emit(SOCKET_EVENTS.DELIVERY_REACHED, { orderId: currentOrder._id });
      }

      setActiveOrder((prev) => ({ ...prev, status: ORDER_STATUS.DELIVERED }));
      showToast('Delivery completed! 🎉', 'success');

      // Reset after a short delay
      setTimeout(() => {
        setActiveOrder(null);
        setDirections(null);
        setDistanceRemaining(null);
        setEta(null);
        fetchPendingOrders();
      }, 3000);
    } catch (err) {
      showToast('Failed to complete delivery', 'error');
    }
  };

  // Separate function to stop tracking and complete delivery (avoids stale closure for handleDeliveryComplete)
  const stopTrackingAndComplete = () => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setIsTracking(false);
    completeDelivery();
  };

  // Simulate location tracking along the route
  const startTracking = () => {
    setIsTracking(true);

    trackingIntervalRef.current = setInterval(() => {
      const path = routePathRef.current;
      const index = simulationIndexRef.current;

      if (index >= path.length) {
        // Reached destination
        stopTrackingAndComplete();
        return;
      }

      const point = path[index];
      const prevPoint = index > 0 ? path[index - 1] : point;

      // Calculate bearing for direction
      const bearing = calculateBearing(prevPoint.lat, prevPoint.lng, point.lat, point.lng);
      const speed = 15 + Math.random() * 15; // Simulate 15-30 km/h

      setCurrentPosition(point);

      // *** FIX: Use refs instead of stale closure variables ***
      const currentSocket = socketRef.current;
      const currentOrder = activeOrderRef.current;
      const currentUser = userRef.current;

      if (currentSocket && currentOrder) {
        console.log('[Delivery] Emitting location:', point.lat.toFixed(4), point.lng.toFixed(4), 'for order:', currentOrder._id);
        currentSocket.emit(SOCKET_EVENTS.LOCATION_UPDATE, {
          orderId: currentOrder._id,
          deliveryPartnerId: currentUser?._id,
          latitude: point.lat,
          longitude: point.lng,
          speed,
          direction: bearing,
        });
      } else {
        console.warn('[Delivery] Cannot emit — socket:', !!currentSocket, 'order:', !!currentOrder);
      }

      // Calculate remaining distance
      if (currentOrder) {
        const dest = currentOrder.deliveryLocation;
        const dist = calculateDistance(point.lat, point.lng, dest.lat, dest.lng);
        setDistanceRemaining(dist);
        setEta(Math.ceil((dist / 20) * 60)); // ~20 km/h average

        // Arrival detection (within 50 meters)
        if (dist < 0.05) {
          stopTrackingAndComplete();
          return;
        }
      }

      // Move to next point
      simulationIndexRef.current = index + 1;
    }, 3000); // Send location every 3 seconds
  };

  const initiateRouteTracking = useCallback((order, startPos) => {
    if (!order || !startPos || !isLoaded || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: startPos,
        destination: {
          lat: order.deliveryLocation.lat,
          lng: order.deliveryLocation.lng,
        },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
          // Extract path points for simulation
          const path = result.routes[0].overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }));
          routePathRef.current = path;
          simulationIndexRef.current = 0;
          startTracking();
        }
      }
    );
  }, [isLoaded]);

  // Start delivery — begin sending location updates
  const handleStartDelivery = async () => {
    if (!activeOrder || !currentPosition) return;

    // Update order status to on_the_way
    try {
      await api.put(`/orders/${activeOrder._id}/status`, { status: ORDER_STATUS.ON_THE_WAY });
      setActiveOrder((prev) => ({ ...prev, status: ORDER_STATUS.ON_THE_WAY }));

      // *** FIX: Emit status change to customer via socket ***
      if (socket) {
        socket.emit(SOCKET_EVENTS.ORDER_ACCEPTED, {
          orderId: activeOrder._id,
          deliveryPartnerId: user._id,
          status: ORDER_STATUS.ON_THE_WAY,
        });
      }

      initiateRouteTracking(activeOrder, currentPosition);
    } catch (err) {
      showToast('Failed to start delivery', 'error');
    }
  };

  // Manual completion button handler
  const handleDeliveryComplete = () => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setIsTracking(false);
    completeDelivery();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, []);

  // Update map directions when position changes
  useEffect(() => {
    if (!currentPosition || !activeOrder || !isLoaded || !isTracking) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: currentPosition,
        destination: {
          lat: activeOrder.deliveryLocation.lat,
          lng: activeOrder.deliveryLocation.lng,
        },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') setDirections(result);
      }
    );
  }, [currentPosition, activeOrder, isLoaded, isTracking]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader size="lg" text="Loading Google Maps..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <Toast {...toast} onClose={hideToast} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left panel — Orders or Active Delivery */}
        <div className="w-full lg:w-[400px] bg-white border-r border-gray-100 overflow-y-auto shadow-lg">
          {/* Active Order Section */}
          {activeOrder ? (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">Active Delivery</h2>
                <StatusBadge status={activeOrder.status} />
              </div>

              {/* Order Info Card */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-gray-500">Order #{activeOrder._id?.slice(-8)}</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-sm mt-0.5">📍</span>
                    <div>
                      <p className="text-xs text-gray-400">Pickup</p>
                      <p className="text-sm text-gray-700 font-medium">{activeOrder.pickupLocation?.address || 'Restaurant'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 text-sm mt-0.5">📍</span>
                    <div>
                      <p className="text-xs text-gray-400">Drop-off</p>
                      <p className="text-sm text-gray-700 font-medium">{activeOrder.deliveryLocation?.address || 'Customer'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {isTracking && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-500 font-medium mb-1">Distance Left</p>
                    <p className="text-xl font-bold text-blue-600">
                      {distanceRemaining ? formatDistance(distanceRemaining) : '--'}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-orange-500 font-medium mb-1">ETA</p>
                    <p className="text-xl font-bold text-orange-600">
                      {eta ? formatETA(eta) : '--'}
                    </p>
                  </div>
                </div>
              )}

              {/* Connection Indicator */}
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className={isTracking ? 'text-green-600' : 'text-gray-400'}>
                  {isTracking ? 'Broadcasting location...' : 'Ready to start'}
                </span>
              </div>

              {/* Action Buttons */}
              {activeOrder.status === 'accepted' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartDelivery}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-green-200 cursor-pointer"
                >
                  🚀 Start Delivery
                </motion.button>
              )}

              {isTracking && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeliveryComplete}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-200 cursor-pointer"
                >
                  ✅ Mark as Delivered
                </motion.button>
              )}
            </div>
          ) : (
            /* Pending Orders List */
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-800">Pending Orders</h2>
                <button
                  onClick={fetchPendingOrders}
                  className="text-xs text-orange-500 font-medium hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {loadingOrders ? (
                <Loader text="Loading orders..." />
              ) : pendingOrders.length === 0 ? (
                <motion.div
                  {...slideUp}
                  className="text-center py-16"
                >
                  <div className="text-5xl mb-4">🍜</div>
                  <p className="text-gray-500 font-medium">No pending orders</p>
                  <p className="text-gray-400 text-sm mt-1">Pull to refresh or check back later</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {pendingOrders.map((order, i) => (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-400">
                            #{order._id?.slice(-6)}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-500">📍</span>
                            <span className="text-gray-600 truncate">{order.pickupLocation?.address || 'Restaurant'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-red-500">📍</span>
                            <span className="text-gray-600 truncate">{order.deliveryLocation?.address || 'Customer'}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                          Customer: {order.customerId?.name || 'Unknown'}
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAcceptOrder(order._id)}
                          disabled={acceptingId === order._id}
                          className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl text-sm disabled:opacity-50 cursor-pointer"
                        >
                          {acceptingId === order._id ? 'Accepting...' : '🛵 Accept Order'}
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Section */}
        <div className="flex-1 relative h-[calc(100vh-72px)]">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={currentPosition || defaultCenter}
            zoom={14}
            onLoad={setMap}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              styles: [
                { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                { featureType: 'transit', stylers: [{ visibility: 'off' }] },
              ],
            }}
          >
            {/* Delivery Partner (me) */}
            {currentPosition && (
              <Marker
                position={currentPosition}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="%2322c55e" stroke="white" stroke-width="3"/><text x="22" y="28" text-anchor="middle" font-size="20">🛵</text></svg>'
                  ),
                  scaledSize: isLoaded ? new window.google.maps.Size(48, 48) : undefined,
                  anchor: isLoaded ? new window.google.maps.Point(24, 24) : undefined,
                }}
                title="You (Delivery Partner)"
              />
            )}

            {/* Customer marker */}
            {activeOrder && (
              <Marker
                position={{
                  lat: activeOrder.deliveryLocation.lat,
                  lng: activeOrder.deliveryLocation.lng,
                }}
                label={{ text: '🏠', fontSize: '22px' }}
                title="Customer Location"
              />
            )}

            {/* Route */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#22c55e',
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                  },
                }}
              />
            )}
          </GoogleMap>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
