import { createContext, useContext, useState } from "react";

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);

  const showLoading = () => setLoadingCount((c) => c + 1);
  const hideLoading = () => setLoadingCount((c) => Math.max(0, c - 1));

  const loading = loadingCount > 0;

  return (
    <LoadingContext.Provider value={{ loading, showLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);