import { Subject } from 'rxjs';
import { ZoneDefinition } from '../../type/Zone';
import { axiosInstancePromise } from './index';


export const registerZones = async (zones: ZoneDefinition[]) => {
  const axios = await axiosInstancePromise;
  return axios.post('/zone/register', zones).then(res => res.data);
};

export const closeZone = async (id: string | number) => {
  const axios = await axiosInstancePromise;
  return axios.delete('/zone/' + id).then(res => res.data);
}

export const getZones = async () => {
  const axios = await axiosInstancePromise;
  return axios.get('/zone').then(res => res.data as ZoneDefinition[]);
};
