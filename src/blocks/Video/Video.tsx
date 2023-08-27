import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactPlayer from "react-player";
import {
  getSubtitlesOfVideo,
  saveSubtitlesOfVideo,
} from "../../service/http/Subtitle";
import { Subtitle } from "../../type/Subtitle";
import { Resizable } from "re-resizable";
import { host } from "../../utils/host";
import { BehaviorSubject } from "rxjs";
import { SubtitleComponent } from "../Subtitle/Subtitle";
import { remoteControlInput$, remoteControlOutput$ } from "../../state/remoteContol";
import { saveRecord } from "../../service/http/Records";
import { playSubtitle$, playSubtitleRecord$ } from "../../state/video";
import styles from './Video.module.css';
import { useStore } from "../../store";
import { message } from "antd";
import { useBehavior } from "../../state";
import { userPreference$, UserPreference } from "../../state/preference";
import { closeZone$ } from "../../state/zone";
import { getPlaylistByPlayingVideo } from "../../state/playlist";
import { fullscreen } from "../../utils/fullscreen";
import { isFullscreen$ } from "../../state/system";

type VideoState = {
  subtitles: Subtitle[];
  player: ReactPlayer | null;
  playing: boolean;
  loopingSubtitle: Subtitle | null;
  scrollToIndex: number;
  videoFocus: boolean;
  ready: boolean;
  outSideSubtitlePlayed: boolean;
  startPublishingData: boolean;
  intensive: boolean;
  intensiveStrategyIndex: number;
  intensiveSubtitle: Subtitle | null;
  playbackRate: number;
  intensiveTimer: any;
  intensiveSwithing: boolean;
  inTVModeFullScreen: boolean;
  showProgress: boolean;
  showProgressTimer: any;
  progress: number;
};

