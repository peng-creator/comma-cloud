export type ZoneType = 'dict' | 'pdf' | 'video' | 'cardMaker' | 'subtitle' | 'remoteController';

export type ZoneDefinition = {
  id: string;
  type: ZoneType;
  data: any;
  title: string;
  registerTimeStamp?: number;
};
