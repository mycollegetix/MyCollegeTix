// components/NotificationDeepLinkHandler.tsx
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

export function NotificationDeepLinkHandler() {
  useEffect(() => {
    // Handle app opened from notification tap when app was killed/closed
    const handleInitialNotification = async () => {
      const initialNotification = await Notifications.getLastNotificationResponseAsync();
      
      if (initialNotification) {
        console.log('App opened from notification (killed state):', initialNotification);
        handleNotificationData(initialNotification.notification.request.content.data);
      }
    };

    // Handle deep links when app was killed/closed
    const handleInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      
      if (initialURL) {
        console.log('App opened from deep link (killed state):', initialURL);
        handleDeepLink(initialURL);
      }
    };

    handleInitialNotification();
    handleInitialURL();

    // Listen for deep links when app is running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      console.log('Deep link received (app running):', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      linkingSubscription?.remove();
    };
  }, []);

  const handleNotificationData = (data: any) => {
    if (!data) return;

    console.log('Handling notification data:', data);

    // Navigate based on notification data
    if (data.screen) {
      router.push(data.screen);
    } else if (data.ticket_id) {
      router.push(`/ticket-details/${data.ticket_id}`);
    } else if (data.order_id) {
      router.push(`/orders?highlight=${data.order_id}`);
    } else if (data.notification_id) {
      router.push('/notifications');
    } else {
      // Default to notifications screen
      router.push('/notifications');
    }
  };

  const handleDeepLink = (url: string) => {
    const parsed = Linking.parse(url);
    const { hostname, path, queryParams } = parsed;

    console.log('Parsed deep link:', { hostname, path, queryParams });

    // Handle different deep link patterns
    if (path === '/ticket-details' && queryParams?.id) {
      router.push(`/ticket-details/${queryParams.id}`);
    } else if (path === '/notifications') {
      router.push('/notifications');
    } else if (path === '/orders') {
      if (queryParams?.highlight) {
        router.push(`/orders?highlight=${queryParams.highlight}`);
      } else {
        router.push('/orders');
      }
    } else if (path === '/profile') {
      router.push('/profile');
    } else if (path === '/sell') {
      router.push('/sell');
    } else {
      // Default to home screen
      router.push('/(tabs)');
    }
  };

  // This component doesn't render anything
  return null;
}

export default NotificationDeepLinkHandler;