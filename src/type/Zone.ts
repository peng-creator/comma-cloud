export type ZoneType = 'pdf' | 'video' | 'cardMaker' | 'cardReviewer' | 'subtitle' | 'remoteController' | 'resourceLoader';

export type ZoneDefinition = {
  id: string;
  type: ZoneType;
  data: any;
  title: string;
  multiLayout?: boolean;
  registerTimeStamp?: number;
};
