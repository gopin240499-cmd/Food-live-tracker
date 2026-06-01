import Tracking from '../models/Tracking.js';
import Order from '../models/Order.js';
import { calculateDistance, calculateETA } from '../utils/locationUtils.js';

export const initializeTrackingSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a specific order room for tracking
    socket.on('join_order_room', (orderId) => {
      socket.join(orderId);
      console.log(`Socket ${socket.id} joined room: ${orderId}`);
    });

    // Handle incoming location updates from delivery partner
    socket.on('location_update', async (data) => {
      const { orderId, deliveryPartnerId, latitude, longitude, speed, direction } = data;

      try {
        // Broadcast the location immediately to everyone in the room (Customer)
        io.to(orderId).emit('receive_location', {
          latitude,
          longitude,
          speed,
          direction,
          timestamp: new Date()
        });

        // Optionally, save tracking data periodically to DB to avoid spamming
        // For simplicity, we just save it
        await Tracking.create({
          orderId,
          deliveryPartnerId,
          latitude,
          longitude,
          speed,
          direction
        });

        // Calculate ETA
        const order = await Order.findById(orderId);
        if (order) {
          const distance = calculateDistance(
            latitude,
            longitude,
            order.deliveryLocation.lat,
            order.deliveryLocation.lng
          );
          
          const eta = calculateETA(distance);
          order.eta = eta;
          await order.save();

          // Broadcast ETA update
          io.to(orderId).emit('eta_update', { eta, distance });
        }
      } catch (error) {
        console.error('Error handling location update:', error);
      }
    });

    // Handle delivery reached event
    socket.on('delivery_reached', async (data) => {
      const { orderId } = data;
      console.log(`Delivery reached for order: ${orderId}`);
      io.to(orderId).emit('delivery_arrived', { message: 'Your delivery partner has arrived!' });
    });

    // Handle order accepted notification
    socket.on('order_accepted', (data) => {
      const { orderId, deliveryPartnerId } = data;
      io.to(orderId).emit('order_status_update', { status: 'accepted', deliveryPartnerId });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
