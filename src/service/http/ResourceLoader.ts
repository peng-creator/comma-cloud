import { axiosInstancePromise } from './index';

export const loadDirChildren = async (dir: string) => {
  const axios = await axiosInstancePromise;
  return axios.get('/resource/children/' + encodeURIComponent(dir)).then(res => res.data);
};
