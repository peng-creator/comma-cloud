export type ZoneType = 'dict' | 'pdf' | 'video' | 'cardMaker' | 'cardReviewer' | 'subtitle' | 'remoteController';

export type ZoneDefinition = {
  id: string;
  type: ZoneType;
  data: any;
  title: string;
  multiLayout?: boolean;
  registerTimeStamp?: number;
};
