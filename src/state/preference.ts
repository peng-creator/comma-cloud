import { BehaviorSubject, } from "rxjs";

export type UserPreference = {
    floatDict: boolean;
    subtitleFontSize: number;
};

const initUserPreference: UserPreference = {
    floatDict: true,
    subtitleFontSize: 18,
};

const userPreference: UserPreference = JSON.parse(localStorage.getItem('userPreference') || JSON.stringify(initUserPreference));


userPreference.floatDict === undefined && (userPreference.floatDict = true);

export const userPreference$ = new BehaviorSubject<UserPreference>(userPreference);

export const setUserPreference = (userPreference: UserPreference) => {
    localStorage.setItem('userPreference', JSON.stringify(userPreference));
    userPreference$.next({...userPreference});
};

export const getUserPreference = () => {
    return {...userPreference};
};
