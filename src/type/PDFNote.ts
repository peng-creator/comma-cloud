
export type PDFNote = {
  page: number;
  file: string;
  start: number; // 连续高亮的 start
  end: number; // 连续高亮的 end
  discreteIndexes?: number[]; // 单独高亮的
  content: string;
  id?: string;
};
