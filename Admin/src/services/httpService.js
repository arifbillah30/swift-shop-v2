import axios from 'axios';
import Cookies from 'js-cookie';

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
