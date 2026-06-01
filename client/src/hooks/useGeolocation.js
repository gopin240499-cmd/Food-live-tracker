import { useState, useEffect } from 'react';

// Custom hook for getting user's current geolocation
const useGeolocation = () => {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    const success = (pos) => {
      setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setLoading(false);
    };

    const fail = (err) => {
      setError(err.message);
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(success, fail, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, []);

  return { position, error, loading };
};

export default useGeolocation;
