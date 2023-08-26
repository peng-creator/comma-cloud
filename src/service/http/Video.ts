import { message } from 'antd';
import { Subtitle } from '../../type/Subtitle';
import { axiosInstancePromise } from './index';
import { ITitle } from './interfaces';
import { ShowResponse, TvSeasonResponse } from 'moviedb-promise';

export type VideoInfo = {
  summary?: ITitle;
  tvInfo?: ShowResponse;
  seasonInfoList?: TvSeasonResponse[];
};

export const searchVideoInfo = async (query: string) => {
  const axios = await axiosInstancePromise;
  const hide = message.loading('搜索影视信息中...', 20000);
  return axios.get('/searchVideoInfo/' + encodeURIComponent(query)).then(res => res.data as VideoInfo).finally(() => {
    hide();
  });
};

export const saveSeasonInfoToHomepage = async (videoInfo: VideoInfo, seasonInfo: TvSeasonResponse, seasonDir: string) => {
  const axios = await axiosInstancePromise;
  return axios.post('/tv/collections', {
    videoInfo,
    seasonInfo,
    seasonDir,
  });
};

export const getGenres = async () => {
  const axios = await axiosInstancePromise;
  return axios.get('/tv/genres').then((res) => res.data as string[]);
};

export type CollectedSeason = {videoInfo: VideoInfo; seasonInfo: TvSeasonResponse; seasonDir: string; updateTime: number;};
export const getSeasonsByGenre = async (genre: string) => {
  const axios = await axiosInstancePromise;
  return axios.get('/tv/' + genre).then((res) => res.data as CollectedSeason[]);
}