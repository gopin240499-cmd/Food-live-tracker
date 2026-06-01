// Haversine formula — calculates distance between two lat/lng points in km
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

// Format distance for display
export const formatDistance = (km) => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

// Format ETA for display
export const formatETA = (minutes) => {
  if (minutes < 1) return 'Arriving now';
  if (minutes < 60) return `${Math.ceil(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.ceil(minutes % 60);
  return `${hrs}h ${mins}m`;
};

// Format speed for display
export const formatSpeed = (kmh) => {
  return `${Math.round(kmh)} km/h`;
};

// Format timestamp
export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate bearing/direction between two points
export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const dLon = deg2rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(deg2rad(lat2));
  const x =
    Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
    Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return ((brng * 180) / Math.PI + 360) % 360;
};
