import { useLoadingContext } from '../contexts/LoadingContext';

export function useLoading() {
  return useLoadingContext();
}
