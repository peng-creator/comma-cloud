import {
  Button,
  Col,
  Dropdown,
  List,
  Menu,
  Popconfirm,
  Switch,
  Tooltip,
} from "antd";
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
import { playSubtitleRecord$ } from "../../state/video";

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
  const [subtitles, _setSubtitles] = useState([] as Subtitle[]);
  const ref = useRef<ReactPlayer | null>(null);
  const player = ref.current;
  const [playing, setPlaying] = useState(false);
  const [subtitleLooping, setSubtitleLooping] = useState<Subtitle | null>(null);
  const [scrollToIndex, setScrollToIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [videoFocus, setVideoFocus] = useState(false);
  const [ready, setReady] = useState(false);
  const [outSideSubtitlePlayed, setOutSideSubtitlePlayed] = useState(false);

  const [subtitles$] = useState(new BehaviorSubject<Subtitle[]>([]));
  const [loopingSubtitle$] = useState(
    new BehaviorSubject<Subtitle | null>(null)
  );
  const [isPlaying$] = useState(
    new BehaviorSubject<boolean>(playing)
  );
  const [scrollToIndex$] = useState(new BehaviorSubject<number>(0));
  const [startPublishingData, setStartPublishingData] = useState(false);


  useEffect(() => {
    if (!subtitles || subtitles.length === 0 || !subtitles[scrollToIndex]) {
      return;
    }
    saveRecord({
      file: filePath,
      progress: subtitles[scrollToIndex],
      type: 'video',
    });
    playSubtitleRecord$.next({
      ...subtitles[scrollToIndex],
      file: filePath,
      zoneId,
    });
  }, [scrollToIndex, filePath, subtitles, zoneId]);

  useEffect(() => {
    subtitles$.next(subtitles);
  }, [subtitles, subtitles$]);

  useEffect(() => {
    loopingSubtitle$.next(subtitleLooping);
  }, [subtitleLooping, loopingSubtitle$]);

  useEffect(() => {
    isPlaying$.next(playing);
  }, [isPlaying$, playing]);

  useEffect(() => {
    scrollToIndex$.next(scrollToIndex);
  }, [scrollToIndex, scrollToIndex$]);


  const setSubtitles = useCallback((subtitles: Subtitle[]) => {
    if (subtitles && subtitles.length > 0) {
      _setSubtitles(subtitles);
      saveSubtitlesOfVideo(filePath, subtitles);
    }
  }, [filePath]);

  const publishSubtitles = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'setSubtitles',
      data: {
        subtitles,
      }
    });
  }, [zoneId, subtitles]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishSubtitles();
  }, [startPublishingData, publishSubtitles])

  const publishScrollToIndex = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'scrollToIndex',
      data: {
        nextScrollToIndex: scrollToIndex,
      }
    });
  }, [zoneId, scrollToIndex]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishScrollToIndex();
  }, [startPublishingData, publishScrollToIndex])

  const publishSubtitleLooping = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'loopingSubtitle',
      data: {
        subtitle: subtitleLooping,
      }
    });
  }, [zoneId, subtitleLooping]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishSubtitleLooping();
  }, [startPublishingData, publishSubtitleLooping,])

  const publishPlayingChange = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'playingChange',
      data: {
        playing
      }
    }) 
  }, [zoneId, playing]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishPlayingChange();
  }, [startPublishingData, publishPlayingChange])

  useEffect(() => {
    const sp = remoteControlOutput$.subscribe({
      next({toZoneId, action, data,}) {
        if (toZoneId !== zoneId) {
          return;
        }
        if (action === 'seekTime') {
          player?.seekTo(data.time, 'seconds');
        }
        if (action === 'setSubtitles') {
          setSubtitles(data.nextSubtitles);
        }
        if (action === 'scrollToIndex') {
          setScrollToIndex(data.nextScrollToIndex);
        }
        if (action === 'loopingSubtitle') {
          const nextLoopingSubtitle = data.subtitle;
          if (!nextLoopingSubtitle) {
            setSubtitleLooping(null);
            return;
          }
          if (subtitleLooping === null || nextLoopingSubtitle.start !== subtitleLooping.start && data.subtitle.end !== subtitleLooping.end) {
            setSubtitleLooping(nextLoopingSubtitle);
          }
        }
        if (action === 'playingChange') {
          setPlaying(data.playing)
        }
        if (action === 'startControl') {
          console.log('new remote controller, start to feed data');
          // feed the data to remote contoller
          setStartPublishingData(true);
          publishSubtitles();
          publishScrollToIndex();
          publishSubtitleLooping();
          publishPlayingChange();
        }
      },

    });
    return () => sp.unsubscribe();
  }, [player, 
      zoneId, 
      publishSubtitles,
      publishScrollToIndex,
      publishSubtitleLooping,
      publishPlayingChange,
    ]);

  useEffect(() => {
    if (outSideSubtitlePlayed) {
      // 此hook自动播放props传入的subtitle, 但只自动播放一次。
      return;
    }
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (!ready) {
      return;
    }
    if (subtitle) {
      player.seekTo(subtitle.start / 1000, "seconds");
      const currentTime = subtitle.start + 1;
      const subtileFound = subtitles.find(
        (s) => s.start <= currentTime && s.end >= currentTime
      );
      if (subtileFound) {
        const nextScrollToIndex = subtitles.findIndex(
          (s) => s === subtileFound
        );
        setScrollToIndex(nextScrollToIndex);
        setSubtitleLooping(subtileFound);
        setPlaying(true);
        setOutSideSubtitlePlayed(true);
      }
    }
  }, [subtitle, outSideSubtitlePlayed, ref, ready, subtitles]);

  useEffect(() => {
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (playing && subtitleLooping !== null) {
      let timer = setInterval(() => {
        const currentTime = player.getCurrentTime() * 1000;
        console.log("while looping, currentTime: ", currentTime);
        if (currentTime >= subtitleLooping.end || currentTime <= subtitleLooping.start - 1000) {
          console.log('seekTo to loop start:', subtitleLooping.start / 1000);
          player.seekTo(subtitleLooping.start / 1000, "seconds");
        }
      }, 50);
      return () => {
        clearInterval(timer);
      };
    }
  }, [playing, ref, subtitleLooping]);

  useEffect(() => {
    console.log("effect executed");
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (subtitleLooping) {
      console.log("subtitleLooping === true");
      return;
    }
    if (!playing) {
      console.log("playing === false");
      return;
    }
    console.log("playing:", playing);
    console.log("playing && autoPlayBySubtitle === true");
    let currentSubtitle: Subtitle | null = null;
    let timer = setInterval(() => {
      console.log("timer runing");
      const currentTime = player.getCurrentTime() * 1000;
      if (currentSubtitle === null) {
        console.log("trying to find currentSubtitle");
        const subtileFound = subtitles.find(
          (s) => s.start <= currentTime && s.end >= currentTime
        );
        if (subtileFound) {
          console.log("subtileFound:", subtileFound);
          currentSubtitle = subtileFound;

          setScrollToIndex(subtitles.findIndex((s) => s === currentSubtitle));
        }
        return;
      }
      if (
        currentTime < currentSubtitle.start - 1 ||
        currentTime > currentSubtitle.end + 1
      ) {
        console.log("currentTime is not in the period of currentSubtitle.");
        console.log("currentTime:", currentTime);
        console.log("currentSubtitle:", currentSubtitle);
        console.log("set currentSubtitle to null");
        currentSubtitle = null;
      }
    }, 50);
    return () => {
      console.log("clear timer");
      clearInterval(timer);
    };
  }, [playing, ref, subtitles, subtitleLooping]);

  useEffect(() => {
    getSubtitlesOfVideo(filePath).then((subtitles) => {
      console.log("got subtitles of ", filePath, " ==> ", subtitles);
      _setSubtitles(subtitles || []);
    });
  }, [filePath]);

  const url = `http://${host}:8080/resource` + filePath;
  console.log("play url:", url);

  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: layoutMode === 0 ? 'flex-start' : 'center'
      }}
      ref={wrapperRef}
    >
      <Resizable
        maxWidth="100%"
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
          left: (
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
          right: (
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
              {" "}
              <div
                style={{
                  width: "15px",
                  height: "15px",
                  borderRadius: "50%",
                  background: "#ccc",
                }}
              ></div>{" "}
            </div>
          ),
        }}
        enable={{
          right: videoFocus && true,
          left: videoFocus && true,
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
            setVideoFocus(true);
          }}
          onBlur={() => {
            setVideoFocus(false);
          }}
        >
          <ReactPlayer
            ref={ref}
            url={url}
            playing={playing}
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              minHeight: "200px",
            }}
            onReady={() => {
              setReady(true);
            }}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            playsinline
            loop
            controls
            onError={(err, data) => {
              console.log("video error:", err);
              console.log("video error data:", data);
            }}
          />
        </div>
      </Resizable>
      <div style={{
        width: '100%',
        flexGrow: 1,
        display: layoutMode === 0 ? 'flex' : 'none',
      }}>
        {player !== null && (
          <SubtitleComponent
            layoutMode={layoutMode}
            fromZoneId={zoneId}
            title={title}
            filePath={filePath}
            subtitles$={subtitles$}
            isPlaying$={isPlaying$}
            seekTo={(time) => player.seekTo(time, 'seconds')}
            loopingSubtitle$={loopingSubtitle$}
            scrollToIndex$={scrollToIndex$}
            onSubtitlesChange={(nextSubtitles: Subtitle[]) => {
              setSubtitles(nextSubtitles);
            }}
            onScrollToIndexChange={(nextScrollToIndex: number) => {
              setScrollToIndex(nextScrollToIndex);
            }}
            onLoopingSubtitleChange={(subtitle: Subtitle | null) => {
              setSubtitleLooping(subtitle);
            }}
            onPlayingChange={(playing: boolean) => {
              setPlaying(playing);
            }}
          />
        )}
      </div>
    </div>
  );
};
