let startLoading = null;
let stopLoading = null;

export function registerLoadingController(start, stop) {
  startLoading = start;
  stopLoading = stop;
}

export function showLoading() {
  startLoading?.();
}

export function hideLoading() {
  stopLoading?.();
}