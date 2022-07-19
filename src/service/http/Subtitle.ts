import { Subtitle } from '../../type/Subtitle';
import { axiosInstancePromise } from './index';

export const getSubtitlesOfVideo = async (filePath: string) => {
  const axios = await axiosInstancePromise;
  return axios.get('/video/subtitle/' + encodeURIComponent(filePath)).then(res => res.data);
};

export const saveSubtitlesOfVideo = async (filePath: string, subtitles: Subtitle[]) => {
  const axios = await axiosInstancePromise;
  return axios.post('/video/subtitle/' + encodeURIComponent(filePath), subtitles).then(res => res.data);
};
