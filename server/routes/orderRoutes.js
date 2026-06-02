import express from 'express';
import {
  createOrder,
  getPendingOrders,
  acceptOrder,
  updateOrderStatus,
  getOrderById,
  getActiveOrder,
  getOrderTracking,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').post(protect, createOrder);
router.route('/pending').get(protect, getPendingOrders);
router.route('/active').get(protect, getActiveOrder);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/tracking').get(protect, getOrderTracking);
router.route('/:id/accept').put(protect, acceptOrder);
router.route('/:id/status').put(protect, updateOrderStatus);

export default router;
