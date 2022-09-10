import { axiosInstancePromise } from './index';

export const searchYoutubeVide = async (keyword: string, pageToken?: string) => {
  const axios = await axiosInstancePromise;
  if (pageToken) {
    return axios.get('/youtube/' + keyword + '/' + pageToken).then(res => res.data);
  }
  return axios.get('/youtube/' + keyword).then(res => res.data);
};

export const getYoutubeVideoSubtitle = async (videoId: string) => {
  const axios = await axiosInstancePromise;
  return axios.get('/youtube/subtitles/' + videoId).then(res => res.data);
};
