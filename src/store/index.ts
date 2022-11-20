import { useEffect, useRef, useState } from "react";
import { auditTime, BehaviorSubject, combineLatest, ObservableInputTuple, Subject, tap } from "rxjs";
import { useBehavior } from "../state";

type State = {
    [prop: string]: any;
}

export const buildStore = <T extends State>(initalState: T) => {
    type OnlyStringKeys<T> = { [K in keyof T]: K extends string ? K : never }[keyof T];
    type StateKeys = OnlyStringKeys<T>;
    type StateStremKeys = `${StateKeys}$`;
    type OriginKey<Key> = Key extends `${infer K}$` ? K : never;

    let states: any[] = [];
    const stateNames = Object.keys(initalState);
    const stateInputStreams = stateNames.map((stateName) => {
        return new BehaviorSubject(initalState[stateName]);
    });
    const stateOutputStreams = stateNames.map((stateName) => {
        return new BehaviorSubject(initalState[stateName]);
    });
    combineLatest(stateInputStreams).pipe(
        tap((nextStates) => {
            states = nextStates;
        }),
        auditTime(1000 / 60),
    ).subscribe({
        next(nextStates) {
            nextStates.forEach((state, index) => {
                stateOutputStreams[index].next(state);
            });
        }
    });
    return stateNames.reduce((acc, stateName, index) => {
        Object.defineProperty(acc, stateName, {
            get() {
                return states[index];
            },
            set(value) {
                console.log('stateName:', stateName, ' next Value:', value);
                stateInputStreams[index].next(value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(acc, stateName + '$', {
            get() {
                return stateOutputStreams[index];
            },
            enumerable: true,
            configurable: true
        });
        return acc;
    }, {} as any) as (T & {[key in StateStremKeys]: BehaviorSubject<T[OriginKey<key>]>});
}

const listenStoreChange = <T extends State>(store: any, initalState: T) => {
    const stateNames = Object.keys(initalState);
    stateNames.forEach((stateName) => {
        useBehavior(store[stateName + '$'], initalState[stateName]);
    })
};

export const useStore = <T extends State>(initalState: T) => {
    const [store] = useState(buildStore(initalState));
    listenStoreChange(store, initalState);
    return store;
}

export const useActionOnStreams = <T extends readonly unknown[]>(streams: [...ObservableInputTuple<T>], action: (...states: T) => void, ) => {
    useEffect(() => {
        const sp = combineLatest(streams).pipe(
            auditTime(1000 / 60),
        ).subscribe({
            next(nextStates) {
                action(...nextStates);
            }
        });
        return () => sp.unsubscribe();
    }, []);
};
