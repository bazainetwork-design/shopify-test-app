import { useLoading } from "./LoadingProvider";

export const useRequest = () => {
  const { showLoading, hideLoading } = useLoading();

  const request = async (apiFn) => {
    showLoading();
    try {
      const res = await apiFn();
      return res;
    } finally {
      hideLoading();
    }
  };

  return { request };
};