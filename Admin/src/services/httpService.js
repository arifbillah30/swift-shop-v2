//swift-shop-v2/Admin/src/services/httpService.js

import axios from 'axios';
import Cookies from 'js-cookie';
import { notifyError } from '../utils/toast';

const instance = axios.create({
  baseURL: `${process.env.REACT_APP_API_BASE_URL}`,
  timeout: 50000,
  headers: {
    Accept: 'application/json',
  },
});

console.log('API Base URL:', process.env.REACT_APP_API_BASE_URL);

// Add a request interceptor
instance.interceptors.request.use(function (config) {
  // Do something before request is sent
  let adminInfo;
  if (Cookies.get('adminInfo')) {
    adminInfo = JSON.parse(Cookies.get('adminInfo'));
  }

  let company;

  if (Cookies.get('company')) {
    company = Cookies.get('company');
  }

  // Handle FormData by removing Content-Type to let browser set it
  const headers = {
    authorization: adminInfo ? `Bearer ${adminInfo.token}` : null,
    company: company ? company : null,
  };

  // If the body is FormData, don't set Content-Type
  if (config.data instanceof FormData) {
    delete headers['Content-Type'];
  } else {
    headers['Content-Type'] = 'application/json';
  }

  return {
    ...config,
    headers: {
      ...config.headers,
      ...headers,
    },
  };
});

// Add a response interceptor for error handling
instance.interceptors.response.use(
  function (response) {
    // Any status code that lies within the range of 2xx causes this function to trigger
    return response;
  },
  function (error) {
    // Handle different types of errors
    if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
      notifyError('Database connection failed. Please check if the backend server is running.');
      return Promise.reject(new Error('Database connection failed'));
    }
    
    if (error.code === 'ECONNABORTED') {
      notifyError('Request timeout. Please check your connection and try again.');
      return Promise.reject(new Error('Request timeout'));
    }
    
    if (!error.response) {
      // Network error - server is likely down
      notifyError('Server is not responding. Please check if the backend server is running.');
      return Promise.reject(new Error('Server connection failed'));
    }
    
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    
    // Only show notifications for critical errors, not all HTTP errors
    switch (status) {
      case 401:
        notifyError('Authentication failed. Please login again.');
        // Optionally redirect to login
        // window.location.href = '/login';
        break;
      case 403:
        notifyError('Access denied. You do not have permission to perform this action.');
        break;
      case 500:
        notifyError('Server error. Please try again later.');
        break;
      case 503:
        notifyError('Service unavailable. Please try again later.');
        break;
      // Don't show notifications for 404 - let components handle these
      // Don't show notifications for other 4xx errors - they might be expected
      default:
        // Only show notification for unexpected server errors (5xx)
        if (status >= 500) {
          notifyError(message || 'An unexpected server error occurred.');
        }
    }
    
    return Promise.reject(error);
  }
);

const responseBody = (response) => response.data;

const requests = {
  get: (url, body, headers) =>
    instance.get(url, body, headers).then(responseBody),

  post: (url, body) => instance.post(url, body).then(responseBody),

  put: (url, body, headers) =>
    instance.put(url, body, headers).then(responseBody),

  patch: (url, body) => instance.patch(url, body).then(responseBody),

  delete: (url, body) => instance.delete(url, body).then(responseBody),
};

export default requests;
