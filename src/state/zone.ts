import { BehaviorSubject, Subject } from 'rxjs';

export const isDraggingSplitBar$ = new BehaviorSubject(false);
export const dragWindowStart$ = new Subject<any>();
export const dragWindowEnd$ = new Subject<any>();
