// Order status constants
export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
};

// Socket event names
export const SOCKET_EVENTS = {
  JOIN_ORDER_ROOM: 'join_order_room',
  LOCATION_UPDATE: 'location_update',
  RECEIVE_LOCATION: 'receive_location',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_STATUS_UPDATE: 'order_status_update',
  DELIVERY_REACHED: 'delivery_reached',
  DELIVERY_ARRIVED: 'delivery_arrived',
  ETA_UPDATE: 'eta_update',
};

// User roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  DELIVERY: 'delivery',
};
