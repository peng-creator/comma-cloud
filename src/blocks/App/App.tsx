import { Button, Drawer, Input, message, Modal } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ZoneDefinition } from "../../type/Zone";
import { ResourceLoader } from "../ResourceLoader/ResourceLoader";
import {
  Menu as ContextMenu,
  Item,
  Separator,
  theme,
} from "react-contexify";
import { useBehavior } from "../../state";
import { contextMenu$ } from "../../state/contextMenu";
import {
  Corner,
  getNodeAtPath,
  getOtherDirection,
  getPathToCorner,
  Mosaic,
  MosaicDirection,
  MosaicNode,
  MosaicParent,
  MosaicWindow,
  RemoveButton,
  updateTree
} from "react-mosaic-component";
import classNames from 'classnames';
import { Icon } from "@blueprintjs/core";
import "react-mosaic-component/react-mosaic-component.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import { dropRight } from "lodash";
import { Zone } from "../Zone/Zone";
import { dragWindowEnd$, dragWindowStart$, isDraggingSplitBar$ } from "../../state/zone";
import { AppstoreOutlined, SearchOutlined, ArrowsAltOutlined, ShrinkOutlined } from "@ant-design/icons";
import { search$, searchSentence } from "../../state/search";
import { TapCache } from "../../compontent/TapCache/TapCache";
import { StatusBar, Style } from '@capacitor/status-bar';
import { playSubtitle$ } from "../../state/video";
import { openNote$ } from "../CardMaker/CardMaker";
import { openStandaloneSubtitle$ } from "../../state/subtitle";
import { searchYoutubeVide } from "../../service/http/Youtube";
import { playYoutubeSubtitle$ } from "../../state/youtube";

// iOS only
window.addEventListener('statusTap', function () {
  console.log('statusbar tapped');
});

// Display content under transparent status bar (Android only)
StatusBar.setOverlaysWebView({ overlay: true });

const setStatusBarStyleDark = async () => {
  await StatusBar.setStyle({ style: Style.Dark });
};

const setStatusBarStyleLight = async () => {
  await StatusBar.setStyle({ style: Style.Light });
};

const showStatusBar = async () => {
  await StatusBar.show();
};


const hideStatusBar = async () => {
  await StatusBar.hide();
};

hideStatusBar()


export const THEMES = {
  'Blueprint': 'mosaic-blueprint-theme',
  'Blueprint Dark': classNames('mosaic-blueprint-theme', 'bp3-dark'),
};

let windowCount = 0;

const MosaicWindowNumber: any = MosaicWindow;
const MosaicNumber: any = Mosaic;

function hasClass(element: any, cls: string) {
  return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
}

window.addEventListener('mousedown', ({ target }) => {
  if (hasClass(target, 'mosaic-split')) {
    console.log('true');
    isDraggingSplitBar$.next(true);
  } else {
    // console.log('false');
  }
});

window.addEventListener('mouseup', ({ target }) => {
  isDraggingSplitBar$.next(false);
});

