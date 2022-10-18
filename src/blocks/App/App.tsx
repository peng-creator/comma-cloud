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
import { dragWindowEnd$, dragWindowStart$, isDraggingSplitBar$, toggleLayout$ } from "../../state/zone";
import { AppstoreOutlined, SearchOutlined, ArrowsAltOutlined, ShrinkOutlined, DownOutlined, UpCircleOutlined, UpOutlined } from "@ant-design/icons";
import { search$, searchSentence } from "../../state/search";
import { TapCache } from "../../compontent/TapCache/TapCache";
import { StatusBar, Style } from '@capacitor/status-bar';
import { playSubtitle$, playSubtitleRecord$ } from "../../state/video";
import { openNote$ } from "../CardMaker/CardMaker";
import { openStandaloneSubtitle$ } from "../../state/subtitle";
import { v4 as uuidv4 } from "uuid";
import { closeZone, registerZones } from "../../service/http/Zone";
import { getRecords, Record } from "../../service/http/Records";

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

  const [currentNode, setCurrentNode] = useState<MosaicNode<string> | null>(null);
  const [inputSearchValue, setInputSearchValue] = useState("");
  const searchBoxRef: any = useRef<any>();
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [records, setRecords] = useState([] as Record[]);
  const [fullScreenZoneId, setFullScreenZoneId] = useState('');
  const [showBottomBar, setShowBottomBar] = useState(true);

  const saveWorkZones = (currentNode: MosaicNode<string> | null, zones: ZoneDefinition[]) => {
    console.log('currentNode: ', currentNode);
    let serializedWindowTree = '';
    let serializedZones = '[]';
    try {
      serializedWindowTree = JSON.stringify(currentNode);
    } catch (e) {
      if (typeof currentNode === 'string') {
        serializedWindowTree = currentNode;
      }
    }
    try {
      console.log('JSON.stringify(zones), zoens:', zones);
      serializedZones = JSON.stringify(zones);
    } catch (e) {
      console.log('JSON.stringify(zones) failed:', e);
    }
    localStorage.setItem('serializedWindowTree', serializedWindowTree);
    localStorage.setItem('serializedZones', serializedZones);
  };

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

  const resigerZonesLocal = useCallback(() => {
    if (zones.length > 0) {
      registerZones(zones.map((zone) => {
        return {
          ...zone, registerTimeStamp: Date.now().valueOf(),
        };
      }));
    }
  }, [zones]);

  useEffect(() => {
    resigerZonesLocal();
    const timer = setInterval(() => {
      resigerZonesLocal();
    }, 20000);
    return () => clearInterval(timer);
  }, [zones, resigerZonesLocal]);

  const addWindow = useCallback((nodeToAdd: MosaicNode<string>) => {
    let nextNode: MosaicNode<string> | null = null;
    if (currentNode) {
      nextNode = {
        direction: 'column',
        first: nodeToAdd,
        second: currentNode,
      }
    } else {
      nextNode = nodeToAdd;
    }
    setCurrentNode(nextNode);
    return nextNode;
  }, [currentNode]);

  const addZone = useCallback((zone: Omit<ZoneDefinition, "id" | "registerTimeStamp">) => {
    const id = uuidv4();
    const nextZones = [
      ...zones,
      {
        ...zone,
        id,
      }
    ];
    setZones(nextZones);
    const nextNode = addWindow(id);
    saveWorkZones(nextNode, nextZones);
  }, [zones, addWindow]);

  const removeZone = useCallback((zone: ZoneDefinition) => {
    setZones(zones.filter(z => z.id !== zone.id));
    closeZone(zone.id);
  }, [zones]);

  useEffect(() => {
    const sp = playSubtitle$.subscribe({
      next(sub) {
        const { file } = sub;
        if (!file) {
          message.warn('没有文件路径！');
          return;
        }
        const arr = file.split("/");
        addZone({
          title: arr[arr.length - 1],
          type: "video",
          data: {
            filePath: file,
            subtitle: sub,
          },
        });
      },
    });
    const sp1 = openStandaloneSubtitle$.subscribe({
      next({
        title,
        filePath,
        fromZoneId,
      }) {
        console.log('openStandaloneSubtitle: ', title,
          filePath,
          fromZoneId,);
        addZone({
          title,
          type: 'subtitle',
          data: {
            filePath,
            fromZoneId,
          },
        },);
      },
    });
    return () => {
      sp.unsubscribe();
      sp1.unsubscribe();
    };
  }, [zones, addZone]);

  useEffect(() => {
    const sp = openNote$.subscribe({
      next(note) {
        const { file } = note;
        if (!file) {
          message.warn('没有文件路径！');
          return;
        }
        const arr = file.split("/");
        addZone({
          title: arr[arr.length - 1],
          type: "pdf",
          data: {
            filePath: file,
            note,
          },
        },);
      },
    })
    return () => {
      sp.unsubscribe();
    };
  }, [zones, addZone]);

  useEffect(() => {
    const recoverWorkZone = () => {
      let serializedWindowTree = localStorage.getItem('serializedWindowTree') || '';
      let serializedZones = localStorage.getItem('serializedZones') || '';
      console.log('serializedWindowTree:', serializedWindowTree);
      console.log('serializedZones:', serializedZones);
      let zones: ZoneDefinition[] = [{
        "title":"词典",
        "type":"dict",
        "multiLayout":false,
        "data":{
          "name":"有道",
          "template":"https://mobile.youdao.com/dict?le=eng&q={}"
        },
        "id":"7ad47632-83f7-428a-98b4-51e402fab185"
      }];
      let currentNode = null;
      try {
        currentNode = JSON.parse(serializedWindowTree);
      } catch (e) {
        currentNode = '7ad47632-83f7-428a-98b4-51e402fab185';
      }
      try {
        zones = JSON.parse(serializedZones);
      } catch (e) {
      }
      console.log('zones:', zones);
      console.log('currentNode:', currentNode);
      setZones(zones);
      setCurrentNode(currentNode);
    };
    recoverWorkZone();
  }, []);

  useEffect(() => {
    playSubtitleRecord$.subscribe({
      next(subtitle) {
        if (!subtitle) {
          return;
        }
        const zone = zones.find(zone => zone.id === subtitle.zoneId);
        if (zone) {
          console.log('add subtitle record to the data of the video zone:', zone);
          zone.data.subtitle = subtitle;
        }
        saveWorkZones(currentNode, zones);
      }
    })
  }, [zones, currentNode]);

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
          addZone({
            title: arr[arr.length - 1],
            type: "pdf",
            data: {
              filePath,
            },
          },);
          setShowResourceLoader(false);
        }}
        onOpenVideo={(filePath) => {
          console.log("onOpenVideo:", filePath);
          const arr = filePath.split("/");
          addZone({
            title: arr[arr.length - 1],
            type: "video",
            data: {
              filePath,
            },
          },);
          setShowResourceLoader(false);
        }}
      ></ResourceLoader>
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

      <div style={{ height: '100%' }}>
        <MosaicNumber
          blueprintNamespace="bp4"
          className={THEMES['Blueprint Dark']}
          zeroStateView={<div>没有打开的窗口</div>}
          resize={{
            minimumPaneSizePercentage: 0
          }}
          renderTile={(id: string, path: any) => {
            console.log('renderTile, path:', path);
            console.log('renderTile, id:', id);
            const zone = zones.find(zone => zone.id === id);
            if (!zone) {
              return null;
            }
            return (<MosaicWindowNumber
              className={fullScreenZoneId === zone.id ? 'fullScreenZone' : ''}
              onDragStart={() => {
                dragWindowStart$.next(true);
              }}
              onDragEnd={() => {
                dragWindowEnd$.next(true);
              }}
              toolbarControls={React.Children.toArray([
                zone.multiLayout === false ? null : <Button type="text" onClick={() => {
                  toggleLayout$.next(id);
                }}>
                  <Icon style={{ position: 'relative', top: '-1px' }} icon="control" size={18} color="#5f6b7c" /></Button>,
                <Button type="text" style={{ marginRight: '12px' }} onClick={() => {
                  if (fullScreenZoneId) {
                    setFullScreenZoneId('');
                  } else {
                    setFullScreenZoneId(zone.id);
                  }
                }}>
                  <Icon style={{ position: 'relative', top: '-1px' }} icon={zone.id === fullScreenZoneId ? "minimize" : "maximize"} size={18} color="#5f6b7c" />
                </Button>,
                <div style={{ transform: 'scale(1.4)', position: 'relative', left: '-2px' }}>
                  <RemoveButton onClick={() => {
                    removeZone(zone);
                  }} />
                </div>,
              ])}
              title={zone.title || '没有标题'}
              // createNode={() => {
              //   return ++windowCount;
              // }}
              path={path}
            >
              <Zone difinition={zone}></Zone>
            </MosaicWindowNumber>
            )
          }}
          value={currentNode}
          onChange={(node: MosaicNode<string> | null) => {
            setCurrentNode(node);
            saveWorkZones(node, zones);
          }}
        />
      </div>
      <div style={{
        width: 'calc(100% - 28px)',
        background: '#000',
        display: showBottomBar ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'absolute',
        minWidth: '320px',
        padding: '14px 0 5px',
        bottom: 0,
        zIndex: 4,
        borderRadius: '12px 12px 0 0',
        margin: '0 14px',
      }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
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
              height: '30px',
              marginLeft: '32px',
            }}
            onKeyDown={(e) => {
              const key = e.key.toLowerCase();
              if (key === "enter".toLowerCase()) {
                searchSentence(inputSearchValue);
              }
            }}
            placeholder="搜索单词、句子"
          />
          <Button
            type="text"
            style={{
              color: '#ccc'
            }}
            onClick={() => {
              setShowBottomBar(false);
            }}
          >
            <DownOutlined />
          </Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '720px', marginTop: '40px', marginBottom: '10px' }}>
          <div style={{width: '0.5%'}}></div>
          <Button
            type='ghost'
            style={{ color: '#ccc', width: '33%', height: '40px' }}
            onClick={() => {
              setShowResourceLoader(true);
              setShowAddZone(false);
            }}
          >
            文件
          </Button>
          <Button
            type='ghost'
            style={{ color: '#ccc', width: '33%', height: '40px'}}
            onClick={() => {
              addZone({
                title: "词典",
                type: "dict",
                multiLayout: false,
                data: {
                  name: "有道",
                  template: "https://mobile.youdao.com/dict?le=eng&q={}",
                },
              },);
              setShowAddZone(false);
            }}
          >
            词典
          </Button>
          <Button
            type='ghost'
            style={{ color: '#ccc', width: '33%', height: '40px' }}
            onClick={() => {
              addZone({
                title: "卡片",
                type: "cardMaker",
                data: {
                },
              },);
              setShowAddZone(false);
            }}
          >
            卡片
          </Button>
          <div style={{width: '0.5%'}}></div>
          <div style={{width: '0.5%'}}></div>
          <Button
            type='ghost'
            style={{ color: '#ccc', width: '33%', height: '40px' }}
            onClick={() => {
              addZone({
                title: "复习",
                type: "cardReviewer",
                data: {
                },
              },);
              setShowAddZone(false);
            }}
          >
            复习
          </Button>
          <Button
            type='ghost'
            style={{ color: '#ccc', width: '33%', height: '40px' }}
            onClick={() => {
              addZone({
                title: "遥控器",
                type: "remoteController",
                data: {
                  // name: "有道",
                  // template: "http://mobile.youdao.com/dict?le=eng&q={}",
                },
              },);
              setShowAddZone(false);
            }}
          >
            遥控器
          </Button>
          <Button
            type="ghost"
            style={{ color: '#ccc', width: '33%', height: '40px' }}
            onClick={() => {
              const hide = message.loading('加载记录中...', 0);
              getRecords().then((records) => {
                setRecords(records);
                setShowRecordModal(true);
              }).finally(() => {
                hide();
              });
            }}>浏览记录</Button>
        </div>
        {
          showRecordModal && <Modal
            width="95%"
            bodyStyle={{
              background: '#000'
            }}
            footer={null}
            closable={false}
            visible={showRecordModal}
            onCancel={() => { setShowRecordModal(false) }}
            onOk={() => { setShowRecordModal(false) }}
          >
            <div style={{ width: '100%' }}>
              {
                records.map(({ file, timestamp, progress, type }) => {
                  const splits = file.split('/');
                  const title = splits[splits.length - 1];
                  return <div key={file} style={{ cursor: 'pointer', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ccc', marginBottom: '14px' }} onClick={() => {
                    if (type === 'video') {
                      playSubtitle$.next({ ...progress, file })
                    }
                    setShowRecordModal(false);
                  }}>
                    <div style={{ maxWidth: 'calc(100% - 30px)', overflow: 'auto' }}>
                      <div>{title}</div>
                    </div>
                    {timestamp && <div style={{ marginLeft: '14px' }}>{new Date(timestamp).toLocaleDateString()}</div>}
                  </div>;
                })
              }
            </div>
          </Modal>
        }
      </div>
      {!showBottomBar && <Button
        type="text"
        onClick={() => {
          setShowBottomBar(true);
        }}
        style={{ position: 'absolute', bottom: '14px', right: '14px', zIndex: 4, color: '#ccc', background: '#000', width: '40px', height: '40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '50%',
        }}>
        <UpOutlined style={{position: 'relative', top: '2px'}}/>
      </Button>}
    </div>
  );
};
