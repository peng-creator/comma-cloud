import { FlashCard } from './../../type/FlashCard';
import { axiosInstancePromise } from ".";

export const getCardCollection = async (collectionName: string): Promise<FlashCard[]> => {
  const axios = await axiosInstancePromise;
  return axios.get('/card/' + collectionName).then(res => res.data as FlashCard[]);
}

export const getCardCollections = async () => {
  const axios = await axiosInstancePromise;
  return axios.get('/card').then(res => res.data);
}

export const searchCardCollections = async (search: string) => {
  const axios = await axiosInstancePromise;
  return axios.get('/card/collectionName/' + search).then(res => res.data);
}

export const saveCard = async (card: FlashCard) => {
  const axios = await axiosInstancePromise;
  return axios.post('/card/', card).then(res => res.data);
};
