import { auditTime, BehaviorSubject, combineLatest, Observable } from "rxjs";
import { useObservable } from "../state";

type State = {
    [prop: string]: any;
};

export const buildStore = <T extends State, I extends State>(initalState: T) => {
    type OnlyStringKeys<T> = { [K in keyof T]: K extends string ? K : never }[keyof T];
    type StateKeys = OnlyStringKeys<T>;
    type StateStremKeys = `${StateKeys}$`;
    type OriginKey<Key> = Key extends `${infer K}$` ? K : never;

    let states: any = {...initalState};
    const stateNames = Object.keys(initalState);
    const stateStreams = stateNames.map((stateName) => {
        return new BehaviorSubject(initalState[stateName]);
    });
    const store = stateNames.reduce((acc, stateName, index) => {
        Object.defineProperty(acc, stateName, {
            get() {
                console.log('store debug, getting state ', stateName, ' from store:', states[stateName]);
                return states[stateName];
            },
            set(value) {
                stateStreams[index].next(value);
                states[stateName] = value;
                console.log('store debug, setting state ', stateName, ' to store:', value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(acc, stateName + '$', {
            get() {
                return stateStreams[index];
            },
            enumerable: true,
            configurable: true
        });
        return acc;
    }, {} as any) as (T & {[key in StateStremKeys]: BehaviorSubject<T[OriginKey<key>]>});

    let innerState: I = {} as any;
    const renderOnStore = <P extends I>(latestInnerState: P) => {
        innerState = latestInnerState || {} as any;
        const stateNames = Object.keys(initalState);
        stateNames.forEach((stateName) => {
            useObservable(store[stateName + '$'], initalState[stateName]);
        });
    };
    return { store, renderOnStore, getInnerState: () => innerState,  };
}

export const takeActionOnStreams = <T extends any[]>(action: (values: T) => void, ...streams: { [I in keyof T]: Observable<T[I]> }) => {
    const sp = combineLatest(streams).pipe(
        auditTime(1000 / 60),
    ).subscribe({
        next(streamValues) {
            action(streamValues as any);
        }
    });
    return () => sp.unsubscribe();
};
