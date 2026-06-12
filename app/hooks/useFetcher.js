import { useEffect } from 'react';
import { useFetcher } from "react-router";
import { showLoading, hideLoading } from '../utils/loadingController';

export function useGlobalFetcher() {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === 'loading' || fetcher.state === 'submitting') {
      showLoading();
    } else {
      hideLoading();
    }
  }, [fetcher.state]);

  return fetcher;
}