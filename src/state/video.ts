import { BehaviorSubject, Subject } from "rxjs";
import { Subtitle } from "../type/Subtitle";

export const playSubtitle$ = new Subject<Subtitle>();
export const playSubtitleRecord$ = new BehaviorSubject<Subtitle & {zoneId: string} | null>(null);
export const playFloatVideoSubtitle$ = new BehaviorSubject<Subtitle | null>(null);
