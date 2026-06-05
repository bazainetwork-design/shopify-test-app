import { useAppBridge } from '@shopify/app-bridge-react';

export function useToast() {
  const app = useAppBridge();

  return (message) =>{
    app.toast.show(message);
  }
}