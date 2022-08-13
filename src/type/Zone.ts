export type ZoneType = 'dict' | 'pdf' | 'video' | 'cardMaker';

export type ZoneDefinition = {
  id: string | number;
  type: ZoneType;
  data: any;
  title: string;
  fullScreen: boolean;
};
