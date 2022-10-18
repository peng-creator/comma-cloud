export class PlayHow {
    speed = 1;
    showSubtitle = false;

    constructor(speed = 1, showSubtitle = false) {
        this.speed = speed;
        this.showSubtitle = showSubtitle;
    }
}

export type SubtitlePlayStrategy = PlayHow[];

export const defaultIntensiveStrategy: SubtitlePlayStrategy = [
    new PlayHow(1, false),
    new PlayHow(1, false),
    new PlayHow(0.75, true),
    new PlayHow(0.75, false),
    new PlayHow(1, true),
];