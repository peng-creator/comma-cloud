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
import { Button } from "antd";
import { getYoutubeVideoSubtitle } from "../../service/http/Youtube";

export const Youtube = ({
  videoId,
  subtitle,
  style,
  title,
}: {
  style: CSSProperties;
  subtitle?: Subtitle;
  videoId: string;
  title: string;
}) => {
  const [subtitles, _setSubtitles] = useState([] as Subtitle[]);
  const ref = useRef<ReactPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [subtitleLooping, setSubtitleLooping] = useState<Subtitle | null>(null);
  const [scrollToIndex, _setScrollToIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [videoFocus, setVideoFocus] = useState(false);
  const [ready, setReady] = useState(false);
  const [outSideSubtitlePlayed, setOutSideSubtitlePlayed] = useState(false);

  const [subtitles$] = useState(new BehaviorSubject<Subtitle[]>([]));
  const [loopingSubtitle$] = useState(
    new BehaviorSubject<Subtitle | null>(null)
  );
  const [scrollToIndex$] = useState(new BehaviorSubject<number>(0));

  useEffect(() => {
    subtitles$.next(subtitles);
  }, [subtitles, subtitles$]);

  useEffect(() => {
    loopingSubtitle$.next(subtitleLooping);
  }, [subtitleLooping, loopingSubtitle$]);

  useEffect(() => {
    scrollToIndex$.next(scrollToIndex);
  }, [scrollToIndex, scrollToIndex$]);

  const setSubtitles = (subtitles: Subtitle[]) => {
    _setSubtitles(subtitles);
    // saveSubtitlesOfVideo(filePath, subtitles);
  };

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
        _setScrollToIndex(nextScrollToIndex);
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
        if (currentTime >= subtitleLooping.end) {
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

          _setScrollToIndex(subtitles.findIndex((s) => s === currentSubtitle));
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
        _setScrollToIndex(-1);
      }
    }, 50);
    return () => {
      console.log("clear timer");
      clearInterval(timer);
    };
  }, [playing, ref, subtitles, subtitleLooping, _setScrollToIndex]);

  useEffect(() => {
    getYoutubeVideoSubtitle(videoId).then((subtitles) => {
      console.log("got youtube video subtitles of ", videoId, " ==> ", subtitles);
      _setSubtitles(subtitles);
    });
  }, [videoId]);

  const player = ref.current;
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log('play url:', url);
  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
                  background: "#fff",
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
                  background: "#fff",
                }}
              ></div>{" "}
            </div>
          ),
        }}
        enable={{
          right: true,
          left: true,
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
      {player !== null && (
        <SubtitleComponent
          title={title}
          filePath={url}
          subtitles$={subtitles$}
          player={player}
          loopingSubtitle$={loopingSubtitle$}
          scrollToIndex$={scrollToIndex$}
          onSubtitlesChange={(nextSubtitles: Subtitle[]) => {
            setSubtitles(nextSubtitles);
          }}
          onScrollToIndexChange={(nextScrollToIndex: number) => {
            _setScrollToIndex(nextScrollToIndex);
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
  );
};
