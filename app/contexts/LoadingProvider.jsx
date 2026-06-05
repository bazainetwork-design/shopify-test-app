import { registerLoadingController } from '../utils/loadingController';
import { createContext, useContext, useState, useEffect } from 'react';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [count, setCount] = useState(0);

  const startLoading = () => {
    setCount((prevCount) => prevCount + 1);
  }

  const stopLoading = () => {
    setCount((prevCount) => Math.max(prevCount - 1, 0));
  }

  useEffect(() => {
    registerLoadingController(
      startLoading,
      stopLoading
    );
  }, [])

  return (
    <LoadingContext.Provider
      value={{
        loading: count > 0,
        startLoading,
        stopLoading
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
