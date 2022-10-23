import { message } from 'antd';
import { Subtitle } from '../../type/Subtitle';
import { axiosInstancePromise } from './index';

export const getSubtitlesOfVideo = async (filePath: string) => {
  const axios = await axiosInstancePromise;
  const hide = message.loading('加载字幕中...');
  return axios.get('/video/subtitle/' + encodeURIComponent(filePath)).then(res => res.data as Subtitle[]).finally(() => {
    hide();
  });
};

export const reloadSubtitlesOfVideo = async (filePath: string) => {
  const axios = await axiosInstancePromise;
  const hide = message.loading('重载字幕中...');
  return axios.get('/reload/video/subtitle/' + encodeURIComponent(filePath)).then(res => res.data as Subtitle[]).finally(() => {
    hide();
  });
};


export const saveSubtitlesOfVideo = async (filePath: string, subtitles: Subtitle[]) => {
  const axios = await axiosInstancePromise;
  return axios.post('/video/subtitle/' + encodeURIComponent(filePath), subtitles).then(res => res.data);
};
