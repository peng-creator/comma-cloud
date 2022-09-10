import axios from 'axios';
import { host } from '../../utils/host';

const instance = axios.create({
  baseURL: `http://${host}:8080/api/`,
  timeout: 15000,
  // headers: {'X-Custom-Header': 'foobar'}
});

export const axiosInstancePromise = Promise.resolve(instance);