export const Video = ({
  filePath,
  subtitle,
  style,
  title,
  zoneId,
  layoutMode,
}: {
  style: CSSProperties;
  filePath: string;
  subtitle?: Subtitle;
  zoneId: string;
  title: string;
  layoutMode: number;
}) => {
  const [userPreference] = useBehavior(userPreference$, {} as UserPreference);
  let store = useStore<VideoState>({
    subtitles: [], 
    player: null,
    playing: false,
    loopingSubtitle: null,
    scrollToIndex: 0,
    videoFocus: false,
    ready: false,
    outSideSubtitlePlayed: false,
    startPublishingData: false,
    intensive: false,
    intensiveStrategyIndex: 0,
    intensiveSubtitle: null,
    playbackRate: 1,
    intensiveTimer: null,
    intensiveSwithing: false,
    inTVModeFullScreen: false,
    showProgress: false,
    progress: 0,
    showProgressTimer: -1,
  });

  const ref = useRef<ReactPlayer | null>(null);
  store.player = ref.current;

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const seekTo = (time: number, unit: "seconds" | "fraction" = "seconds") => {
    store.player?.seekTo(time, unit);
  };

  const setSubtitleLooping = (sub: Subtitle | null) => {
    store.loopingSubtitle = sub;
    if (sub !== null) {
      store.playbackRate = 1;
      store.intensiveSubtitle = null;
      store.intensiveStrategyIndex = 0;
      store.intensive = false;
    }
  };

  useEffect(() => {
    if (userPreference.tvMode && wrapperRef.current) {
      setTimeout(() => {
        fullscreen().then(() => {
          store.inTVModeFullScreen = true;
          store.player?.getInternalPlayer().play().catch((e: any) => message.error(e.toString()));
          wrapperRef.current!.focus();
          isFullscreen$.subscribe({
            next(isFullscreen) {
              if (!isFullscreen) {
                console.log('')
                closeZone$.next(zoneId);
              }
            }
          });
          // wrapperRef.current!.onfullscreenchange = (event: any) => {
          //   console.log('onfullscreenchange:', event);
          //   let elem = event.target;
          //   let isFullscreen = document.fullscreenElement === elem;
          //   if (!isFullscreen) {
          //     closeZone$.next(zoneId);
          //   }
          //   store.inTVModeFullScreen = isFullscreen;
          // }
        }).catch((e: any) => message.error(e.toString()));
      }, 100);
    }
  }, [userPreference.tvMode, wrapperRef]);

  const setScrollToIndex = useCallback((index: number, needToSeek = true) => {
    store.intensiveSubtitle = null;
    store.scrollToIndex = index;
    console.log('debug setScrollToIndex: ', store.scrollToIndex);
    const sub = store.subtitles[index];
    if (sub && needToSeek) {
      seekTo(sub.start / 1000);
    }
    if (store.intensive) {
      store.intensiveSubtitle = sub;
    }
    store.intensiveSwithing = false;
    store.intensiveStrategyIndex = 0;
    store.playbackRate = 1;
    console.log('debug onScrollToIndexChange, store.intensiveStrategyIndex:', store.intensiveStrategyIndex, ', store.playbackRate:', store.playbackRate);
    clearInterval(store.intensiveTimer);
  }, [store.subtitles, store.intensive, seekTo, store.intensiveTimer]); 

  useEffect(() => {
    if (!store.subtitles || store.subtitles.length === 0 || !store.subtitles[store.scrollToIndex]) {
      return;
    }
    saveRecord({
      file: filePath,
      progress: store.subtitles[store.scrollToIndex],
      type: 'video',
    });
    playSubtitleRecord$.next({
      ...store.subtitles[store.scrollToIndex],
      file: filePath,
      zoneId,
    });
  }, [store.scrollToIndex, filePath, store.subtitles, zoneId]);


  const setSubtitles = useCallback((subtitles: Subtitle[]) => {
    if (subtitles && subtitles.length > 0) {
      store.subtitles = subtitles;
      saveSubtitlesOfVideo(filePath, subtitles);
    }
  }, [filePath]);

  const publishSubtitles = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'setSubtitles',
      data: {
        subtitles: store.subtitles,
      }
    });
  }, [zoneId, store.subtitles]);

  useEffect(() => {
    if (!store.startPublishingData) {
      return;
    }
    publishSubtitles();
  }, [store.startPublishingData, publishSubtitles])

  const publishScrollToIndex = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'scrollToIndex',
      data: {
        nextScrollToIndex: store.scrollToIndex,
      }
    });
  }, [zoneId, store.scrollToIndex]);

  useEffect(() => {
    if (!store.startPublishingData) {
      return;
    }
    publishScrollToIndex();
  }, [store.startPublishingData, publishScrollToIndex])

  const publishSubtitleLooping = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'loopingSubtitle',
      data: {
        subtitle: store.loopingSubtitle,
      }
    });
  }, [zoneId, store.loopingSubtitle]);

  useEffect(() => {
    if (!store.startPublishingData) {
      return;
    }
    publishSubtitleLooping();
  }, [store.startPublishingData, publishSubtitleLooping,])

  const publishPlayingChange = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'playingChange',
      data: {
        playing: store.playing
      }
    }) 
  }, [zoneId, store.playing]);

  useEffect(() => {
    if (!store.startPublishingData) {
      return;
    }
    publishPlayingChange();
  }, [store.startPublishingData, publishPlayingChange]);

  const publishIntensiveChange = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'intensiveChange',
      data: {
        intensive: store.intensive
      }
    })
  }, [zoneId, store.intensive]);

  useEffect(() => {
    if (!store.startPublishingData) {
      return;
    }
    publishIntensiveChange();
  }, [store.startPublishingData, publishIntensiveChange]);

  const publishIntensiveStrategyIndexChange = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'intensiveStrategyIndexChange',
      data: {
        intensiveStrategyIndex: store.intensiveStrategyIndex
      }
    });
  }, [zoneId, store.intensiveStrategyIndex]);

  useEffect(() => {
    if (!store.startPublishingData) {
      return;
    }
    publishIntensiveStrategyIndexChange();
  }, [ store.startPublishingData, publishIntensiveStrategyIndexChange]);

  useEffect(() => {
    const sp = remoteControlOutput$.subscribe({
      next({toZoneId, action, data,}) {
        if (toZoneId !== zoneId) {
          return;
        }
        if (action === 'seekTime') {
          console.log('debug seeking');
          store.player?.seekTo(data.time, 'seconds');
        }
        if (action === 'setSubtitles') {
          setSubtitles(data.nextSubtitles);
        }
        if (action === 'scrollToIndex') {
          console.log('setScrollToIndex');
          setScrollToIndex(data.nextScrollToIndex);
        }
        if (action === 'loopingSubtitle') {
          const nextLoopingSubtitle = data.subtitle;
          if (!nextLoopingSubtitle) {
            setSubtitleLooping(null);
            return;
          }
          if ( store.loopingSubtitle === null || nextLoopingSubtitle.start !==  store.loopingSubtitle.start && data.subtitle.end !==  store.loopingSubtitle.end) {
            setSubtitleLooping(nextLoopingSubtitle);
          }
        }
        if (action === 'playingChange') {
          store.playing = data.playing;
        }
        if (action === 'intensiveChange') {
          store.intensive = data.intensive;
        }
        if (action === 'startControl') {
          console.log('new remote controller, start to feed data');
          // feed the data to remote contoller
          store.startPublishingData = true;
          publishSubtitles();
          publishScrollToIndex();
          publishSubtitleLooping();
          publishPlayingChange();
          publishIntensiveChange();
          publishIntensiveStrategyIndexChange();
        }
      },

    });
    return () => sp.unsubscribe();
  }, [ store.player, 
      zoneId, 
      publishSubtitles,
      publishScrollToIndex,
      publishSubtitleLooping,
      publishPlayingChange,
      publishIntensiveChange,
      setScrollToIndex,
    ]);

  useEffect(() => {
    if (store.outSideSubtitlePlayed) {
      // 此hook自动播放props传入的subtitle, 但只自动播放一次。
      return;
    }
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (!store.ready) {
      return;
    }
    if (subtitle) {
      console.log('debug seeking');
      seekTo(subtitle.start / 1000, "seconds");
      const currentTime = subtitle.start + 1;
      const subtileFound = store.subtitles.find(
        (s: Subtitle) => s.start <= currentTime && s.end >= currentTime
      );
      if (subtileFound) {
        const nextScrollToIndex = store.subtitles.findIndex(
          (s: Subtitle) => s === subtileFound
        );
        console.log('setScrollToIndex');
        setScrollToIndex(nextScrollToIndex);
        // setSubtitleLooping(subtileFound);
        store.playing = true;
        store.outSideSubtitlePlayed = true;
      }
    }
  }, [subtitle, store.outSideSubtitlePlayed, ref, store.ready, store.subtitles]);

  useEffect(() => {
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (store.playing && store.loopingSubtitle !== null) {
      let timer = setInterval(() => {
        const currentTime = player.getCurrentTime() * 1000;
        console.log("while looping, currentTime: ", currentTime);
        if (store.loopingSubtitle === null) {
          return;
        }
        if (currentTime >= store.loopingSubtitle.end || currentTime <= store.loopingSubtitle.start - 1000) {
          console.log('seekTo to loop start:', store.loopingSubtitle.start / 1000);
          console.log('debug seeking');
          seekTo(store.loopingSubtitle.start / 1000, "seconds");
        }
      }, 50);
      return () => {
        clearInterval(timer);
      };
    }
  }, [store.playing, ref, store.loopingSubtitle]);

  useEffect(() => {
    console.log("debug-002 effect executed");
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (store.loopingSubtitle) {
      console.log("debug-002 loopingSubtitle === true");
      return;
    }
    if (store.intensive) {
      return;
    }
    console.log("debug-002 playing:", store.playing);
    console.log("debug-002 playing && autoPlayBySubtitle === true");
    store.playbackRate = 1;
    let timer = setInterval(() => {
      if (!store.playing) {
        console.log("debug-002 playing === false");
        return;
      }
      const currentSubtitle: Subtitle = store.subtitles[store.scrollToIndex];
      const currentTime = player.getCurrentTime() * 1000;
      const isPlayCurrentSubtitle = currentSubtitle && currentSubtitle.start <= currentTime && currentSubtitle.end > currentTime;
      if (isPlayCurrentSubtitle) {
        console.log("debug-002 isPlayCurrentSubtitle");
        return;
      }
      const subtileFound = store.subtitles.find(
        (s: Subtitle) => s.start <= currentTime && s.end > currentTime
      );
      if (subtileFound) {
        console.log("debug-002 subtileFound:", subtileFound);
        const nextIndex = store.subtitles.findIndex((s: Subtitle) => s === subtileFound);
        // if (store.scrollToIndex < store.subtitles.length -1 && store.scrollToIndex > nextIndex) {
        //   return;
        // }
        store.scrollToIndex = nextIndex;
        console.log('debug-002  setScrollToIndex: ', store.scrollToIndex);
        if (store.intensiveSubtitle !== subtileFound) {
          store.intensiveSubtitle = currentSubtitle;
          store.intensiveStrategyIndex = 0;
        }
      } else {
        console.log('debug-002  no subtileFound');
      }
    }, 50);
    return () => {
      console.log("clear timer");
      clearInterval(timer);
    };
  }, [store.playing, ref.current, store.subtitles, store.loopingSubtitle, store.intensive, store.intensiveSubtitle]);

  useEffect(() => {
    // 精读 effect
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (store.loopingSubtitle) {
      return;
    }
    if (!store.playing) {
      return;
    }
    if (!store.intensive) {
      return;
    }
    const findSubtitleByTime = (time: number) => {
      return store.subtitles.find(
        (s: Subtitle) => s.start <= time && s.end > time
      ) || null;
    }
    let timer = setInterval(() => {
      const currentTime = player.getCurrentTime() * 1000;
      if (store.intensiveSubtitle === null || store.intensiveSubtitle === undefined) {
        let subtileFound = findSubtitleByTime(currentTime);
        const currentSubtitle = store.subtitles[store.scrollToIndex];
        if (subtileFound) {
          if (subtileFound.end > currentSubtitle.start && subtileFound.start < currentSubtitle.start) { // 两字幕出现交叉
            subtileFound = currentSubtitle;
          }
          store.intensiveSubtitle = subtileFound;
        }
        return;
      }
      console.log('check intensiveStrategyIndex, currentTime:', currentTime);
      const outOfIntensiveTime = currentTime > store.intensiveSubtitle.end - 1;
      const intensiveStrategyNotFinished = store.intensiveStrategyIndex < userPreference.intensiveStrategy.length - 1;
      if (outOfIntensiveTime && intensiveStrategyNotFinished) { // 离开精听片段，但策略未播放完毕
        const nextIntensiveStrategyIndex = store.intensiveStrategyIndex + 1;
        store.intensiveStrategyIndex = nextIntensiveStrategyIndex;
        let currentPlayHow = userPreference.intensiveStrategy[nextIntensiveStrategyIndex];
        store.playbackRate = currentPlayHow.speed;
        seekTo(store.intensiveSubtitle.start / 1000);
        return;
      }
      const duringIntensive = currentTime < store.intensiveSubtitle.end && currentTime > store.intensiveSubtitle.start; 
      if (duringIntensive) { // 进入当前精听片段
        if (store.intensiveSwithing) {
          console.log('intensiveSwithing finished');
          store.intensiveSwithing = false; // 切换完毕
          const nextIntensiveStrategyIndex = 0;
          let currentPlayHow = userPreference.intensiveStrategy[nextIntensiveStrategyIndex];
          store.playbackRate = currentPlayHow.speed;
          store.intensiveStrategyIndex = nextIntensiveStrategyIndex;
          store.scrollToIndex += 1;
        }
      }
      if (
        currentTime < store.intensiveSubtitle.start - 1 ||
        currentTime > store.intensiveSubtitle.end + 1
      ) {
        if (store.intensiveStrategyIndex < userPreference.intensiveStrategy.length - 1) {
          return;
        }
        store.intensiveSubtitle = store.subtitles[store.scrollToIndex + 1];
        console.log('intensiveSwithing started');
        store.intensiveSwithing = true; 
      }
    }, 50);
    console.log('debug-001, setInterval timer:', timer);
    store.intensiveTimer = timer;
    return () => {
      console.log('debug-001, clearInterval timer:', timer);
      clearInterval(timer);
    };
  }, [store.playing, ref, store.subtitles, store.loopingSubtitle, store.intensive, userPreference.intensiveStrategy, store.intensiveStrategyIndex, store.intensiveSubtitle, store.intensiveSwithing]);

  useEffect(() => {
    getSubtitlesOfVideo(filePath).then((subtitles) => {
      console.log("got subtitles of ", filePath, " ==> ", subtitles);
      store.subtitles = subtitles || [];
    });
  }, [filePath]);

  const url = `http://${host}:8080/resource` + filePath;
  console.log("play url:", url);

  console.log('render video, player:', store.player);

  const [playlistPromise] = useState(getPlaylistByPlayingVideo(filePath));


  return (
    <div
      className={styles.VideoWrapper}
      style={{
        ...style,
        display: "flex",
        flexDirection: layoutMode === 0 ? "column" : "row",
        alignItems: "center",
        justifyContent: layoutMode === 0 ? 'flex-start' : 'space-between',
        overflow: 'hidden',
        position: 'relative',
        cursor: store.inTVModeFullScreen ? 'none' : 'auto',
      }}
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={(e) => {
        const key = e.key.toLowerCase();
        console.log('wrapper key down:', key);
        if (key === " ".toLowerCase() && store.inTVModeFullScreen) {
          store.playing ? store.player?.getInternalPlayer().pause() : store.player?.getInternalPlayer().play();
        }
        if (key === "mediatrackprevious".toLowerCase()) {
          closeZone$.next(zoneId);
          playlistPromise.then(playlist => {
            console.log('mediatrackprevious..');
            const index = playlist.findIndex((file) => filePath === file);
            let prevIndex = index - 1;
            if (prevIndex === -1) {
              prevIndex = playlist.length - 1;
            }
            setTimeout(() => {
              playSubtitle$.next({
                file: playlist[prevIndex],
                start: 0,
                end: 0,
                subtitles: []
              });
            }, 100);
          });
        }
        if (key === "mediatracknext".toLowerCase()) {
          closeZone$.next(zoneId);
          playlistPromise.then(playlist => {
            console.log('mediatracknext..');
            const index = playlist.findIndex((file) => filePath === file);
            let nextIndex = index + 1;
            if (nextIndex === playlist.length) {
              nextIndex = 0;
            }
            setTimeout(() => {
              playSubtitle$.next({
                file: playlist[nextIndex],
                start: 0,
                end: 0,
                subtitles: []
              });
            }, 100);
          });
        }
        
        const currentTime = (store.player?.getCurrentTime() || 0);
        if (key === "arrowright".toLowerCase()) {
          store.progress = (currentTime + 9.5) / (store.player?.getDuration() || 1);

          seekTo(currentTime + 9.5, "seconds");
        }
        if (key === "arrowleft".toLowerCase()) {
          store.progress = (currentTime - 9.5) / (store.player?.getDuration() || 1);
          seekTo(currentTime - 9.5, "seconds");
        }
        store.progress > 1 && (store.progress = 1);
        store.progress < 0 && (store.progress = 0);
        if (key === "arrowleft".toLowerCase() || key === "arrowright".toLowerCase()) {
          store.showProgress = true;
          if (store.showProgressTimer !== -1) {
            clearTimeout(store.showProgressTimer);
          }
          store.showProgressTimer = setTimeout(() => {
            store.showProgress = false;
          }, 2000);
        }

      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }}
      onMouseUp={(e) => {
        if(e.button == 2 && store.inTVModeFullScreen) {
          requestAnimationFrame(() => closeZone$.next(zoneId));
        }
      }}
      onClick={() => {
        if (!store.inTVModeFullScreen) {
          return;
        }
        store.playing ? store.player?.getInternalPlayer().pause() : store.player?.getInternalPlayer().play();
      }}
    >
      <Resizable
        maxWidth={layoutMode === 0 ? '100%' : '70%'}
        minWidth="356px"
        minHeight="200px"
        handleStyles={{
          left: {
            display: "flex",
            alignItems: "center",
            height: "100%",
            width: "25px",
            left: "-12.5px",
          },
          right: {
            display: "flex",
            alignItems: "center",
            height: "100%",
            width: "25px",
            right: "-12.5px",
          },
        }}
        handleComponent={{
          left: store.inTVModeFullScreen ? undefined : (
            <div
              style={{
                width: "25px",
                height: "25px",
                borderRadius: "50%",
                background: "#a976ec",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "15px",
                  height: "15px",
                  borderRadius: "50%",
                  background: "#ccc",
                }}
              ></div>
            </div>
          ),
          right: store.inTVModeFullScreen ? undefined : (
            <div
              style={{
                width: "25px",
                height: "25px",
                borderRadius: "50%",
                background: "#a976ec",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "15px",
                  height: "15px",
                  borderRadius: "50%",
                  background: "#ccc",
                }}
              ></div>
            </div>
          ),
        }}
        enable={{
          right: store.videoFocus && true,
          left: store.videoFocus && true,
        }}
        defaultSize={{
          width: "100%",
          height: "auto",
        }}
      >
        <div
          style={{ width: "100%", position: "relative", paddingTop: "56.25%" }}
          tabIndex={0}
          onFocus={() => {
            store.videoFocus = true;
          }}
          onBlur={() => {
            store.videoFocus = false;
          }}
        >
          <ReactPlayer
            ref={ref}
            url={url}
            playing={store.playing}
            playbackRate={store.playbackRate}
            onPlaybackRateChange={(rate: number) => {
              store.playbackRate = rate;
            }}
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              minHeight: "200px",
            }}
            onReady={() => {
              store.ready = true;
            }}
            onPause={() => store.playing = false}
            onPlay={() => store.playing  = true}
            playsinline
            loop
            controls={!store.inTVModeFullScreen}
            onError={(err, data) => {
              console.log("video error:", err);
              console.log("video error data:", data);
            }}
          />
        </div>
      </Resizable>
      {store.showProgress && <div style={{fontSize: '60px', position: 'fixed', right: '14px', top: '14px', color: '#fff'}}>
        {(store.progress * 100).toFixed(2)} %
      </div>}
      <div style={{
        display: 'flex',
        ...(store.inTVModeFullScreen ? {
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
        } : {
          width: '100%',
          minWidth: '200px',
          flexGrow: 1,
          height: '100%',
        })
      }}>
        {store.player !== null && (
          <SubtitleComponent
            inTVModeFullScreen={store.inTVModeFullScreen}
            layoutMode={0}
            fromZoneId={zoneId}
            title={title}
            filePath={filePath}
            subtitles$={store.subtitles$}
            playing$={store.playing$}
            seekTo={(time) => {
              console.log('debug seeking:', time);
              seekTo(time, 'seconds');
            }}
            loopingSubtitle$={store.loopingSubtitle$}
            scrollToIndex$={store.scrollToIndex$}
            intensive$={store.intensive$}
            intensiveStrategyIndex$={store.intensiveStrategyIndex$}
            onSubtitlesChange={(nextSubtitles: Subtitle[]) => {
              setSubtitles(nextSubtitles);
            }}
            onScrollToIndexChange={(nextScrollToIndex: number) => {
              console.log('debug onScrollToIndexChange:', nextScrollToIndex);
              setScrollToIndex(nextScrollToIndex);
            }}
            onLoopingSubtitleChange={(subtitle: Subtitle | null) => {
              setSubtitleLooping(subtitle);
              store.intensive = false;
              store.intensiveStrategyIndex = 0;
              store.intensiveSubtitle = null;
            }}
            onPlayingChange={(playing: boolean) => {
              store.playing = playing;
            }}
            onIntensiveChange={(intensive) => {
              store.intensive = intensive;
              store.intensiveStrategyIndex = 0;
              store.loopingSubtitle = null;
              store.intensiveSubtitle = null;
            }}
          />
        )}
      </div>
    </div>
  );
};
