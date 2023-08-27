import { isFullscreen$ } from "../state/system";

const ele: any = document.querySelector('#root');

ele.onfullscreenchange = (event: any) => {
      console.log('onfullscreenchange:', event);
      let elem = event.target;
      let isFullscreen = document.fullscreenElement === elem;
      isFullscreen$.next(isFullscreen);
    };

export const fullscreen = () => {
    return (ele.requestFullscreen || ele.mozRequestFullScreen || ele.webkitRequestFullscreen || ele.msRequestFullscreen || async function() {}).bind(ele)().then(() => {
        isFullscreen$.next(true);
    });
}

export const exitFullScreen = () => {
    return document.exitFullscreen().then(() => {
        isFullscreen$.next(false);
    });
}