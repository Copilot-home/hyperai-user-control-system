import { Notification } from 'react-native';

class NotificationService {
    static showNotification(title: string, message: string) {
        Notification.show({
            title: title,
            message: message,
            duration: 3000, // Duration in milliseconds
            position: 'top', // Position of the notification
        });
    }

    static scheduleNotification(title: string, message: string, date: Date) {
        // Logic to schedule a notification at a specific date and time
        // This can be implemented using libraries like react-native-push-notification
    }

    static cancelNotification(notificationId: string) {
        // Logic to cancel a scheduled notification
        // This can be implemented using libraries like react-native-push-notification
    }
}

export default NotificationService;