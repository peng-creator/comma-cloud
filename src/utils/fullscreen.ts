export const fullscreen = (ele: any) => {
    return (ele.requestFullscreen || ele.mozRequestFullScreen || ele.webkitRequestFullscreen || ele.msRequestFullscreen || async function() {}).bind(ele)();
}