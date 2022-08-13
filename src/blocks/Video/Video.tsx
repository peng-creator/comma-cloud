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
import {
  FileAddOutlined,
  MergeCellsOutlined,
  DeleteOutlined,
  RetweetOutlined,
  SearchOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { LazyInput } from "../../compontent/LazyInput/LazyInput";
import { millisecondsToTime } from "../../utils/time";
import { mergeSubtitles } from "../../utils/subtitle";
import { searchSentence, tapWord$ } from "../../state/search";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Resizable } from "re-resizable";
import { addSubtitle$ } from "../CardMaker/CardMaker";
import { host } from "../../utils/host";

export const Video = ({
  filePath,
  subtitle,
  style,
}: {
  style: CSSProperties;
  filePath: string; 
  subtitle?: Subtitle;
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

  const virtuoso = useRef<VirtuosoHandle | null>(null);

  const setSubtitles = (subtitles: Subtitle[]) => {
    _setSubtitles(subtitles);
    saveSubtitlesOfVideo(filePath, subtitles);
  };

  const scrollTo = useCallback(
    (index: number, behavior: "smooth" | "auto" = "smooth") => {
      if (virtuoso.current && index >= 0) {
        virtuoso.current.scrollToIndex({
          index,
          align: "center",
          behavior,
        });
      }
    },
    [virtuoso]
  );

  const setScrollToIndex = useCallback(
    (nextScrollToIndex: number) => {
      _setScrollToIndex(nextScrollToIndex);
      scrollTo(nextScrollToIndex);
    },
    [scrollTo]
  );

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
        if (virtuoso.current && nextScrollToIndex >= 0) {
          virtuoso.current.scrollToIndex({
            index: nextScrollToIndex,
            align: "center",
            behavior: "auto",
          });
        }
        setSubtitleLooping(subtileFound);
        setPlaying(true);
        setOutSideSubtitlePlayed(true);
      }
    }
  }, [subtitle, outSideSubtitlePlayed, ref, ready, subtitles, virtuoso]);

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
        setScrollToIndex(-1);
      }
    }, 50);
    return () => {
      console.log("clear timer");
      clearInterval(timer);
    };
  }, [playing, ref, subtitles, subtitleLooping, setScrollToIndex]);

  useEffect(() => {
    getSubtitlesOfVideo(filePath).then((subtitles) => {
      console.log("got subtitles of ", filePath, " ==> ", subtitles);
      _setSubtitles(subtitles);
    });
  }, [filePath]);

  const player = ref.current;
  const url = `http://${host}:8080/resource` + filePath;
  console.log("play url:", url);

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

      <div style={{ width: '100%', display: "flex", justifyContent: "center", background: 'black' }}>
        <Button
          type="text"
          style={{ color: "#fff" }}
          onClick={() => {
            scrollTo(scrollToIndex, "auto");
          }}
        >
          定位当前字幕
        </Button>
        <Dropdown
          trigger={["click"]}
          overlay={
            <Menu>
              <Menu.Item
                onClick={() => {
                  const nextSubtitles = subtitles.reduce((acc, curr) => {
                    let last = acc[acc.length - 1];
                    let shouldMerge =
                      last &&
                      last.subtitles.find((s: string) =>
                        s.trim().endsWith(",")
                      ) !== undefined;
                    if (shouldMerge) {
                      const merged = mergeSubtitles(last, curr);
                      last.end = merged.end;
                      last.subtitles = merged.subtitles;
                    } else {
                      acc.push(curr);
                    }
                    return acc;
                  }, [] as Subtitle[]);
                  setSubtitles(nextSubtitles);
                  setSubtitleLooping(null);
                  setScrollToIndex(0);
                  player?.seekTo(nextSubtitles[0].start / 1000, "seconds");
                }}
              >
                逗号结尾的合并
              </Menu.Item>
              <Menu.Item
                onClick={() => {
                  /**
                       *  P：标点字符；
                          L：字母； 
                          M：标记符号（一般不会单独出现）； 
                          Z：分隔符（比如空格、换行等）； 
                          S：符号（比如数学符号、货币符号等）； 
                          N：数字（比如阿拉伯数字、罗马数字等）； 
                          C：其他字符 
                      */
                  const nextSubtitles = subtitles.reduce((acc, curr) => {
                    let last = acc[acc.length - 1];
                    let shouldMerge =
                      last &&
                      last.subtitles.find(
                        (s: string) => /\p{L}$/u.test(s.trim()) // 以字结尾
                      ) !== undefined;
                    if (shouldMerge) {
                      const merged = mergeSubtitles(last, curr);
                      last.end = merged.end;
                      last.subtitles = merged.subtitles;
                    } else {
                      acc.push(curr);
                    }
                    return acc;
                  }, [] as Subtitle[]);
                  setSubtitles(nextSubtitles);
                  setSubtitleLooping(null);
                  setScrollToIndex(0);
                  player?.seekTo(nextSubtitles[0].start / 1000, "seconds");
                }}
              >
                非标点结尾的合并
              </Menu.Item>
            </Menu>
          }
          placement="bottom"
        >
          <Button type="text" style={{ color: "#fff" }}>
            字幕合并
          </Button>
        </Dropdown>
      </div>

      <div style={{ flexGrow: 1, position: "relative", width: "100%" }}>
        <Virtuoso
          style={{ height: "100%" }}
          totalCount={subtitles.length}
          ref={virtuoso}
          itemContent={(index) => {
            const item = subtitles[index];
            const { end, start, subtitles: localSubtitles, id } = item;
            const playFromStart = (
              nextSubtitles: Subtitle[],
              nextScrollToIndex: number
            ) => {
              const subtitleToPlay = nextSubtitles[nextScrollToIndex];
              if (player !== null) {
                player.seekTo(subtitleToPlay.start / 1000, "seconds");
              }
              if (
                subtitleLooping !== null &&
                scrollToIndex === nextScrollToIndex
              ) {
                // 当前字幕正在循环
                setSubtitleLooping(subtitleToPlay);
              } else {
                setSubtitleLooping(null);
              }
            };
            const updateStart = (changeToValue: number) => {
              const nextSubtitles = [
                ...subtitles.slice(0, index),
                { ...subtitles[index], start: changeToValue },
                ...subtitles.slice(index + 1),
              ].sort((a, b) => a.start - b.start);
              const nextScrollToIndex = nextSubtitles.findIndex(
                ({ id: _id }) => _id === id
              );
              setSubtitles(nextSubtitles);
              setScrollToIndex(nextScrollToIndex);
              playFromStart(nextSubtitles, nextScrollToIndex);
            };
            const updateEnd = (changeToValue: number) => {
              const nextSubtitles = [
                ...subtitles.slice(0, index),
                { ...subtitles[index], end: changeToValue },
                ...subtitles.slice(index + 1),
              ].sort((a, b) => a.start - b.start);
              const nextScrollToIndex = nextSubtitles.findIndex(
                ({ id: _id }) => _id === id
              );
              setSubtitles(nextSubtitles);
              setScrollToIndex(nextScrollToIndex);
              playFromStart(nextSubtitles, nextScrollToIndex);
            };
            const ajustFrom = (index: number, time: number) => {
              const nextSubtitles = subtitles.map((s: any, i: number) => {
                if (i >= index) {
                  return { ...s, start: s.start + time, end: s.end + time };
                }
                return s;
              });
              setSubtitles(nextSubtitles);
              playFromStart(nextSubtitles, index);
            };
            return (
              <div
                key={item.id}
                style={{
                  borderBottom: "2px solid #c4bfbf",
                  minHeight: "120px",
                  color: "#fff",
                  overflowY: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      background: "black",
                      padding: "6px 10px",
                      borderRadius: "0 0 15px 15px",
                    }}
                  >
                    <Button
                      style={{
                        color: "white",
                        fontSize: "20px",
                        display: "flex",
                        justifyContent: "center",
                      }}
                      type="text"
                      onClick={() => {
                        setScrollToIndex(index);
                        setSubtitleLooping(null);
                        playFromStart(subtitles, index);
                        setPlaying(true);
                      }}
                    >
                      <PlayCircleOutlined />
                    </Button>

                    <Button
                      type="text"
                      onClick={() => {
                        if (item === subtitleLooping) {
                          setSubtitleLooping(null);
                          return;
                        }
                        setPlaying(true);
                        if (player !== null) {
                          player.seekTo(item.start / 1000, "seconds");
                          setSubtitleLooping(item);
                          setScrollToIndex(index);
                        }
                      }}
                      style={{
                        color: "white",
                        fontSize: "20px",
                        display: "flex",
                        justifyContent: "center",
                        background:
                          subtitleLooping === item ? "#a976ec" : "none",
                      }}
                    >
                      <RetweetOutlined />
                    </Button>

                    <Button
                      style={{
                        color: "white",
                        fontSize: "20px",
                        display: "flex",
                        justifyContent: "center",
                      }}
                      type="text"
                      onClick={() => {
                        searchSentence(localSubtitles.join(" "));
                      }}
                    >
                      <SearchOutlined />
                    </Button>
                    <Popconfirm
                      title="确定要删除当前字幕？"
                      onConfirm={() => {
                        const nextSubtitles = [
                          ...subtitles.slice(0, index),
                          ...subtitles.slice(index + 1),
                        ];
                        setSubtitles(nextSubtitles);
                      }}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        type="link"
                        style={{
                          color: "white",
                          fontSize: "20px",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <DeleteOutlined></DeleteOutlined>
                      </Button>
                    </Popconfirm>

                    <Button
                      style={{
                        color: "white",
                        fontSize: "20px",
                        display: "flex",
                        justifyContent: "center",
                      }}
                      onClick={() => {
                        const nextSubtitle = subtitles[index + 1];
                        let nextPlaySubtitleIndex = index;
                        if (index < nextPlaySubtitleIndex) {
                          nextPlaySubtitleIndex -= 1;
                        }
                        const nextSubtitles = [
                          ...subtitles.slice(0, index),
                          mergeSubtitles(item, nextSubtitle),
                          ...subtitles.slice(index + 2),
                        ];
                        setSubtitles(nextSubtitles);
                        const nextScrollToIndex = nextSubtitles.findIndex(
                          ({ id: _id }) => _id === id
                        );
                        playFromStart(nextSubtitles, nextScrollToIndex);
                        setScrollToIndex(nextScrollToIndex);
                      }}
                      type="text"
                    >
                      <MergeCellsOutlined
                        style={{
                          position: "relative",
                          bottom: "1px",
                          transform: "rotate(90deg)",
                        }}
                      />
                    </Button>
                    <Tooltip placement="bottom" title="加入当前卡片">
                      <Button
                        type="text"
                        onClick={() => {
                          console.log("add to card");
                          const subtitle = subtitles[index];
                          addSubtitle$.next({
                            file: filePath,
                            ...subtitle,
                          });
                        }}
                        style={{
                          color: "white",
                          fontSize: "20px",
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <FileAddOutlined />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "stretch",
                    height: "100%",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      margin: "20px 14px",
                      fontSize: scrollToIndex === index ? "25px" : "18px",
                      color: scrollToIndex === index ? "#a976ec" : "white",
                    }}
                  >
                    {localSubtitles.map((s: string, subIndex: number) => {
                      return (
                        <LazyInput
                          key={s + subIndex}
                          showEditBtn
                          menu={[
                            [
                              {
                                title: "当前及后续字幕 +1s",
                                onClick: () => {
                                  ajustFrom(index, 1000);
                                },
                              },
                              {
                                title: "当前及后续字幕 -1s",
                                onClick: () => {
                                  ajustFrom(index, -1000);
                                },
                              },
                            ],
                            [
                              {
                                title: "当前及后续字幕 +0.5s",
                                onClick: () => {
                                  ajustFrom(index, 500);
                                },
                              },
                              {
                                title: "当前及后续字幕 -0.5s",
                                onClick: () => {
                                  ajustFrom(index, -500);
                                },
                              },
                            ],
                            [
                              {
                                title: "当前及后续字幕 +0.25s",
                                onClick: () => {
                                  ajustFrom(index, +250);
                                },
                              },
                              {
                                title: "当前及后续字幕 -0.25s",
                                onClick: () => {
                                  ajustFrom(index, -250);
                                },
                              },
                            ],
                          ]}
                          onWordClick={(word) => {
                            tapWord$.next(word);
                          }}
                          value={s}
                          onChange={(value) => {
                            console.log("changed to:", value);
                            const nextSubtitles = [
                              ...subtitles.slice(0, index),
                              {
                                ...subtitles[index],
                                subtitles: [
                                  ...localSubtitles.slice(0, subIndex),
                                  value,
                                  ...localSubtitles.slice(subIndex + 1),
                                ],
                              },
                              ...subtitles.slice(index + 1),
                            ];
                            setSubtitles(nextSubtitles);
                          }}
                        ></LazyInput>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0 14px 14px",
                  }}
                >
                  <LazyInput
                    menu={[
                      [
                        {
                          onClick: () => {
                            updateStart(start + 1000);
                          },
                          title: "+ 1s",
                        },
                        {
                          onClick: () => {
                            updateStart(start - 1000);
                          },
                          title: "- 1s",
                        },
                      ],
                      [
                        {
                          onClick: () => {
                            updateStart(start + 500);
                          },
                          title: "+ 0.5s",
                        },
                        {
                          onClick: () => {
                            updateStart(start - 500);
                          },
                          title: "- 0.5s",
                        },
                      ],
                      [
                        {
                          onClick: () => {
                            updateStart(start + 250);
                          },
                          title: "+ 0.25s",
                        },
                        {
                          onClick: () => {
                            updateStart(start - 250);
                          },
                          title: "- 0.25s",
                        },
                      ],
                    ]}
                    modalTitle="修改起始时间(单位: ms)"
                    value={start}
                    displayValueTo={(value) => millisecondsToTime(value)}
                    onChange={(value) => {
                      updateStart(parseInt(value, 10) || 0);
                    }}
                    showMenuOnClick
                  />
                  <LazyInput
                    modalTitle="修改结束时间(单位: ms)"
                    value={end}
                    displayValueTo={(value) => millisecondsToTime(value)}
                    onChange={(value) => {
                      const changeToValue = parseInt(value, 10) || 0;
                      updateEnd(changeToValue);
                    }}
                    menu={[
                      [
                        {
                          onClick: () => {
                            updateEnd(end + 1000);
                          },
                          title: "+ 1s",
                        },
                        {
                          onClick: () => {
                            updateEnd(end - 1000);
                          },
                          title: "- 1s",
                        },
                      ],
                      [
                        {
                          onClick: () => {
                            updateEnd(end + 500);
                          },
                          title: "+ 0.5s",
                        },
                        {
                          onClick: () => {
                            updateEnd(end - 500);
                          },
                          title: "- 0.5s",
                        },
                      ],
                      [
                        {
                          onClick: () => {
                            updateEnd(end + 250);
                          },
                          title: "+ 0.25s",
                        },
                        {
                          onClick: () => {
                            updateEnd(end - 250);
                          },
                          title: "- 0.25s",
                        },
                      ],
                    ]}
                    showMenuOnClick
                  />
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};
