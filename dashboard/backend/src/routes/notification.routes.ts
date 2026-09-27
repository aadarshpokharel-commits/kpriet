import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const notificationRouter = Router();

// Protect all notification routes with authentication
notificationRouter.use(authenticate);

notificationRouter.get('/', NotificationController.getUserNotifications);
notificationRouter.get('/unread-count', NotificationController.getUnreadCount);
notificationRouter.patch('/read-all', NotificationController.markAllAsRead);
notificationRouter.patch('/:id/read', NotificationController.markAsRead);
notificationRouter.delete('/clear-all', NotificationController.clearAll);
notificationRouter.delete('/:id', NotificationController.deleteNotification);