export const App = () => {
  const [zones, setZones] = useState<ZoneDefinition[]>([]);
  const [showAddZone, setShowAddZone] = useState(false);
  const [showResourceLoader, setShowResourceLoader] = useState(false);
  const [contextMenuList] = useBehavior(contextMenu$, []);

  const [currentNode, setCurrentNode] = useState<MosaicNode<number> | null>(null);
  const [inputSearchValue, setInputSearchValue] = useState("");
  const searchBoxRef: any = useRef<any>();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [youtubeResult, setYoutubeResult] = useState<any>(null);

  useEffect(() => {
    const sp = search$.subscribe({
      next(s) {
        setInputSearchValue(s);
      },
    })
    return () => {
      sp.unsubscribe();
    };
  }, []);

  const addToTopRight = useCallback(() => {
    let nextNode: MosaicNode<number> | null = null;
    if (currentNode) {
      const path = getPathToCorner(currentNode, Corner.TOP_RIGHT);
      const parent = getNodeAtPath(currentNode, dropRight(path)) as MosaicParent<number>;
      const destination = getNodeAtPath(currentNode, path) as MosaicNode<number>;
      // const direction: MosaicDirection = parent ? getOtherDirection(parent.direction) : 'row';
      const direction: MosaicDirection = 'row';

      let first: MosaicNode<number>;
      let second: MosaicNode<number>;
      if (direction === 'row') {
        first = destination;
        second = ++windowCount;
      } else {
        first = ++windowCount;
        second = destination;
      }

      nextNode = updateTree(currentNode, [
        {
          path,
          spec: {
            $set: {
              direction,
              first,
              second,
            },
          },
        },
      ]);
    } else {
      nextNode = ++windowCount;
    }

    setCurrentNode(nextNode);
  }, [currentNode]);

  useEffect(() => {
    const sp = playSubtitle$.subscribe({
      next(sub) {
        const {file} = sub;
        if (!file) {
          message.warn('没有文件路径！');
          return;
        }
        const arr = file.split("/");
        setZones([
          ...zones,
          {
            id: zones.length + 1,
            title: arr[arr.length - 1],
            type: "video",
            data: {
              filePath: file,
              subtitle: sub,
            },
          },
        ]);
        addToTopRight();
      },
    });
    const sp0 = playYoutubeSubtitle$.subscribe({
      next(sub) {
        const {file, title} = sub;
        if (!file) {
          message.warn('没有文件路径！');
          return;
        }
        setZones([
          ...zones,
          {
            id: zones.length + 1,
            title: title || file,
            type: 'youtube',
            data: {
              videoId: file.split('=')[1],
              subtitle: sub,
              title,
            },
          },
        ]);
        addToTopRight();
      },
    })
    const sp1 = openStandaloneSubtitle$.subscribe({
      next({
        title,
        filePath,
        player,
        subtitles$,
        loopingSubtitle$,
        scrollToIndex$,
        onSubtitlesChange,
        onScrollToIndexChange,
        onLoopingSubtitleChange,
        onPlayingChange,
      }) {
        setZones([
          ...zones,
          {
            id: zones.length + 1,
            title,
            type: 'subtitle',
            data: {
              filePath,
              player,
              subtitles$,
              loopingSubtitle$,
              scrollToIndex$,
              onSubtitlesChange,
              onScrollToIndexChange,
              onLoopingSubtitleChange,
              onPlayingChange,
            },
          },
        ]);
        addToTopRight();
      },
    });
    return () => {
      sp0.unsubscribe();
      sp.unsubscribe();
      sp1.unsubscribe();
    };
  }, [zones, addToTopRight]);

  useEffect(() => {
    const sp = openNote$.subscribe({
      next(note) {
        const {file} = note;
        if (!file) {
          message.warn('没有文件路径！');
          return;
        }
        const arr = file.split("/");
        setZones([
          ...zones,
          {
            id: zones.length + 1,
            title: arr[arr.length - 1],
            type: "pdf",
            data: {
              filePath: file,
              note,
            },
          },
        ]);
        addToTopRight();
      },
    })
    return () => {
      sp.unsubscribe();
    };
  }, [zones, addToTopRight]);

  const openYoutubeWindow = (videoId: string, title: string) => {
    setZones([
      ...zones,
      {
        id: zones.length + 1,
        title,
        type: "youtube",
        data: {
          title,
          videoId
        },
      },
    ]);
    addToTopRight();
    setShowAddZone(false);
  }
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <TapCache />
      <ResourceLoader
        visible={showResourceLoader}
        onClose={() => {
          setShowResourceLoader(false);
        }}
        onOpenPDF={(filePath) => {
          console.log("onOpenPDF:", filePath);
          const arr = filePath.split("/");
          setZones([
            ...zones,
            {
              id: zones.length + 1,
              title: arr[arr.length - 1],
              type: "pdf",
              data: {
                filePath,
              },
            },
          ]);
          addToTopRight();
          setShowResourceLoader(false);
        }}
        onOpenVideo={(filePath) => {
          console.log("onOpenVideo:", filePath);
          const arr = filePath.split("/");
          setZones([
            ...zones,
            {
              id: zones.length + 1,
              title: arr[arr.length - 1],
              type: "video",
              data: {
                filePath,
              },
            },
          ]);
          addToTopRight();
          setShowResourceLoader(false);
        }}
      ></ResourceLoader>
      <Drawer
        title={null}
        placement="top"
        closable={false}
        onClose={() => {
          setShowAddZone(false);
        }}
        visible={showAddZone}
        height={100}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <Button
            onClick={() => {
              setZones([
                ...zones,
                {
                  id: zones.length + 1,
                  title: "词典",
                  type: "dict",
                  data: {
                    name: "有道",
                    template: "https://mobile.youdao.com/dict?le=eng&q={}",
                  },
                },
              ]);
              addToTopRight();
              setShowAddZone(false);
            }}
          >
            词典
          </Button>
          <Button
            onClick={() => {
              setZones([
                ...zones,
                {
                  id: zones.length + 1,
                  title: "卡片编辑器",
                  type: "cardMaker",
                  data: {
                    // name: "有道",
                    // template: "http://mobile.youdao.com/dict?le=eng&q={}",
                  },
                },
              ]);
              addToTopRight();
              setShowAddZone(false);
            }}
          >
            卡片编辑器
          </Button>
          <Button
            onClick={() => {
              setShowResourceLoader(true);
              setShowAddZone(false);
            }}
          >
            文件
          </Button>
        </div>
      </Drawer>
      <ContextMenu
        id="MENU_ID"
        animation={false}
        theme={theme.dark}
        style={{ position: "fixed" }}
      >
        {contextMenuList.map((itemList, index) => {
          return (
            <>
              {itemList.map((item, _index) => {
                const key = index + "-" + _index + "-item";
                console.log("item key:", key);
                return (
                  <Item key={key} onClick={item.onClick}>
                    {item.title}
                  </Item>
                );
              })}
              {index < contextMenuList.length - 1 && (
                <Separator key={index + "-Separator"} />
              )}
            </>
          );
        })}
      </ContextMenu>
      <div style={{ height: "100%" }}>

        <div style={{ height: 'calc(100% - 50px)' }}>
          <MosaicNumber
            blueprintNamespace="bp4"
            className={THEMES['Blueprint Dark']}
            zeroStateView={<div>没有打开的窗口</div>}
            resize={{
              minimumPaneSizePercentage: 0
            }}
            renderTile={(count: number, path: any) => (
              <MosaicWindowNumber
                onDragStart={() => {
                  dragWindowStart$.next(true);
                }}
                onDragEnd={() => {
                  dragWindowEnd$.next(true);
                }}
                toolbarControls={React.Children.toArray([
                  <Button type="text" onClick={(e) => {
                    if (isFullScreen) {
                      document.exitFullscreen();
                      setIsFullScreen(false);
                    } else {
                      const findParentMosaicTile = (target: HTMLElement): HTMLElement => {
                        const parent = target.parentElement;
                        if (!parent) {
                          return target;
                        }
                        if (parent.className.includes('mosaic-tile')) {
                          return target;
                        }
                        return findParentMosaicTile(parent);
                      }
                      const zoneToBeFullScreen = findParentMosaicTile(e.target as HTMLElement);
                      console.log('zoneToBeFullScreen:', zoneToBeFullScreen);
                      zoneToBeFullScreen?.requestFullscreen().then(() => {
                        setIsFullScreen(true);
                      });
                    }
                  }}><Icon style={{position: 'relative', top: '-3px'}} icon="fullscreen" size={12} color="#5f6b7c" /></Button>,
                  <RemoveButton />,
                ])}
                title={zones[count - 1].title}
                createNode={() => {
                  return ++windowCount;
                }}
                path={path}
              >
                <Zone difinition={zones[count - 1]}></Zone>
              </MosaicWindowNumber>
            )}
            value={currentNode}
            onChange={(node: MosaicNode<number> | null) => {
              setCurrentNode(node);
            }}
          />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '14px' }}>
          <div style={{width: '420px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
            <Button
            style={{ color: 'white', padding: '0 30px', height: '50px', fontSize: '25px' }}
            type="text"
            onClick={() => {
              setShowAddZone(true);
            }}><AppstoreOutlined /></Button>
            <Input
              prefix={<SearchOutlined />}
              ref={searchBoxRef}
              type="text"
              value={inputSearchValue}
              onChange={(e) => {
                setInputSearchValue(e.target.value);
              }}
              style={{
                color: "rgb(100, 100, 100)",
                fontSize: "24px",
                flexGrow: 1,
                maxWidth: '300px',
                height: '30px'
              }}
              onKeyDown={(e) => {
                const key = e.key.toLowerCase();
                if (key === "enter".toLowerCase()) {
                  searchSentence(inputSearchValue);
                }
              }}
              placeholder="搜索"
            />
          <Button style={{marginLeft: '10px'}} onClick={() => {
            const hide = message.loading('玩命搜索中..', 0);
            searchYoutubeVide(inputSearchValue).then((data) => {
              setYoutubeResult(data);
              setShowYoutubeModal(true);
            }).finally(() => {
              hide()
            });
              
          }}>youtube</Button>
          {youtubeResult !== null &&           <Modal 
          width="95%"
          title="搜索结果" 
          visible={showYoutubeModal && youtubeResult} 
          onOk={() => {
            setShowYoutubeModal(false);
          }} 
          onCancel={() => {
            setShowYoutubeModal(false);
          }}>
            <div>
              {youtubeResult.items.map((item: any) => {
                const {id, snippet} = item;
                const {videoId} = id;
                const {title, thumbnails, description} = snippet;
                return <div key={id.videoId} onClick={() => {
                  openYoutubeWindow(videoId, title);
                }}
                  style={{
                    display: 'flex',
                    margin: '14px 0',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{minWidth: '200px', maxWidth: '200px', minHeight: '200px', background: `no-repeat center url("${thumbnails.medium.url}")`}}></div>
                  <div style={{flexGrow: 1, marginLeft: '14px'}}>
                    <div style={{fontSize: '18px'}}>{title}</div>
                    <div style={{fontSize: '15px', color: '#bbb'}}>{description}</div>
                  </div>
                </div>
              })}
            </div>
            {youtubeResult.prevPageToken && <Button onClick={() => {
              const hide = message.loading('玩命搜索中..', 0);
              searchYoutubeVide(inputSearchValue, youtubeResult.prevPageToken).then((data) => {
                setYoutubeResult(data);
              }).finally(() => {
                hide()
              });
            }}>上一页</Button>}
            {youtubeResult.nextPageToken && <Button onClick={() => {
              const hide = message.loading('玩命搜索中..', 0);
              searchYoutubeVide(inputSearchValue, youtubeResult.nextPageToken).then((data) => {
                setYoutubeResult(data);
              }).finally(() => {
                hide()
              });
            }}>下一页</Button>}
          </Modal>}

          </div>
          <div>
            <Button type="text" style={{color: 'white', fontSize: '20px'}} onClick={() => {
              if (isFullScreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
              } else {
                document.body.requestFullscreen().then(() => setIsFullScreen(true));
              }
            }} >
              {isFullScreen ? <ShrinkOutlined /> : <ArrowsAltOutlined />}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};
