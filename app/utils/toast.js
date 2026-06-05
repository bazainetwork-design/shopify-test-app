import { useAppBridge } from '@shopify/app-bridge-react';

export function useToast() {
  const app = useAppBridge();

  const success = (message) => {
    app.toast.show(message);
  };

  const error = (message) => {
    app.toast.show(message, {
      isError: true,
    });
  };

  return {
    success,
    error,
  };
}