import {
  showLoading,
  hideLoading,
} from './loadingController';

export async function request(
  url,
  options
) {
  try {
    console.log('start loading');
    showLoading();

    const response = await fetch(url, options);
    return response;
  } finally {
    console.log('stop loading');
    hideLoading();
  }
}