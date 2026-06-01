// Haversine formula to calculate distance between two coordinates in kilometers
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  
  return d;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Calculate ETA in minutes based on distance and average speed (km/h)
export const calculateETA = (distance, averageSpeed = 20) => {
  if (distance <= 0) return 0;
  // Time = Distance / Speed
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  return timeInMinutes;
};
