import Order from '../models/Order.js';

// @desc    Create new order (dummy order)
// @route   POST /api/orders
// @access  Private (Customer)
export const createOrder = async (req, res) => {
  const { pickupLocation, deliveryLocation } = req.body;

  try {
    const order = new Order({
      customerId: req.user._id,
      pickupLocation,
      deliveryLocation,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all orders for delivery partner (pending)
// @route   GET /api/orders/pending
// @access  Private (Delivery Partner)
export const getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'pending' }).populate('customerId', 'name');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Accept order
// @route   PUT /api/orders/:id/accept
// @access  Private (Delivery Partner)
export const acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      if (order.status !== 'pending') {
        return res.status(400).json({ message: 'Order is no longer pending' });
      }

      order.status = 'accepted';
      order.deliveryPartnerId = req.user._id;
      
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update order status (picked_up, on_the_way, delivered)
// @route   PUT /api/orders/:id/status
// @access  Private (Delivery Partner)
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      // Validate that the user updating is the delivery partner assigned
      if (order.deliveryPartnerId.toString() !== req.user._id.toString()) {
         return res.status(403).json({ message: 'Not authorized for this order' });
      }

      order.status = status;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate('deliveryPartnerId', 'name email');

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
