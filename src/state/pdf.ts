import { PDFNote } from './../type/PDFNote';
import { BehaviorSubject } from "rxjs";

export const openFloatPDFNote$ = new BehaviorSubject<PDFNote | null>(null);
