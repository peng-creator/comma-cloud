import { BehaviorSubject, } from "rxjs";
import { defaultIntensiveStrategy, SubtitlePlayStrategy } from "../type/SubtitlePlayStrategy";

export type UserPreference = {
    floatDict: boolean;
    subtitleFontSize: number;
    intensiveStrategy: SubtitlePlayStrategy;
};

const initUserPreference: UserPreference = {
    floatDict: true,
    subtitleFontSize: 18,
    intensiveStrategy: defaultIntensiveStrategy,
};

const userPreference: UserPreference = JSON.parse(localStorage.getItem('userPreference') || JSON.stringify(initUserPreference));


userPreference.floatDict === undefined && (userPreference.floatDict = true);
userPreference.subtitleFontSize === undefined && (userPreference.subtitleFontSize = 18);
userPreference.intensiveStrategy === undefined && (userPreference.intensiveStrategy = defaultIntensiveStrategy);

export const userPreference$ = new BehaviorSubject<UserPreference>(userPreference);

export const setUserPreference = (userPreference: UserPreference) => {
    localStorage.setItem('userPreference', JSON.stringify(userPreference));
    userPreference$.next({...userPreference});
};

export const getUserPreference = () => {
    return {...userPreference};
};
