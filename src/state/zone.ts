import { BehaviorSubject, Subject } from 'rxjs';
import { ZoneDefinition } from '../type/Zone';

export const isDraggingSplitBar$ = new BehaviorSubject(false);
export const dragWindowStart$ = new Subject<any>();
export const dragWindowEnd$ = new Subject<any>();

export const zoneHighlightInput$ = new Subject<string>();
export const zoneHighlightOutput$ = new Subject<string>();
export type ZoneId = string;
export const toggleLayout$ = new Subject<ZoneId>();
export const closeZone$ = new Subject<ZoneId>();
export const addZone$ = new Subject<Omit<ZoneDefinition, "id" | "registerTimeStamp">>();