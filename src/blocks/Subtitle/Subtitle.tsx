import { Button, Dropdown, Menu, Popconfirm, Switch, Tooltip } from "antd";
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
import { defaultIntensiveStrategy } from "../../type/SubtitlePlayStrategy";
import { Icon } from "@blueprintjs/core";

export const SubtitleComponent = ({
  title,
  filePath,
  seekTo,
  subtitles$,
  loopingSubtitle$,
  isPlaying$,
  scrollToIndex$,
  intensive$,
  insiveStrategyIndex$,
  onSubtitlesChange,
  onScrollToIndexChange,
  onLoopingSubtitleChange,
  onPlayingChange,
  onIntensiveChange,
  fromZoneId,
  layoutMode,
}: {
  fromZoneId?: string;
  title: string;
  style?: CSSProperties;
  filePath: string;
  subtitles$: BehaviorSubject<Subtitle[]>;
  seekTo: (time: number) => void;
  isPlaying$: BehaviorSubject<boolean>;
  loopingSubtitle$: BehaviorSubject<Subtitle | null>;
  scrollToIndex$: BehaviorSubject<number>;
  intensive$: BehaviorSubject<boolean>;
  insiveStrategyIndex$: BehaviorSubject<number>;
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
  const [isPlaying] = useBehavior(isPlaying$, false);
  const [scrollToIndex] = useBehavior(scrollToIndex$, -1);
  const [intensive] = useBehavior(intensive$, true);
  const [insiveStrategyIndex] = useBehavior(insiveStrategyIndex$, 0);
  const playHow = defaultIntensiveStrategy[insiveStrategyIndex];

  const subtitles = _subtitles || [];
  const loopingSubtitle = _loopingSubtitle !== null ? subtitles.find(({start, end, subtitles}) => {
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
    scrollTo(scrollToIndex, 'smooth');
  }, [virtuoso, scrollToIndex, scrollTo]);

  const [singleMode, setSingleMode] = useState(true);
  const [subtitleFontSize, setSubtitleFontSize] = useState(18);

  useEffect(() => {
    if (!fromZoneId) {
      return;
    }
    const sp = fetchStandaloneProps$.subscribe({
      next({fromZoneId: _fromZoneId}) {
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
            isPlaying$,
            scrollToIndex$,
            intensive$,
            insiveStrategyIndex$,
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
    isPlaying$,
    scrollToIndex$,
    onSubtitlesChange,
    onScrollToIndexChange,
    onLoopingSubtitleChange,
    onPlayingChange,]);
  
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
      if (
        loopingSubtitle !== null 
      ) {
        // 字幕正在循环
        onLoopingSubtitleChange(subtitleToPlay);
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
      onSubtitlesChange(nextSubtitles);
      onScrollToIndexChange(nextScrollToIndex);
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
      onSubtitlesChange(nextSubtitles);
      onScrollToIndexChange(nextScrollToIndex);
      playFromStart(nextSubtitles, nextScrollToIndex);
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
      const nextSubtitles = subtitles.map((s: any, i: number) => {
        if (i >= index) {
          return { ...s, start: s.start + time, };
        }
        return s;
      });
      onSubtitlesChange(nextSubtitles);
      playFromStart(nextSubtitles, index);
    };
    /**
     * 从指定下标起，调节end时间
     * @param index 字幕下标
     * @param time 要调节的时间
     */
    const adjustEndFrom = (index: number, time: number) => {
      const nextSubtitles = subtitles.map((s: any, i: number) => {
        if (i >= index) {
          return { ...s, end: s.end + time };
        }
        return s;
      });
      onSubtitlesChange(nextSubtitles);
      playFromStart(nextSubtitles, index);
    };
    console.log(`renderListItem index:`, index);
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
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "black",
            padding: "6px 10px",
            borderRadius: "0 0 15px 15px",
            flexWrap: 'wrap',
          }}
        >
          <Button
            style={{
              color: "#ccc",
              fontSize: "20px",
              display: "flex",
              justifyContent: "center",
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
            {isPlaying && index === scrollToIndex ? <PauseCircleOutlined /> : <PlayCircleOutlined /> }
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
              fontSize: "20px",
              display: "flex",
              justifyContent: "center",
              background: loopingSubtitle === item ? "#a976ec" : "none",
            }}
          >
            <RetweetOutlined />
          </Button>

          <Button
            style={{
              color: "#ccc",
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
              onSubtitlesChange(nextSubtitles);
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              style={{
                color: "#ccc",
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
              color: "#ccc",
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
              onSubtitlesChange(nextSubtitles);
              const nextScrollToIndex = nextSubtitles.findIndex(
                ({ id: _id }) => _id === id
              );
              playFromStart(nextSubtitles, nextScrollToIndex);
              onScrollToIndexChange(nextScrollToIndex);
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
                const addToCardSubtitle = {
                  file: filePath,
                  title,
                  ...subtitle,
                };
                addSubtitle$.next(addToCardSubtitle);
                addSubtitleInput$.next(addToCardSubtitle);
              }}
              style={{
                color: "#ccc",
                fontSize: "20px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <FileAddOutlined />
            </Button>
          </Tooltip>
        </div>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
          <div
            style={{
              minHeight: subtitleFontSize * 2 + 'px',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...(singleMode ? {
                maxHeight: "calc(100% - 36px)",
                height: "calc(100% - 50px)",
              } : {})
            }}
          >
            <div style={{maxHeight: '100%', overflowY: 'auto', ...(singleMode ? { position: 'absolute', } : {})}}>
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
            {intensive && playHow?.showSubtitle === false && <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '14px 14px 0', }}>
              <div style={{ background: '#000', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '20px'}}>
                精听循环第{insiveStrategyIndex + 1}遍，{playHow.speed} 倍速播放
              </div>
            </div>} 
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
          </div>
        </div>
        <div style={{
          borderBottom: singleMode ? 'none' : "1px solid #c4bfbf",
          color: "#ccc",
          display: singleMode ? 'flex' : 'none',
          alignItems: 'stretch',
          overflow: 'hidden',
          height: '40px',
        }}>
          <Button disabled={index <= 0} style={{height: '100%', flexGrow: 1, color: '#ccc'}} type="ghost" onClick={() => {
            const item = subtitles[index - 1];
            onPlayingChange(true);
            seekTo((item.start + 10) / 1000);
            if (loopingSubtitle !== null) {
              onLoopingSubtitleChange(item);
            }
            onScrollToIndexChange(index - 1);
          }}>
            <LeftOutlined />
          </Button>

          <Button disabled={index >= (subtitles.length - 1)} style={{height: '100%', flexGrow: 1, color: '#ccc'}} type="ghost" onClick={() => {
            const item = subtitles[index + 1];
            onPlayingChange(true);
            seekTo((item.start + 10) / 1000);
            if (loopingSubtitle !== null) {
              onLoopingSubtitleChange(item);
            }
            onScrollToIndexChange(index + 1);
          }}>
            <RightOutlined />
          </Button>
        </div>
      </div>
    );
  };

  if (subtitles.length === 0) {
    return null;
  }

  return (
    <div style={{width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
      <div
        style={{
          width: "100%",
          padding: '5px 0',
          display: layoutMode === 0 ? 'flex' : 'none',
          justifyContent: "center",
          background: "black",
          flexWrap: 'wrap',
        }}
      >
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
                  onSubtitlesChange(nextSubtitles);
                  onLoopingSubtitleChange(null);
                  onScrollToIndexChange(0);
                  seekTo(nextSubtitles[0].start / 1000);
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
                  onSubtitlesChange(nextSubtitles);
                  onLoopingSubtitleChange(null);
                  onScrollToIndexChange(0);
                  seekTo(nextSubtitles[0].start / 1000);
                }}
              >
                非标点结尾的合并
              </Menu.Item>
              <Menu.Item
                onClick={() => {
                  const nextSubtitles = subtitles.reduce((acc, curr) => {
                    let last = acc[acc.length - 1];
                    let shouldMerge = last && last.end > curr.start; 
                    if (shouldMerge) {
                      const merged = mergeSubtitles(last, curr);
                      last.end = merged.end;
                      last.subtitles = merged.subtitles;
                    } else {
                      acc.push(curr);
                    }
                    return acc;
                  }, [] as Subtitle[]);
                  onSubtitlesChange(nextSubtitles);
                  onLoopingSubtitleChange(null);
                  onScrollToIndexChange(0);
                  seekTo(nextSubtitles[0].start / 1000);
                }}
              >
                有时间交叉的合并
              </Menu.Item>
            </Menu>
          }
          placement="bottom"
        >
          <Button type="text" style={{ color: "#ccc", fontSize: '18px' }}>
            <MergeCellsOutlined
                style={{
                  position: "relative",
                  bottom: "4px",
                  transform: "rotate(90deg)",
                }}
              />
          </Button>
        </Dropdown>
        <Button
          type="text"
          style={{ background: singleMode ? 'none' : 'rgb(169, 118, 236)' }}
          onClick={() => {
            setSingleMode(!singleMode);
          }}
        >
          <Icon icon="list" size={18} color="#ccc" />
        </Button>
        {!singleMode && <Button
          type="text"
          style={{ color: "#ccc" }}
          onClick={() => {
            scrollTo(scrollToIndex, "auto");
          }}
        >
          <Icon icon="locate" size={18} color="#ccc" />
        </Button>}
        <Button
          type="text"
          style={{ background: intensive ? 'rgb(169, 118, 236)' : 'none' }}
          onClick={() => {
            onIntensiveChange(!intensive)
          }}
        >
          <Icon icon="lightning" size={18} color="#ccc" />
        </Button>
        <Button
          type="text"
          style={{ color: "#ccc" }}
          onClick={() => {
            setSubtitleFontSize(subtitleFontSize - 1);
          }}
        >
          <FontSizeOutlined /> -
        </Button>
        <Button
          type="text"
          style={{ color: "#ccc" }}
          onClick={() => {
            setSubtitleFontSize(subtitleFontSize + 1);
          }}
        >
          <FontSizeOutlined /> +
        </Button>
        {fromZoneId && <Button
          type="text"
          style={{ color: "#ccc" }}
          onClick={() => {
            console.log('openStandaloneSubtitle, title:', title);
            openStandaloneSubtitle$.next({
              title,
              filePath,
              fromZoneId,
            });
          }}
        >
          <Icon icon="duplicate" size={18} color="#ccc" />
        </Button>}
      </div>
      {!singleMode && <Virtuoso
        style={{ flexGrow: 1, overflowX: 'hidden' }}
        totalCount={subtitles.length}
        ref={virtuoso}
        itemContent={(index) => renderListItem(index)}
      />}
      {
        singleMode && renderListItem(scrollToIndex > -1 ? scrollToIndex : 0)
      }
    </div>
  );
};
