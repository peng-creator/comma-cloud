import { axiosInstancePromise } from ".";

export type Record = {
  file: string;
  type: 'pdf' | 'video';
  progress: any;
  timestamp?: number;
};

type RecordCache = {[key: string]: Record};

export const getRecords = async () => {
  const axios = await axiosInstancePromise;
  return axios.get('/record').then(res => res.data as Record[]);
}

export const saveRecord = async (record: Record) => {
  const axios = await axiosInstancePromise;
  return axios.post('/record', record);
}