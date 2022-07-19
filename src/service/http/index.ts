import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://192.168.50.222:8080/api/',
  timeout: 5000,
  // headers: {'X-Custom-Header': 'foobar'}
});

export const axiosInstancePromise = Promise.resolve(instance);