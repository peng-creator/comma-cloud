import { Subject } from "rxjs";

type DirToOpen = string;

export const openDir$ = new Subject<DirToOpen>();