import { Button, Dropdown, Menu, message, Modal, Popconfirm, Switch, Tooltip } from "antd";
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { Subtitle } from "../../type/Subtitle";
import {
  FileAddOutlined,
  MergeCellsOutlined,
  DeleteOutlined,
  RetweetOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  RightOutlined,
  LeftOutlined,
  PauseCircleOutlined,
  FontSizeOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  FolderOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { LazyInput } from "../../compontent/LazyInput/LazyInput";
import { millisecondsToTime } from "../../utils/time";
import { mergeSubtitles } from "../../utils/subtitle";
import { searchSentence, tapWord$ } from "../../state/search";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { addSubtitle$ } from "../CardMaker/CardMaker";
import { BehaviorSubject } from "rxjs";
import { useBehavior } from "../../state";
import { addSubtitleInput$, fetchStandaloneProps$, openStandaloneSubtitle$, standaloneSubtitleProps$, subtitleReadyToFeedStandaloneProps$ } from "../../state/subtitle";
import { Icon } from "@blueprintjs/core";
import { reloadSubtitlesOfVideo } from "../../service/http/Subtitle";
import { setUserPreference, UserPreference, userPreference$ } from "../../state/preference";
import { playSubtitle$ } from "../../state/video";
import { getPlaylistByPlayingVideo } from "../../state/playlist";
import { openDir$ } from "../../state/resourceLoader";
import { defaultIntensiveStrategy } from "../../type/SubtitlePlayStrategy";
import { subtitleToBeAdded$ } from "../../state/cardMaker";
import { closeZone$ } from "../../state/zone";

export const SubtitleComponent = ({
  title,
  filePath,
  seekTo,
  subtitles$,
  loopingSubtitle$,
  playing$,
  scrollToIndex$,
  intensive$,
  intensiveStrategyIndex$,
  onSubtitlesChange,
  onScrollToIndexChange,
  onLoopingSubtitleChange,
  onPlayingChange,
  onIntensiveChange,
  fromZoneId,
  layoutMode,
  inTVModeFullScreen
}: {
  inTVModeFullScreen?: boolean;
  fromZoneId?: string;
  title: string;
  style?: CSSProperties;
  filePath: string;
  subtitles$: BehaviorSubject<Subtitle[]>;
  seekTo: (time: number) => void;
  playing$: BehaviorSubject<boolean>;
  loopingSubtitle$: BehaviorSubject<Subtitle | null>;
  scrollToIndex$: BehaviorSubject<number>;
  intensive$: BehaviorSubject<boolean>;
  intensiveStrategyIndex$: BehaviorSubject<number>;
  onSubtitlesChange: (nextSubtitles: Subtitle[]) => void;
  onScrollToIndexChange: (nextScrollToIndex: number) => void;
  onLoopingSubtitleChange: (subtitle: Subtitle | null) => void;
  onPlayingChange: (playing: boolean) => void;
  onIntensiveChange: (intensive: boolean) => void;
  layoutMode: number;
}) => {
  console.log('entering SubtitleComponent, title:', title);
  const [_subtitles] = useBehavior(subtitles$, []);
  const [_loopingSubtitle] = useBehavior(loopingSubtitle$, null);
  const [isPlaying] = useBehavior(playing$, false);
  const [scrollToIndex] = useBehavior(scrollToIndex$, -1);
  const [intensive] = useBehavior(intensive$, true);
  const [intensiveStrategyIndex] = useBehavior(intensiveStrategyIndex$, 0);
  const [userPreference] = useBehavior(userPreference$, {} as UserPreference);
  const playHow = (userPreference.intensiveStrategy || defaultIntensiveStrategy)[intensiveStrategyIndex];
  // const [showController, setShowController] = useState(false); 
  const subtitles = _subtitles || [];
  const [smallScreen, setSmallScreen] = useState(document.documentElement.clientWidth < 680);

  const loopingSubtitle = _loopingSubtitle !== null ? subtitles.find(({ start, end, subtitles }) => {
    return start === _loopingSubtitle.start && end === _loopingSubtitle.end && subtitles[0] === _loopingSubtitle.subtitles[0];
  }) : null;
  const virtuoso = useRef<VirtuosoHandle | null>(null);
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

  useEffect(() => {
    const resize = (() => {
      let timer: any = null;
      return () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        } else {
          timer = setTimeout(() => {
            setSmallScreen(document.documentElement.clientWidth < 680);
          }, 20);
        }
      }
    })();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    scrollTo(scrollToIndex, 'smooth');
  }, [virtuoso, scrollToIndex, scrollTo]);

  const subtitleFontSize = userPreference.subtitleFontSize;
  const [playlistPromise] = useState(getPlaylistByPlayingVideo(filePath));

  useEffect(() => {
    if (!fromZoneId) {
      return;
    }
    const sp = fetchStandaloneProps$.subscribe({
      next({ fromZoneId: _fromZoneId }) {
        console.log('receive fetchStandaloneProps');
        if (fromZoneId === fromZoneId) {
          console.log('sending standaloneSubtitleProps');
          standaloneSubtitleProps$.next({
            fromZoneId,
            title,
            filePath,
            seekTo,
            subtitles$,
            loopingSubtitle$,
            playing$,
            scrollToIndex$,
            intensive$,
            intensiveStrategyIndex$,
            onSubtitlesChange,
            onScrollToIndexChange,
            onLoopingSubtitleChange,
            onPlayingChange,
            onIntensiveChange,
          })
        }
      }
    });
    subtitleReadyToFeedStandaloneProps$.next(fromZoneId);
    return () => {
      sp.unsubscribe();
    }
  }, [fromZoneId,
    title,
    filePath,
    seekTo,
    subtitles$,
    loopingSubtitle$,
    playing$,
    scrollToIndex$,
    onSubtitlesChange,
    onScrollToIndexChange,
    onLoopingSubtitleChange,
    onPlayingChange,]);

  const adjustEndFromIndex = (subtitles: Subtitle[], index: number, time: number) => {
    return subtitles.map((s: any, i: number) => {
      if (i >= index) {
        return { ...s, end: s.end + time };
      }
      return s;
    });
  }

  const adjustStartFromIndex = (subtitles: Subtitle[], index: number, time: number) => {
    return subtitles.map((s: any, i: number) => {
      if (i >= index) {
        let t = s.start + time;
        if (t < 0) {
          t = 0;
        }
        return { ...s, start: t };
      }
      return s;
    });
  }


  const renderListItem = (index: number) => {
    const item = subtitles[index];
    if (!item) {
      return null;
    }
    const { end, start, subtitles: localSubtitles, id } = item;
    const playFromStart = (
      nextSubtitles: Subtitle[],
      nextScrollToIndex: number
    ) => {
      const subtitleToPlay = nextSubtitles[nextScrollToIndex];
      seekTo(subtitleToPlay.start / 1000);
    };
    const updateStart = (changeToValue: number) => {
      const nextSubtitles = [
        ...subtitles.slice(0, index),
        { ...subtitles[index], start: changeToValue },
        ...subtitles.slice(index + 1),
      ].sort((a, b) => a.start - b.start);
      onSubtitlesChange(nextSubtitles);
    };
    const updateEnd = (changeToValue: number) => {
      const nextSubtitles = [
        ...subtitles.slice(0, index),
        { ...subtitles[index], end: changeToValue },
        ...subtitles.slice(index + 1),
      ].sort((a, b) => a.start - b.start);
      onSubtitlesChange(nextSubtitles);
    };
    const adjustFrom = (index: number, time: number) => {
      const nextSubtitles = subtitles.map((s: any, i: number) => {
        if (i >= index) {
          return { ...s, start: s.start + time, end: s.end + time };
        }
        return s;
      });
      onSubtitlesChange(nextSubtitles);
      playFromStart(nextSubtitles, index);
    };
    /**
     * 从指定下标起，调节start时间
     * @param index 字幕下标
     * @param time 要调节的时间
     */
    const adjustStartFrom = (index: number, time: number) => {
      const nextSubtitles = adjustStartFromIndex(subtitles, index, time);
      onSubtitlesChange(nextSubtitles);
      playFromStart(nextSubtitles, index);
    };
    /**
     * 从指定下标起，调节end时间
     * @param index 字幕下标
     * @param time 要调节的时间
     */
    const adjustEndFrom = (index: number, time: number) => {
      const nextSubtitles = adjustEndFromIndex(subtitles, index, time);
      onSubtitlesChange(nextSubtitles);
      playFromStart(nextSubtitles, index);
    };
    console.log(`renderListItem index:`, index);
    const endTimeComponent = (
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
                  adjustEndFrom(index, 1000);
                },
                title: "+ 1s",
              },
              {
                onClick: () => {
                  adjustEndFrom(index, -1000);
                },
                title: "- 1s",
              },
            ],
            [
              {
                onClick: () => {
                  adjustEndFrom(index, 500);
                },
                title: "+ 0.5s",
              },
              {
                onClick: () => {
                  adjustEndFrom(index, -500);
                },
                title: "- 0.5s",
              },
            ],
            [
              {
                onClick: () => {
                  adjustEndFrom(index, 250);
                },
                title: "+ 0.25s",
              },
              {
                onClick: () => {
                  adjustEndFrom(index, -250);
                },
                title: "- 0.25s",
              },
            ],
          ]}
          showMenuOnClick
        />
    );
    const startTimeComponent = (
      <LazyInput
          menu={[
            [
              {
                onClick: () => {
                  adjustStartFrom(index, 1000);
                },
                title: "+ 1s",
              },
              {
                onClick: () => {
                  adjustStartFrom(index, -1000);
                },
                title: "- 1s",
              },
            ],
            [
              {
                onClick: () => {
                  adjustStartFrom(index, 500);
                },
                title: "+ 0.5s",
              },
              {
                onClick: () => {
                  adjustStartFrom(index, -500);
                },
                title: "- 0.5s",
              },
            ],
            [
              {
                onClick: () => {
                  adjustStartFrom(index, 250);
                },
                title: "+ 0.25s",
              },
              {
                onClick: () => {
                  adjustStartFrom(index, -250);
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
    );
    const prevSubComponent = (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: 'center',
        flexDirection: 'column',
        ...(smallScreen ? {} : {
          minWidth: '110px',
          maxWidth: '110px',
        }),
      }}>
        <Button disabled={index <= 0} style={{ 
          width: smallScreen ? '35px' : '50px', 
          height: smallScreen ? '35px' : '50px', 
          color: '#ccc', 
          margin: smallScreen ? 0 : '14px', 
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }} type="ghost" onClick={() => {
          const item = subtitles[index - 1];
          onPlayingChange(true);
          if (loopingSubtitle !== null) {
            onLoopingSubtitleChange(item);
          }
          onScrollToIndexChange(index - 1);
        }}>
          <LeftOutlined />
        </Button>
        {!smallScreen && startTimeComponent}
      </div>
    );
    const nextSubComponent = (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: 'center',
        flexDirection: 'column',
        ...(smallScreen ? {} : {
          minWidth: '110px',
          maxWidth: '110px',
        }),
      }}>
        <Button disabled={index >= (subtitles.length - 1)} style={{ 
          width: smallScreen ? '35px' : '50px', 
          height: smallScreen ? '35px' : '50px', 
          color: '#ccc', 
          margin: smallScreen ? 0 : '14px', 
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }} type="ghost" onClick={() => {
          const item = subtitles[index + 1];
          onPlayingChange(true);
          if (loopingSubtitle !== null) {
            onLoopingSubtitleChange(item);
          }
          onScrollToIndexChange(index + 1);
        }}>
          <RightOutlined />
        </Button>
        {!smallScreen && endTimeComponent}
      </div>
    );
    const controlButtonsComponent = (<div style={{display: 'flex', justifyContent: 'space-between', padding: '0 14px', marginTop: '14px'}}>
        {smallScreen && prevSubComponent}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: 'wrap',
      }}>
        <Button
              style={{
                color: "#ccc",
                fontSize: "30px",
                display: "flex",
                justifyContent: "center",
                height: '41px',
              }}
              type="text"
              onClick={() => {
                if (isPlaying && index === scrollToIndex) {
                  onPlayingChange(false);
                  return;
                }
                if (index !== scrollToIndex) {
                  onScrollToIndexChange(index);
                }
                if (index !== scrollToIndex) {
                  playFromStart(subtitles, index);
                }
                onPlayingChange(true);
              }}
            >
              {isPlaying && index === scrollToIndex ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            </Button>
        <Button
          type="text"
          onClick={() => {
            if (item === loopingSubtitle) {
              onLoopingSubtitleChange(null);
              return;
            }
            onPlayingChange(true);
            seekTo((item.start + 10) / 1000);
            onLoopingSubtitleChange(item);
            onScrollToIndexChange(index);
          }}
          style={{
            color: "#ccc",
            fontSize: "30px",
            display: "flex",
            justifyContent: "center",
            background: loopingSubtitle === item ? "#a976ec" : "none",
            height: '41px',

          }}
        >
          <RetweetOutlined />
        </Button>
        <Button
          type="text"
          style={{ background: intensive ? 'rgb(169, 118, 236)' : 'none', display: "flex", justifyContent: "center", 
        
          height: '41px',
        }}
          onClick={() => {
            onIntensiveChange(!intensive)
            message.info(!intensive ? '精听模式已打开' : '精听模式已关闭');
          }}
        >
          <Icon icon="lightning" size={30} color="#ccc" />
        </Button>
        { !smallScreen && (<><Button
          type="text"
          style={{ color: "#ccc", fontSize: '30px', display: "flex", justifyContent: "center", 
        
          height: '41px',
        }}
          onClick={() => {
            console.log('current:', filePath);
            playlistPromise.then(playlist => {
              const index = playlist.findIndex((file) => filePath === file);
              let prevIndex = index - 1;
              if (prevIndex === -1) {
                prevIndex = playlist.length - 1;
              }
              playSubtitle$.next({
                file: playlist[prevIndex],
                start: 0,
                end: 0,
                subtitles: []
              });
              fromZoneId && closeZone$.next(fromZoneId);
            });
          }}
        >
          <StepBackwardOutlined />
        </Button>
        <Button
          type="text"
          style={{ color: "#ccc", fontSize: '30px', display: "flex", justifyContent: "center", 
        
          height: '41px',
        }}
          onClick={() => {
            const dirs = filePath.split('/');
            dirs.pop();
            const parentDir = dirs.join('/');
            console.log('open parentDir:', parentDir);
            openDir$.next(parentDir);
          }}
        >
          <FolderOutlined  />
        </Button>
        <Button
          type="text"
          style={{ color: "#ccc", fontSize: '30px', display: "flex", justifyContent: "center", 
        
          height: '41px',
        }}
          onClick={() => {
            console.log('current:', filePath);
            playlistPromise.then(playlist => {
              const index = playlist.findIndex((file) => filePath === file);
              let nextIndex = index + 1;
              if (nextIndex === playlist.length) {
                nextIndex = 0;
              }
              fromZoneId && closeZone$.next(fromZoneId);
              playSubtitle$.next({
                file: playlist[nextIndex],
                start: 0,
                end: 0,
                subtitles: []
              });
            });
          }}
        >
          <StepForwardOutlined  />
        </Button></>)}
        <Dropdown placement="bottom" arrow overlay={<Menu>
          <Menu.Item onClick={() => {
            const lengthBeforMerge = subtitles.length;
            const nextSubtitles = adjustStartFromIndex(adjustEndFromIndex(subtitles, 0, 50), 0, -50)
              .reduce((acc, curr) => {
                let last = acc[acc.length - 1];
                console.log('debug merge, last subtitle:', last);
                let shouldMerge = last && ((last.end - last.start < 10000) && last.end >= curr.start || last.end > curr.end);
                if (shouldMerge) {
                  const merged = mergeSubtitles(last, curr);
                  last.end = merged.end;
                  last.subtitles = merged.subtitles;
                } else {
                  if (last && last.end >= curr.start) {
                    curr.start = last.end + 50;
                    last.end -= 50;
                  }
                  acc.push(curr);
                }
                return acc;
              }, [] as Subtitle[]);
            const lengthAfterMerge = nextSubtitles.length;
            const mergedLength = lengthBeforMerge - lengthAfterMerge;
            onSubtitlesChange(nextSubtitles);
            if (mergedLength > 0) {
              message.info(`合并了${mergedLength}条字幕`);
              seekTo(nextSubtitles[0].start / 1000);
              onScrollToIndexChange(0);
              onLoopingSubtitleChange(null);
            } else {
              message.info(`未找到相邻的可合并字幕`, 2);
            }
          }}>自动合并字幕</Menu.Item>
          <Menu.Item onClick={() => {
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
            onSubtitlesChange(nextSubtitles);
            // const nextScrollToIndex = nextSubtitles.findIndex(
            //   ({ id: _id }) => _id === id
            // );
            // playFromStart(nextSubtitles, nextScrollToIndex);
            // onScrollToIndexChange(nextScrollToIndex);
          }}>与下一条字幕合并</Menu.Item>
          <Menu.Item onClick={() => { '35px'
            const nextSubtitles = [
              ...subtitles.slice(0, index),
              ...subtitles.slice(index + 1),
            ];
            onSubtitlesChange(nextSubtitles);
          }}>删除本条字幕</Menu.Item>
          <Menu.Item onClick={() => {
            reloadSubtitlesOfVideo(filePath).then((nextSubtitles) => {
              onSubtitlesChange(nextSubtitles);
            });
          }}>重新载入字幕</Menu.Item>
        </Menu>}>
          <Button
            style={{
              color: "#ccc",
              fontSize: "30px",
              display: "flex",
              justifyContent: "center",
              height: '41px',
            }}
            type="text"
          >
            <MoreOutlined />
          </Button>
        </Dropdown>
      </div>
      {smallScreen && nextSubComponent}
      </div>
    );
    const controllerComponent = smallScreen ? (
      <div style={{display: 'flex', flexDirection: 'column',}}>
        {controlButtonsComponent}
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <div >{startTimeComponent}</div>
          <div >{endTimeComponent}</div>
        </div>
      </div>
    ) : (
      <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "black",
            padding: "6px",
            borderRadius: "0 0 15px 15px",
          }}
        >
          {prevSubComponent}
          {controlButtonsComponent}
          {nextSubComponent}
        </div>
    );
    const subtitleComponent = (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div
            style={{
              minHeight: subtitleFontSize * 2 + 'px',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <div style={{ maxHeight: '100%', overflowY: 'auto', position: 'absolute' }}>
              <div
                style={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  margin: "20px 14px",
                  fontSize: subtitleFontSize + 'px',
                  color: scrollToIndex === index ? "#a976ec" : "#ccc",
                }}
              >
                {localSubtitles.map((s: string, subIndex: number) => {
                  return (
                    <LazyInput
                      showSearchBtn
                      onSearch={() => {
                        searchSentence(s);
                      }}
                      key={s + subIndex}
                      showEditBtn
                      menu={[
                        [
                          {
                            title: "当前及后续字幕 后移1s",
                            onClick: () => {
                              adjustFrom(index, 1000);
                            },
                          },
                          {
                            title: "当前及后续字幕 前移1s",
                            onClick: () => {
                              adjustFrom(index, -1000);
                            },
                          },
                        ],
                        [
                          {
                            title: "当前及后续字幕 后移0.5s",
                            onClick: () => {
                              adjustFrom(index, 500);
                            },
                          },
                          {
                            title: "当前及后续字幕 前移0.5s",
                            onClick: () => {
                              adjustFrom(index, -500);
                            },
                          },
                        ],
                        [
                          {
                            title: "当前及后续字幕 后移0.25s",
                            onClick: () => {
                              adjustFrom(index, +250);
                            },
                          },
                          {
                            title: "当前及后续字幕 前移0.25s",
                            onClick: () => {
                              adjustFrom(index, -250);
                            },
                          },
                        ],
                      ]}
                      onWordClick={(word) => {
                        tapWord$.next(word);
                        subtitleToBeAdded$.next({
                          file: filePath,
                          title,
                          ...item,
                          context: subtitles.slice(Math.max(0, index - 2), index + 1),
                        });
                      }}
                      onWordDoubleClick={(word, wordIndex) => {
                        const words = s.split(/\s/);
                        const splitTime = parseInt((start + (end - start) * wordIndex / words.length) + '') || start;
                        Modal.confirm({
                          title: '拆分字幕',
                          content: '从此单词处拆分为两段字幕',
                          onOk() {
                            const nextSubtitles = [
                              ...subtitles.slice(0, index),
                              {
                                ...subtitles[index],
                                subtitles: [
                                  ...localSubtitles.slice(0, subIndex),
                                  words.slice(0, wordIndex).join(' '),
                                  ...localSubtitles.slice(subIndex + 1),
                                ],
                                start,
                                end: splitTime,
                              },
                              {
                                ...subtitles[index],
                                subtitles: [
                                  ...localSubtitles.slice(0, subIndex),
                                  words.slice(wordIndex).join(' '),
                                  ...localSubtitles.slice(subIndex + 1),
                                ],
                                start: splitTime + 100,
                                end,
                              },
                              ...subtitles.slice(index + 1),
                            ];
                            onSubtitlesChange(nextSubtitles);
                          }
                        });
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
                        onSubtitlesChange(nextSubtitles);
                      }}
                    ></LazyInput>
                  );
                })}
              </div>
            </div>
            {intensive && playHow?.showSubtitle === false && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', }}>
              <div style={{ background: '#000', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '20px' }}>
                精听循环第{intensiveStrategyIndex + 1}遍，{playHow.speed} 倍速播放
              </div>
            </div>}
          </div>

        </div>
    );
    if (smallScreen) {
      return <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        {controllerComponent}
        {subtitleComponent}
      </div>;
    }
    return (
      <div
        key={item.id}
        style={{
          height: 'auto',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {controllerComponent}
        {subtitleComponent}
      </div>
    );
  };

  if (subtitles.length === 0) {
    return null;
  }
  console.log('render subtitle, scrollToIndex:', scrollToIndex);
  if (inTVModeFullScreen) {
    if (userPreference.hideSubtitlesInTvMode) {
      return null;
    }
    const item = subtitles[scrollToIndex];
    const { end, start, subtitles: localSubtitles, id } = item;
    const subtitleContainerWidth = document.body.clientWidth;
    const subtitleContainerFontSize = subtitleContainerWidth * 0.02;
    return <div style={{ color: '#fff', background: 'rgba(0, 0, 0, .3)', fontSize: `${subtitleContainerFontSize}px`, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>{localSubtitles.map((s) => {
      return <div style={{textAlign: 'center'}}> {s} </div>
    })}</div>
  }
  return (
    <div style={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      {
        renderListItem(scrollToIndex > -1 ? scrollToIndex : 0)
      }
    </div>
  );
};
