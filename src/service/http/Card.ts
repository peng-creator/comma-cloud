import { FlashCard } from './../../type/FlashCard';
import { axiosInstancePromise } from ".";

export const getCardCollection = async (collectionName: string): Promise<FlashCard[]> => {
  const axios = await axiosInstancePromise;
  return axios.get('/card/' + collectionName).then(res => res.data as FlashCard[]);
}

export const getCardCollections = async () => {
  const axios = await axiosInstancePromise;
  return axios.get('/card').then(res => res.data as string[]);
}

export const searchCardCollections = async (search: string) => {
  const axios = await axiosInstancePromise;
  return axios.get('/card/collectionName/' + search).then(res => res.data);
}

export const saveCard = async (card: FlashCard) => {
  const axios = await axiosInstancePromise;
  return axios.post('/card/', card).then(res => res.data);
};

export const getCardToReview = async (time?: number) => {
  const axios = await axiosInstancePromise;
  return axios.get('/review/card/' + (time || (Date.now() + 2 * 60 * 60 * 1000))).then(res => res.data as FlashCard[]);
};

export const cardsByPage = async (pageSize: number, pageNumber: number) => {
  const axios = await axiosInstancePromise;
  return axios.get(`/card/${pageSize}/${pageNumber}`).then(res => res.data as FlashCard[]);
};

export const deleteCard = async (card: FlashCard) => {
  const axios = await axiosInstancePromise;
  return axios.delete(`/card/` + card.id);
}