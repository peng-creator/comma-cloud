import axios from 'axios';
import { host } from '../../utils/host';

const instance = axios.create({
  baseURL: `http://${host}:8080/api/`,
  timeout: 15000,
  // headers: {'X-Custom-Header': 'foobar'}
});
instance.interceptors.request.use((config) => {
  return config;
}, (error) => {
  console.log('on request error:', error);
  return Promise.reject(error);
});

export const axiosInstancePromise = Promise.resolve(instance);

export const reportError = async (error: any) => {
  const axios = await axiosInstancePromise;
  return axios.post('/error', error);
}

window.addEventListener('error', (event) => {
  console.log('unexpected error:', event);
  reportError(event.message);
}, true);