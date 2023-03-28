import { PDFNote } from './../type/PDFNote';
import { Subtitle } from './../type/Subtitle';
import { BehaviorSubject } from 'rxjs';

export const showFloatCardMaker$ = new BehaviorSubject<boolean>(false);

export const subtitleToBeAdded$ = new BehaviorSubject<Subtitle | null>(null);
export const pdfNoteToBeAdded$ = new BehaviorSubject<PDFNote | null>(null);
