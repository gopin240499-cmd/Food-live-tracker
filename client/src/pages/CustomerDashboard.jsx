import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import useToast from '../hooks/useToast';
import useGeolocation from '../hooks/useGeolocation';
import Toast from '../components/Toast';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import api from '../services/api';
import { SOCKET_EVENTS, ORDER_STATUS } from '../constants';
import { formatDistance, formatETA, formatSpeed, formatTime, calculateDistance } from '../utils/locationUtils';
import { slideUp, slideInRight } from '../animations/variants';

const libraries = ['places'];
const mapContainerStyle = { width: '100%', height: 'calc(100vh - 72px)' };
const defaultCenter = { lat: 28.6139, lng: 77.2090 }; // Delhi as default

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { position: myPosition, loading: geoLoading } = useGeolocation();
  const { toast, showToast, hideToast } = useToast();

  const [map, setMap] = useState(null);
  const [deliveryMarkerPosition, setDeliveryMarkerPosition] = useState(null);
  const [customerMarkerPosition, setCustomerMarkerPosition] = useState(null);
  const [directions, setDirections] = useState(null);
  const [order, setOrder] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [orderLoading, setOrderLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const animationRef = useRef(null);
  const previousPositionRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Set customer marker to current position
  useEffect(() => {
    if (myPosition) {
      setCustomerMarkerPosition(myPosition);
    }
  }, [myPosition]);

  // Initialize autocomplete service
  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    if (window.google) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapInstance);
    }
  }, []);

  useEffect(() => {
    if (map && window.google) {
      setTimeout(() => {
        window.google.maps.event.trigger(map, 'resize');
      }, 300);
    }
  }, [map]);

  // Listen for socket events
  useEffect(() => {
    if (!socket || !order) return;

    // Join order room
    socket.emit(SOCKET_EVENTS.JOIN_ORDER_ROOM, order._id);

    // Listen for live location
    socket.on(SOCKET_EVENTS.RECEIVE_LOCATION, (data) => {
      const newPos = { lat: data.latitude, lng: data.longitude };
      animateMarker(deliveryMarkerPosition, newPos);
      setSpeed(data.speed || 0);
    });

    // Listen for ETA updates
    socket.on(SOCKET_EVENTS.ETA_UPDATE, (data) => {
      setEta(data.eta);
      setDistance(data.distance);
    });

    // Listen for order status
    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATE, (data) => {
      setOrder((prev) => ({ ...prev, status: data.status }));
      showToast(`Order ${data.status.replace('_', ' ')}!`, 'info');
    });

    // Listen for delivery arrival
    socket.on(SOCKET_EVENTS.DELIVERY_ARRIVED, (data) => {
      showToast(data.message, 'success');
      setOrder((prev) => ({ ...prev, status: ORDER_STATUS.DELIVERED }));
    });

    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_LOCATION);
      socket.off(SOCKET_EVENTS.ETA_UPDATE);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_UPDATE);
      socket.off(SOCKET_EVENTS.DELIVERY_ARRIVED);
    };
  }, [socket, order]);

  // Smooth marker animation using requestAnimationFrame
  const animateMarker = (from, to) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const start = from || to;
    const duration = 1000; // 1 second transition
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const lat = start.lat + (to.lat - start.lat) * eased;
      const lng = start.lng + (to.lng - start.lng) * eased;

      setDeliveryMarkerPosition({ lat, lng });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    previousPositionRef.current = to;
  };

  // Fetch directions when delivery partner position and customer position are both available
  useEffect(() => {
    if (!deliveryMarkerPosition || !customerMarkerPosition || !isLoaded) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: deliveryMarkerPosition,
        destination: customerMarkerPosition,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
        }
      }
    );
  }, [deliveryMarkerPosition, customerMarkerPosition, isLoaded]);

  // Place search with debounce
  const handlePlaceSearch = useCallback((value) => {
    setDeliveryAddress(value);
    if (!autocompleteServiceRef.current || value.length < 3) {
      setSearchResults([]);
      return;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      { input: value, componentRestrictions: { country: 'in' } },
      (predictions, status) => {
        if (status === 'OK' && predictions) {
          setSearchResults(predictions);
        } else {
          setSearchResults([]);
        }
      }
    );
  }, []);

  // Select a place from search results
  const handleSelectPlace = (place) => {
    setDeliveryAddress(place.description);
    setSearchResults([]);

    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        { placeId: place.place_id, fields: ['geometry'] },
        (result, status) => {
          if (status === 'OK' && result.geometry) {
            const pos = {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
            };
            setCustomerMarkerPosition(pos);
            map?.panTo(pos);
          }
        }
      );
    }
  };

  // Create a dummy order
  const handleCreateOrder = async () => {
    if (!customerMarkerPosition || !deliveryAddress) {
      showToast('Please select a delivery location', 'warning');
      return;
    }
    setOrderLoading(true);
    try {
      const pickupLocation = {
        lat: myPosition?.lat || defaultCenter.lat,
        lng: myPosition?.lng || defaultCenter.lng,
        address: 'Restaurant Location (Simulated)',
      };
      const deliveryLocation = {
        lat: customerMarkerPosition.lat,
        lng: customerMarkerPosition.lng,
        address: deliveryAddress,
      };
      const { data } = await api.post('/orders', { pickupLocation, deliveryLocation });
      setOrder(data);
      setShowCreateModal(false);
      showToast('Order created! Waiting for a rider...', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create order', 'error');
    } finally {
      setOrderLoading(false);
    }
  };

  // Map marker for the customer (draggable)
  const handleCustomerDrag = (e) => {
    setCustomerMarkerPosition({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
  };

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
        {/* Map Section */}
        <div className="flex-1 relative h-[calc(100vh-72px)]">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={myPosition || defaultCenter}
            zoom={14}
            onLoad={onMapLoad}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
              styles: [
                { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                { featureType: 'transit', stylers: [{ visibility: 'off' }] },
              ],
            }}
          >
            {/* Customer Marker — draggable */}
            {customerMarkerPosition && (
              <Marker
                position={customerMarkerPosition}
                draggable={!order}
                onDragEnd={handleCustomerDrag}
                label={{ text: '📍', fontSize: '24px' }}
                title="Your delivery location"
              />
            )}

            {/* Delivery Partner Marker — animated */}
            {deliveryMarkerPosition && (
              <Marker
                position={deliveryMarkerPosition}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23f97316" stroke="white" stroke-width="3"/><text x="20" y="26" text-anchor="middle" font-size="18">🛵</text></svg>'
                  ),
                  scaledSize: new window.google.maps.Size(44, 44),
                  anchor: new window.google.maps.Point(22, 22),
                }}
                title="Delivery Partner"
              />
            )}

            {/* Route Polyline */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#f97316',
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                  },
                }}
              />
            )}
          </GoogleMap>

          {/* Create Order FAB */}
          {!order && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="absolute bottom-6 right-6 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-orange-300 font-semibold text-sm flex items-center gap-2 cursor-pointer z-10"
            >
              <span className="text-lg">+</span> Create Order
            </motion.button>
          )}
        </div>

        {/* Tracking Panel — visible when order exists */}
        <AnimatePresence>
          {order && (
            <motion.div
              {...slideInRight}
              className="w-full lg:w-[380px] bg-white border-l border-gray-100 overflow-y-auto shadow-xl"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-gray-800">Order Tracking</h2>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs text-gray-400">Order ID: {order._id?.slice(-8)}</p>
                <p className="text-xs text-gray-400">Created: {formatTime(order.createdAt)}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 p-5 border-b border-gray-100">
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-orange-500 font-medium mb-1">ETA</p>
                  <p className="text-lg font-bold text-orange-600">{eta ? formatETA(eta) : '--'}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 font-medium mb-1">Distance</p>
                  <p className="text-lg font-bold text-blue-600">{distance ? formatDistance(distance) : '--'}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-500 font-medium mb-1">Speed</p>
                  <p className="text-lg font-bold text-green-600">{speed ? formatSpeed(speed) : '--'}</p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Delivery Status</h3>
                <div className="space-y-3">
                  {[
                    { key: 'pending', icon: '⏳', label: 'Order placed' },
                    { key: 'accepted', icon: '✅', label: 'Rider assigned' },
                    { key: 'picked_up', icon: '📦', label: 'Order picked up' },
                    { key: 'on_the_way', icon: '🛵', label: 'On the way to you' },
                    { key: 'delivered', icon: '🎉', label: 'Delivered' },
                  ].map((step, i) => {
                    const statusOrder = ['pending', 'accepted', 'picked_up', 'on_the_way', 'delivered'];
                    const currentIndex = statusOrder.indexOf(order.status);
                    const stepIndex = statusOrder.indexOf(step.key);
                    const isCompleted = stepIndex <= currentIndex;
                    const isActive = stepIndex === currentIndex;

                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all ${isCompleted
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                            : 'bg-gray-100 text-gray-400'
                            } ${isActive ? 'ring-2 ring-orange-300 ring-offset-2' : ''}`}
                        >
                          {step.icon}
                        </div>
                        <span
                          className={`text-sm ${isCompleted ? 'text-gray-800 font-medium' : 'text-gray-400'
                            }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Location Info */}
              <div className="p-5 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Delivery Location</h3>
                <p className="text-xs text-gray-500">{order.deliveryLocation?.address || 'N/A'}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Order Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Dummy Order">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Delivery Address</label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => handlePlaceSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm"
              placeholder="Search for delivery location..."
            />
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectPlace(result)}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 text-sm text-gray-700 border-b border-gray-50 last:border-0 cursor-pointer"
                  >
                    {result.description}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">
            💡 You can also drag the marker on the map to set the delivery location.
          </p>
          <button
            onClick={handleCreateOrder}
            disabled={orderLoading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-50 cursor-pointer"
          >
            {orderLoading ? <Loader size="sm" text="" /> : '🍔 Place Dummy Order'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDashboard;
