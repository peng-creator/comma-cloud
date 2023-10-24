import { message } from 'antd';
import axios from 'axios';
import { expired$ } from '../../state/session';
import { host } from '../../utils/host';

const instance = axios.create({
  baseURL: `http://${host}:8080/api/`,
  timeout: 90000,
  // headers: {'X-Custom-Header': 'foobar'}
});
instance.interceptors.request.use((config) => {
  return config;
}, (error) => {
  console.log('on request error:', error);
  return Promise.reject(error);
});

instance.interceptors.response.use((res) => {
  return res;
}, (error) => {
  console.log('on response error:', error);
  if (error.response.status === 401) {
    console.log('401 error');
    localStorage.removeItem('sessionId');
    expired$.next('expired');
  }
  return Promise.reject(error);
});


export const axiosInstancePromise = Promise.resolve(instance);

export const unauthorizedCatch = () => {

}

export const reportError = async (error: any) => {
  const axios = await axiosInstancePromise;
  return axios.post('/error', {error}, );
}

window.addEventListener('error', (event) => {
  console.log('unexpected error:', event);
  if (event.message !== 'ResizeObserver loop limit exceeded') {
    reportError(event.error.stack);
  }
}, true);