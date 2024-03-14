import { Button, Drawer, Input, message, Modal, Radio, Switch } from "antd";
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
import { addZone$, closeZone$, dragWindowEnd$, dragWindowStart$, isDraggingSplitBar$, toggleLayout$ } from "../../state/zone";
import { AppstoreOutlined, SearchOutlined, ArrowsAltOutlined, ShrinkOutlined, DownOutlined, UpCircleOutlined, UpOutlined, SettingOutlined, FontSizeOutlined } from "@ant-design/icons";
import { search$, searchSentence } from "../../state/search";
import { TapCache } from "../../compontent/TapCache/TapCache";
import { StatusBar, Style } from '@capacitor/status-bar';
import { playSubtitle$, playSubtitleRecord$ } from "../../state/video";
import { openNote$ } from "../CardMaker/CardMaker";
import { openStandaloneSubtitle$ } from "../../state/subtitle";
import { v4 as uuidv4 } from "uuid";
import { closeZone, registerZones } from "../../service/http/Zone";
import { getRecords, Record } from "../../service/http/Records";
import { expired$ } from "../../state/session";
import ReactCodeInput from '@acusti/react-code-input';
import { FloatDict } from "../FloatDict/FloatDict";
import { setUserPreference, UserPreference, userPreference$ } from "../../state/preference";
import { openDir$ } from "../../state/resourceLoader";
import { PlayHow, SubtitlePlayStrategy } from "../../type/SubtitlePlayStrategy";
import { FloatCardMaker } from "../FloatCardMaker/FloatCardMaker";
import { FloatVideo } from "../FloatVideo/FloatVideo";
import { FloatPDF } from "../FloatPDF/FloatPDF";
import { Home } from "../Home/Home";
import { share, shareReplay, throttleTime } from "rxjs";
import { ZoneWrapper } from "../ZoneWrapper.tsx/ZoneWrapper";

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
  const [defaultDir, setDefaultDir] = useState('/');
  const [contextMenuList] = useBehavior(contextMenu$, []);

  const [currentNode, setCurrentNode] = useState<MosaicNode<string> | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [records, setRecords] = useState([] as Record[]);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [showAccessCodeInput, setShowAccessCodeInput] = useState(false);
  const [userPreference] = useBehavior(userPreference$, {} as UserPreference);
  const [editStrategyIndex, setEditStrategyIndex] = useState<number | undefined>(undefined);
  const [editStrategy, setEditStrategy] = useState<PlayHow | null>(null);

  useEffect(() => {
    openDir$.subscribe({
      next(dir) {
        if (!dir) {
          return;
        }
        setDefaultDir(dir);
        addZone({
          title: '文件管理器',
          type: 'resourceLoader',
          data: {
            defaultDir: dir,
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    const sp = expired$.subscribe({
      next() {
        setShowAccessCodeInput(true);
      }
    });
    return () => sp.unsubscribe();
  }, []);

  const saveCurrentNode = (currentNode: MosaicNode<string> | null) => {
    console.log('debug zone error: currentNode: ', currentNode);
    let serializedWindowTree = null;
    try {
      serializedWindowTree = JSON.stringify(currentNode);
    } catch (e) {
      if (typeof currentNode === 'string') {
        serializedWindowTree = currentNode;
      }
    }
    localStorage.setItem('serializedWindowTree', serializedWindowTree || 'null');
  };

  const saveZones = (zones: ZoneDefinition[]) => {
    let serializedZones = '[]';
    try {
      console.log('debug zone error: JSON.stringify(zones), zoens:', zones);
      serializedZones = JSON.stringify(zones);
    } catch (e) {
      console.log('debug zone error: JSON.stringify(zones) failed:', e);
    }
    localStorage.setItem('serializedZones', serializedZones);
  };

  const saveWorkZones = (currentNode: MosaicNode<string> | null, zones: ZoneDefinition[]) => {
    saveCurrentNode(currentNode);
    saveZones(zones);
  };

  useEffect(() => {
    saveWorkZones(currentNode, zones);
  }, [currentNode, zones]);

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
    addWindow(id);
  }, [zones, addWindow]);

  useEffect(() => {
    const sp = addZone$.subscribe({
      next(zone) {
        addZone(zone);
      }
    });
    return () => sp.unsubscribe();
  }, [addZone]);

  const removeZone = useCallback((zone: ZoneDefinition) => {
    setZones(zones.filter(z => z.id !== zone.id));
    closeZone(zone.id);
  }, [zones]);

  useEffect(() => {
    const sp = closeZone$.subscribe({
      next(zoneId) {
        setZones(zones.filter(z => z.id !== zoneId));
        // closeZone(zoneId);
        // (document.querySelector(`.zone-${zoneId}-CloseBtn button`) as HTMLButtonElement | null)?.click();
      },
    });
    return () => sp.unsubscribe();
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
      let zones: ZoneDefinition[] = [];
      let currentNode = null;
      try {
        currentNode = JSON.parse(serializedWindowTree);
      } catch (e) {
        currentNode = null;
      }
      try {
        zones = JSON.parse(serializedZones);
      } catch (e) {
      }
      console.log('debug zone error: zones:', zones);
      console.log('debug zone error: currentNode:', currentNode);
      setZones(zones);
      setCurrentNode(currentNode);
    };
    recoverWorkZone();
  }, []);

  useEffect(() => {
    const sp = playSubtitleRecord$.subscribe({
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
    });
    return () => sp.unsubscribe();
  }, [zones, currentNode]);

  if (showAccessCodeInput) {
    return <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <div>请输入访问码</div>
      <ReactCodeInput
        inputStyle={{ fontSize: '14px', width: '28px', textAlign: 'center', color: 'black', border: 'none', margin: '14px', borderRadius: '5px' }}
        type='text' fields={4} name="accessCode" inputMode="numeric" onChange={(value) => {
          console.log('changed:', value);
          if (value.length === 4) {
            window.location.href = '/access/' + value;
          }
        }} />
    </div>

  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <TapCache />
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
      <div style={{ height: 'calc(100% - 60px)' }}>
        <Home></Home>
      </div>
      <div style={{
        width: 'calc(100% - 14px)',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '220px',
        borderRadius: '12px 12px 0 0',
        margin: '0 7px',
        borderTop: '0.5px solid #ddd',
        overflowX: 'auto'
      }}>
        {
          showPreferenceModal && <Modal
            width="95%"
            style={{
              height: '50%',
              top: '50%',
              transform: 'translate(0, -50%)',
              minHeight: '550px',
            }}
            footer={null}
            closable={false}
            visible={showPreferenceModal}
            onCancel={() => { setShowPreferenceModal(false) }}
            onOk={() => { setShowPreferenceModal(false) }}
            modalRender={() => {
              return <div style={{
                background: '#000',
                height: '100%',
                width: '100%',
                borderRadius: '14px',
                pointerEvents: 'auto',
                overflow: 'hidden',
                color: '#ccc',
              }}>
                <div style={{ paddingLeft: '20px', marginTop: '14px', fontSize: '20px' }}>偏好设置</div>
                <div style={{ height: '1px', borderBottom: '1px solid #ddd', marginTop: '14px' }}></div>
                <div style={{ height: 'calc(100% - 60px)', padding: '14px', overflowY: 'auto', }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 14px', borderBottom: '.5px solid #ddd', }}>
                    <div>观影模式 (打开视频自动全屏)</div>
                    <div>
                      <Switch checked={userPreference.tvMode} onChange={(checked) => {
                        setUserPreference({ ...userPreference, tvMode: checked });
                      }}></Switch>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 14px', borderBottom: '.5px solid #ddd', }}>
                    <div>观影模式下隐藏字幕</div>
                    <div>
                      <Switch checked={userPreference.hideSubtitlesInTvMode} onChange={(checked) => {
                        setUserPreference({ ...userPreference, hideSubtitlesInTvMode: checked });
                      }}></Switch>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 14px', borderBottom: '.5px solid #ddd', }}>
                    <div>弹窗词典 (点击单词后，自动弹出词典)</div>
                    <div>
                      <Switch checked={userPreference.floatDict} onChange={(checked) => {
                        setUserPreference({ ...userPreference, floatDict: checked });
                      }}></Switch>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 14px', borderBottom: '.5px solid #ddd', }}>
                    <div>字幕字号：</div>
                    <div>
                      <Button
                        type="text"
                        style={{ color: "#ccc" }}
                        onClick={() => {
                          setUserPreference({ ...userPreference, subtitleFontSize: userPreference.subtitleFontSize - 1 });
                        }}
                      >
                        <FontSizeOutlined /> -
                      </Button>
                      <span style={{ fontSize: userPreference.subtitleFontSize + 'px' }}>{userPreference.subtitleFontSize}px</span>
                      <Button
                        type="text"
                        style={{ color: "#ccc" }}
                        onClick={() => {
                          setUserPreference({ ...userPreference, subtitleFontSize: userPreference.subtitleFontSize + 1 });
                        }}
                      >
                        <FontSizeOutlined /> +
                      </Button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 14px', borderBottom: '.5px solid #ddd', }}>
                    <div>精听设置</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
                      <div>
                        <Button onClick={() => {
                          const nextIntensiveStrategy = [...userPreference.intensiveStrategy, new PlayHow(1, true)];
                          setUserPreference({ ...userPreference, intensiveStrategy: nextIntensiveStrategy });
                        }}
                          type="ghost"
                          style={{ color: '#ccc' }}
                        >增加精听次数</Button>
                      </div>
                      <div style={{ margin: '14px 0' }}>
                        {editStrategy !== null && editStrategyIndex !== undefined && <Modal
                          visible={editStrategy !== null}
                          footer={null}
                          closable={false}
                          onCancel={() => { setEditStrategy(null); setEditStrategyIndex(undefined); }}
                          onOk={() => { setEditStrategy(null); setEditStrategyIndex(undefined); }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div>显示字幕： <Switch checked={editStrategy.showSubtitle} onChange={(checked) => {
                              const newPlayHow = new PlayHow(editStrategy.speed, checked);
                              const nextIntensiveStrategy = [...userPreference.intensiveStrategy.slice(0, editStrategyIndex),
                                newPlayHow,
                              ...userPreference.intensiveStrategy.slice(editStrategyIndex + 1)];
                              setUserPreference({ ...userPreference, intensiveStrategy: nextIntensiveStrategy });
                              setEditStrategy(newPlayHow);
                            }}></Switch>{editStrategy.showSubtitle ? '开启' : '关闭'}
                            </div>
                            <div>倍速播放：<Radio.Group
                              onChange={(event) => {
                                const newPlayHow = new PlayHow(event.target.value, editStrategy.showSubtitle)
                                const nextIntensiveStrategy = [...userPreference.intensiveStrategy.slice(0, editStrategyIndex),
                                  newPlayHow,
                                ...userPreference.intensiveStrategy.slice(editStrategyIndex + 1)];
                                setUserPreference({ ...userPreference, intensiveStrategy: nextIntensiveStrategy });
                                setEditStrategy(newPlayHow);
                              }} value={editStrategy.speed}>
                              <Radio value={0.5}>0.5</Radio>
                              <Radio value={0.75}>0.75</Radio>
                              <Radio value={1}>1</Radio>
                              <Radio value={1.25}>1.25</Radio>
                              <Radio value={1.5}>1.5</Radio>
                              <Radio value={1.75}>1.75</Radio>
                              <Radio value={2}>2</Radio>
                            </Radio.Group> </div>

                          </div>
                        </Modal>}
                        {userPreference.intensiveStrategy.map((playHow, index) => {
                          return <div style={{ display: 'flex', alignItems: 'center', borderBottom: '0.5px solid #ccc', marginBottom: '12px' }}>
                            <div style={{ marginRight: '14px', paddingRight: '14px' }}>第{index + 1}遍</div> <div style={{ marginRight: '14px', paddingRight: '14px' }}>{playHow.showSubtitle ? '显示' : '隐藏'}字幕 ， {playHow.speed} 倍速播放</div>
                            <Button type="ghost" style={{ color: '#ccc' }} onClick={() => {
                              setEditStrategyIndex(index);
                              setEditStrategy(playHow);
                            }}>修改</Button>
                            <Button
                              onClick={() => {
                                const nextIntensiveStrategy = [...userPreference.intensiveStrategy.slice(0, index),
                                ...userPreference.intensiveStrategy.slice(index + 1)];
                                setUserPreference({ ...userPreference, intensiveStrategy: nextIntensiveStrategy });
                              }}
                              type="ghost" style={{ color: '#ccc' }}>删除</Button>
                          </div>
                        })}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            }}
          />
        }
        <div style={{ minWidth: '300px', maxWidth: '100%', overflowY: 'hidden', overflowX: 'auto', }}>
          <div style={{display: 'flex', padding: '0 14px', }}>
            <Button
              type='text'
              style={{ color: '#ccc', height: '60px' }}
              onClick={() => {
                addZone({
                  title: '文件管理',
                  type: 'resourceLoader',
                  data: {
                    defaultDir
                  },
                })
              }}
            >
              文件
            </Button>
            <Button
              type='text'
              style={{ color: '#ccc', height: '60px' }}
              onClick={() => {
                addZone({
                  title: "卡片",
                  type: "cardMaker",
                  data: {
                  },
                },);
              }}
            >
              卡片
            </Button>
            <Button
              type='text'
              style={{ color: '#ccc', height: '60px' }}
              onClick={() => {
                addZone({
                  title: "SuperMemo",
                  type: "cardReviewer",
                  data: {
                  },
                },);
              }}
            >
              SuperMemo
            </Button>
            <Button
              type='text'
              style={{ color: '#ccc', height: '60px' }}
              onClick={() => {
                addZone({
                  title: "词典",
                  type: "dict",
                  data: {
                    name: "有道",
                    template: "http://mobile.youdao.com/dict?le=eng&q={}",
                  },
                },);
              }}
            >
              词典
            </Button>
            <Button
              type='text'
              style={{ color: '#ccc', height: '60px' }}
              onClick={() => {
                addZone({
                  title: "遥控器",
                  type: "remoteController",
                  data: {
                  },
                },);
              }}
            >
              遥控器
            </Button>
            <Button
              type="text"
              style={{ color: '#ccc', height: '60px' }}
              onClick={() => {
                const hide = message.loading('加载记录中...', 0);
                getRecords().then((records) => {
                  setRecords(records);
                  setShowRecordModal(true);
                }).finally(() => {
                  hide();
                });
              }}>浏览记录</Button>
            <Button
              type='text'
              style={{ color: '#ccc', height: '60px' }}
              onClick={() => {
                setShowPreferenceModal(true);
              }}
            >
              设置
            </Button>
          </div>
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
                    if (type === 'pdf') {
                      openNote$.next({ ...progress, file });
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
      {zones.map(zone => {
        return <ZoneWrapper difinition={zone} key={zone.id} onClose={() => { removeZone(zone); }}></ZoneWrapper>
      })}
      <FloatDict></FloatDict>
      <FloatCardMaker></FloatCardMaker>
      <FloatVideo></FloatVideo>
      <FloatPDF></FloatPDF>
    </div>
  );
};
