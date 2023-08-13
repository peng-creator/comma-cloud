import { axiosInstancePromise } from './index';

export const loadDirChildren = async (dir: string) => {
  const axios = await axiosInstancePromise;
  return axios.get('/resource/children/' + encodeURIComponent(dir)).then(res => res.data);
};

export const searchFile = async (fileName: string, ext: string | string[]) => {
  const axios = await axiosInstancePromise;
  return axios.post('/resource/search', {
    fileName, ext
  }).then(res => res.data);
}