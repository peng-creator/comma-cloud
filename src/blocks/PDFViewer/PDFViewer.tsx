import { Button, Dropdown, Input, message, Modal, Pagination, Space, Switch } from "antd";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "./react-pdf";
import styles from "./PDFViewer.module.css";
import { useContextMenu } from "react-contexify";
import { setContextMenu } from "../../state/contextMenu";
import { pdfNote$ } from "../CardMaker/CardMaker";
import { PDFNote } from "../../type/PDFNote";
import { searchSentence, tapSearch$, tapWord$ } from "../../state/search";
import { auditTime, bufferWhen, debounceTime, filter, Subject, take, tap } from "rxjs";
import { host } from "../../utils/host";
import { DownOutlined, LeftOutlined, RightOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { HexColorPicker } from "react-colorful";
import { complementary, hex2rgbObject } from 'lumino';
import { useStore } from "../../store";
import { saveRecord } from "../../service/http/Records";
import { pdfNoteToBeAdded$ } from "../../state/cardMaker";
import { fullscreen } from "../../utils/fullscreen";

const MENU_ID = "MENU_ID";

pdfjs.GlobalWorkerOptions.workerSrc = "/assets/pdf.worker.min.js";

export const pdfNoteInput$ = new Subject<PDFNote>();

export type MarkMap = {
  [key: string]: string | undefined;
};

const toutchWord$ = new Subject<{wordIndex: number; word: string; page: number; file: string;}>();
toutchWord$.pipe(debounceTime(100)).subscribe({
  next({word}) {
    tapWord$.next(word);
  },
});


toutchWord$.pipe(
  debounceTime(100),
  bufferWhen(() => tapSearch$),
  filter(value => value.length > 0),
).subscribe({
  next(wordTaps) {
      pdfNoteToBeAdded$.next({
        content: wordTaps.map(({word}) => word).join(' '),
        start: -1,
        end: -1,
        page: wordTaps[0].page,
        file: wordTaps[0].file,
        discreteIndexes: wordTaps.map(({wordIndex}) => wordIndex),
      })
  },
})

function detectIsPC() {
  var ua = window.navigator.userAgent;

  var platform = /Windows|Macintosh|Linux|Ubuntu/i
  return platform.test(ua)
}
const isPc = detectIsPC();

type InnerPdfProps = {
  filePath: string;
  onGetNumPages: (pages: number) => void;
  onGetPageLoaded: () => void;
  pageRef: any;
  pageNumber: number;
  fitWidth: boolean;
  pageWidth: number;
  fitHeight: boolean;
  pageHeight: number;
  onGetWordIndexMap: (map: Map<HTMLDivElement, number>) => void;
  scale: number;
}

function _InnerPdf({ filePath, onGetNumPages, onGetPageLoaded, pageRef, pageNumber, fitWidth, pageWidth, fitHeight, pageHeight, onGetWordIndexMap, scale }: InnerPdfProps) {
  return (
    <Document
      options={{
        standardFontDataUrl: '/assets/standard_fonts/',
      }}
      file={filePath}
      onLoadSuccess={({ numPages }: any) => {
        onGetNumPages(numPages);
      }}
      onLoadError={(e: any) => {
        console.log("onLoadError:", e);
      }}
    >
      <Page
        onLoadSuccess={() => {
          onGetPageLoaded();
        }}
        inputRef={pageRef}
        pageNumber={pageNumber}
        width={fitWidth ? pageWidth : undefined}
        height={fitHeight ? pageHeight : undefined}
        onRenderTextLayerSuccess={() => {
          if (pageRef.current) {
            const words = (pageRef.current as HTMLDivElement).querySelectorAll('.pdf_page_word');
            onGetWordIndexMap(Array.from(words).reduce((acc, curr, index) => {
              (acc as any).set(curr, index);
              return acc;
            }, new Map()) as any);
          }
        }}
        scale={scale}
      />
    </Document>
  )
}

const InnerPdf = memo(_InnerPdf);

function Component({ filePath: file, note }: { filePath: string; note?: PDFNote }) {
  const [outSideNoteOpened, setOutSideNoteOpened] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const [fitWidth, setFitWidth] = useState(false);
  const [fitHeight, setFitHeight] = useState(true);

  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const [placeholderWidth, setPlaceholderWidth] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);

  const [selectEndIndex, setSelectEndIndex] = useState(-1);

  const initColor = localStorage.getItem('pdf-font-color') || "#ccc";
  const initBackgroundColor = localStorage.getItem('pdf-background-color') || "#000";

  const store = useStore<{
    selectLongPressTimer: any;
    isSelecting: boolean;
    wordIndexMap: Map<HTMLDivElement, number>;
    selectStartIndex: number;
    pureMode: boolean;
    pointerDownTarget: HTMLElement | null;
    isModalVisible: boolean;
    color: string;
    backgroundColor: string;
    colorEditing: string;
    backgroundColorEditing: string;
  }>({
    selectLongPressTimer: null,
    isSelecting: false,
    wordIndexMap: new Map<HTMLDivElement, number>(),
    selectStartIndex: -1,
    pureMode: false,
    pointerDownTarget: null,
    isModalVisible: false,
    color: initColor,
    colorEditing: initColor,
    backgroundColor: initBackgroundColor,
    backgroundColorEditing: initBackgroundColor,
  });
  const setBackgroundColorEditing = (backgroundColorEditing: string) => store.backgroundColorEditing = backgroundColorEditing;
  const setColorEditing = (colorEditing: string) => store.colorEditing = colorEditing;
  const setBackgroundColor = (backgroundColor: string) => store.backgroundColor = backgroundColor;
  const setIsModalVisible = (isModalVisible: boolean) => store.isModalVisible = isModalVisible;
  const setIsSelecting = (isSelecting: boolean) => store.isSelecting = isSelecting;
  const setSelectStartIndex = (selectStartIndex: number) => store.selectStartIndex = selectStartIndex;
  const setColor = (color: string) => store.color = color;
  const setPointerDownTarget = (target: HTMLElement) => store.pointerDownTarget = target;

  const [createdNote, setCreatedNote] = useState<PDFNote | null>(null);

  const [scale, setScale] = useState(1);

  const { show, hideAll } = useContextMenu({
    id: MENU_ID,
  });


  const [touchMove$] = useState(new Subject<any>());

  useEffect(() => {
    let styleEl = document.querySelector('style#pdf-config');
    const styleContetn = `
    .pdf-container.pure-text-mode .canvas-placeholder {
      background: ${store.backgroundColor} !important;
    }
    .pdf-container.pure-text-mode .pdf_page_word {
      color: ${store.color};
    }
    `;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'pdf-config';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = styleContetn;
  }, [store.color, store.backgroundColor]);

  useEffect(() => {
    const container = containerRef.current;
    const resize$ = new Subject<any>();
    const fitWidth = () => {
      if (container) {
        setFitHeight(false);
        setFitWidth(true);
        setPageWidth(container.clientWidth);
        setPageHeight(container.clientHeight);
      }
    };
    fitWidth();
    const sp = resize$.pipe(
      auditTime(1000),
    ).subscribe({
      next() {
        fitWidth();
      },
    });
    container?.addEventListener("resize", () => {
      resize$.next('');
    });
    return () => {
      container?.removeEventListener("resize", () => {
        resize$.next('');
      });
      sp.unsubscribe();
    };
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const pdfContainer = container.querySelector('.pdf-container');
    if (pdfContainer) {
      pdfContainer.scrollTop = 0;
    }
  }, [pageNumber]);

  useEffect(() => {
    saveRecord({
      file,
      progress: {
        page: pageNumber,
        end: -1,
        start: -1,
        file,
        content: '',
      } as PDFNote,
      type: 'pdf',
    });
  }, [pageNumber]);

  useEffect(() => {
    const page = pageRef.current;
    console.log("size change...");
    if (page) {
      const pageCanvas = page.querySelector('canvas');
      if (pageCanvas) {
        console.log('setPlaceholderHeight:', pageCanvas.clientHeight);
        console.log('setPlaceholderWidth:', pageCanvas.clientWidth);
        setPlaceholderHeight(pageCanvas.clientHeight);
        setPlaceholderWidth(pageCanvas.clientWidth);
      }
    }
  }, [pageRef, scale, fitWidth, fitHeight, pageLoaded]);

  const filePath = `http://${host}:8080/resource` + file;

  useEffect(() => {
    if (note && !outSideNoteOpened) {
      setPageLoaded(false);
      setPageNumber(note.page);
    }
  }, [outSideNoteOpened, note]);

  const highlight = useCallback((start: number, end: number, discreteIndexes: number[] = []) => {
    store.wordIndexMap.forEach((index, ele) => {
      if ((index >= start && index <= end) || discreteIndexes.includes(index)) {
        if (store.pureMode) {
          ele.style.background = store.color || '#000';
          ele.style.color = store.backgroundColor || '#fff';
        } else {
          ele.style.background = `rgba(255, 255, 0, .5)`;
        }
      } else {
        ele.style.background = 'none';
        ele.style.color = ``;
      }
    })
  }, [store.wordIndexMap, store.color, store.backgroundColor]);

  const cancelHighlight = useCallback((start: number, end: number) => {
    let min = Math.min(start, end);
    let max = Math.max(start, end);
    store.wordIndexMap.forEach((index, ele) => {
      if (index >= min && index <= max) {
        ele.style.background = 'none';
        ele.style.color = '';
      }
    })
  }, [store.wordIndexMap, store.color]);

  useEffect(() => {
    if (note && !outSideNoteOpened && pageLoaded) {
      setTimeout(() => {
        const pdfPage = pageRef.current;
        if (pdfPage) {
          const { start, end, discreteIndexes } = note;
          highlight(start, end, discreteIndexes);
          setOutSideNoteOpened(true);
        }
      }, 200);
    }
  }, [outSideNoteOpened, note, pageLoaded, pageRef, highlight]);

  const _setNumPages = useCallback((pages: number) => {
    setNumPages(pages);
  }, []);
  const _setPageLoaded = useCallback(() => {
    setPageLoaded(true);
  }, []);

  const checkSelectStart = (e: any) => {
    const target = e.target as HTMLDivElement;
    if (target && target.classList.contains('pdf_page_word')) {
      const index = store.wordIndexMap.get(target);
      if (index !== undefined) {
        if (index === store.selectStartIndex) {
          target.style.background = 'none';
          return;
        }
        setIsSelecting(true);
        setSelectStartIndex(index);
        setSelectEndIndex(index);
        highlight(index, index);
      }
    }
  };

  const checkSelect = (target: HTMLDivElement) => {
    if (!target) {
      return;
    }
    const shouldHighlight = target.classList.contains('pdf_page_word') && store.isSelecting;
    if (shouldHighlight) {
      console.log('checkSelect word:', target);
      console.log('store.wordIndexMap:', store.wordIndexMap);
      const index = store.wordIndexMap.get(target);
      if (index) {
        setSelectEndIndex(index);
        let start = Math.min(index, store.selectStartIndex);
        let end = Math.max(index, store.selectStartIndex);
        console.log('hightlight index:', start, end);
        highlight(start, end);
      }
    }
  };
  const checkSelectEnd = (e: any) => {
    console.log('checkSelectEnd')
    let target: HTMLDivElement;
    try {
      const changedTouch = e.changedTouches[0];
      target = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY) as any;
    } catch (err) {
      target = e.target as HTMLDivElement;
    }
    if (!target) {
      return;
    }
    const targetIsWordEl = target.classList.contains('pdf_page_word');
    if (store.isSelecting) {
      console.log('store.isSelecting');
      console.log('checkSelectEnd')
      let start = store.selectStartIndex;
      let end = selectEndIndex;
      let words: string[] = [];
      store.wordIndexMap.forEach((index, ele) => {
        if (index >= start && index <= end) {
          words.push(ele.textContent || '');
        }
      });
      let sentence = words.join(' ');
      let pdfNote: PDFNote = {
        file,
        page: pageNumber,
        start,
        end,
        content: sentence,
      };
      setCreatedNote(pdfNote);
      setContextMenu([
        [
          {
            onClick: () => {
              pdfNote$.next(pdfNote);
              pdfNoteInput$.next(pdfNote);
            },
            title: '加入卡片',
          },
          {
            onClick: () => {
              searchSentence(sentence);
              pdfNoteToBeAdded$.next(pdfNote);
            },
            title: '翻译',
          },
          {
            onClick: () => {
              cancelHighlight(start, end);
              setCreatedNote(null);
            },
            title: '撤销',
          },
        ]
      ]);
      show(e);

    } else if (targetIsWordEl && createdNote !== null) { // 点击文字，且当前已有标注
      console.log('点击文字，且当前已有标注');
      console.log('checkSelectEnd')
      let wordIndex = store.wordIndexMap.get(target);
      const { start, end } = createdNote;
      const max = Math.max(start, end);
      const min = Math.min(start, end);
      if (wordIndex !== undefined && wordIndex >= min && wordIndex <= max) {
        setContextMenu([
          [
            {
              onClick: () => {
                pdfNote$.next(createdNote);
                pdfNoteInput$.next(createdNote);
              },
              title: '加入卡片',
            },
            {
              onClick: () => {
                searchSentence(createdNote.content);
                pdfNoteToBeAdded$.next(createdNote);
              },
              title: '翻译',
            },
            {
              onClick: () => {
                cancelHighlight(start, end);
                setCreatedNote(null);
              },
              title: '撤销',
            },
          ]
        ]);
        show(e);
      } else if (target === store.pointerDownTarget && targetIsWordEl) {
        toutchWord$.next({
          word: target.textContent || '',
          wordIndex: store.wordIndexMap.get(target) || -1,
          file,
          page: pageNumber,
        });
      }
    } else if (createdNote !== null && target === store.pointerDownTarget) {
      console.log('checkSelectEnd');
      console.log('空白处点击, 隐藏菜单');
      // const { start, end } = createdNote;
      // cancelHighlight(start, end);
      // setCreatedNote(null);
      hideAll();
    } else if (target === store.pointerDownTarget && targetIsWordEl) {
      console.log('checkSelectEnd')
      toutchWord$.next({
        word: target.textContent || '',
        wordIndex: store.wordIndexMap.get(target) || -1,
        file,
        page: pageNumber,
      });
    } else {
      console.log('checkSelectEnd');
    }
    setIsSelecting(false);
    setSelectEndIndex(-1);
    setSelectStartIndex(-1);
  }
  console.log(`render pdf view pageHeight: ${pageHeight}, pageWidth: ${pageWidth} , `);

  const PageNav = ({ direction }: { direction: 'left' | 'right' }) => {
    return <div style={{ display: 'flex', zIndex: 2, flexDirection: direction === 'left' ? 'column' : 'column-reverse', position: 'absolute', top: 'calc(50% - 25px)', [direction]: '14px' }}>
      <Button style={{ width: '50px', height: '50px', borderRadius: '25px', margin: '12px 0' }} onClick={() => {
        const nextPage = pageNumber - 1;
        if (nextPage > numPages) {
          setPageNumber(numPages);
          return;
        }
        if (nextPage < 1) {
          setPageNumber(1);
          return;
        }
        setPageNumber(nextPage);
      }}>
        <LeftOutlined />
      </Button>
      <Button style={{ width: '50px', height: '50px', borderRadius: '25px' }} onClick={() => {
        const nextPage = pageNumber + 1;
        if (nextPage > numPages) {
          setPageNumber(numPages);
          return;
        }
        if (nextPage < 1) {
          setPageNumber(1);
          return;
        }
        setPageNumber(nextPage);
      }}>
        <RightOutlined />
      </Button>
    </div>
  }

  const onTouchStart = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (store.selectLongPressTimer) {
      clearTimeout(store.selectLongPressTimer);
    }
    setPointerDownTarget(e.target as HTMLElement);
    store.selectLongPressTimer = setTimeout(() => {
      checkSelectStart(e);
      store.selectLongPressTimer = null;
    }, 200);
  };
  const onTouchMove = (e: any) => {
    // e.stopPropagation();
    let elem: any;
    try {
      const changedTouch = e.changedTouches[0];
      elem = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY) as any;
    } catch (err) {
      elem = e.target;
    }
    if (elem !== store.pointerDownTarget) {
      if (store.selectLongPressTimer !== null) {
        clearTimeout(store.selectLongPressTimer);
        store.selectLongPressTimer = null;
      }
      checkSelect(elem);
    }
  };

  useEffect(() => {
    const sp = touchMove$.pipe(
      auditTime(20)
    ).subscribe({
      next(e) {
        onTouchMove(e);
      }
    });
    return () => sp.unsubscribe();
  }, []);

  const onTouchEnd = (e: any) => {
    // e.stopPropagation();
    console.log('checkSelectEnd');
    checkSelectEnd(e);
    if (store.selectLongPressTimer) {
      clearTimeout(store.selectLongPressTimer);
      store.selectLongPressTimer = null;
    }
  };
  const onGetWordIndexMap = useCallback((map: any) => {
    store.wordIndexMap = map;
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        userSelect: 'none',
        background: store.pureMode ? store.backgroundColor : '#fff',
      }}
      ref={containerRef}
    >
      <link rel="stylesheet" href="/assets/AnnotationLayer.css" />
      <link rel="stylesheet" href="/assets/TextLayer.css" />


      <PageNav direction="left"></PageNav>
      <PageNav direction="right"></PageNav>
      <div style={{ position: 'absolute', top: 0, right: '14px', zIndex: 1 }}>
        <Dropdown
          getPopupContainer={() => {
            return containerRef.current || document.body;
          }}
          trigger={['click']}
          overlay={<div className="pdfHeader" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', background: '#000', color: '#ccc' }}>
            <Button onClick={() => { 
              let isFullscreen = document.fullscreenElement === containerRef.current;
              if(isFullscreen) {
                document.exitFullscreen();
              } else {
                fullscreen(containerRef.current);
              }
             }}>切换全屏</Button>
            <Button
              onClick={() => {
                const container = containerRef.current;
                if (container) {
                  setFitHeight(true);
                  setFitWidth(false);
                  setPageWidth(container.clientWidth);
                  setPageHeight(container.clientHeight);
                  setScale(1);
                }
              }}
            >
              适应高度
            </Button>
            <Button
              onClick={() => {
                const container = containerRef.current;
                if (container) {
                  setFitHeight(false);
                  setFitWidth(true);
                  setPageWidth(container.clientWidth);
                  setPageHeight(container.clientHeight);
                  setScale(1);
                }
              }}
            >
              适应宽度
            </Button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button onClick={() => {
                if (scale <= 0.25) {
                  return;
                }
                setScale(scale - 0.25);
              }}>-</Button>
              <span style={{ width: '50px', overflow: 'hidden', textAlign: 'center' }}>{parseInt(`${scale * 100}`, 10)}%</span>
              <Button onClick={() => {
                if (scale >= 3) {
                  return;
                }
                setScale(scale + 0.25);
              }}>+</Button>

            </div>
            <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 14px' }}>
              <span>纯文本模式:</span> <Switch style={{ margin: '0 14px' }} checked={store.pureMode} checkedChildren="on" unCheckedChildren="off" title="纯文本模式" onChange={(checked) => store.pureMode = checked} />
            </div>
            {store.pureMode && <Button onClick={() => { setIsModalVisible(true) }}>颜色设置</Button>}

          </div>}>
          <a onClick={e => e.preventDefault()} style={{ color: store.pureMode ? store.color : '#000', fontSize: '25px' }}>
            <UnorderedListOutlined />
          </a>
        </Dropdown>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', position: 'absolute', bottom: '20px', right: '14px', color: store.pureMode ? store.color : '#000', zIndex: 2, fontSize: '18px' }}>
        <Input
          style={{
            width: '50px',
            textAlign: 'right', outline: 'none', border: 'none', display: 'inline-block', background: 'none', color: store.pureMode ? store.color : '#000',
            fontSize: '18px',
            position: 'relative',
            top: '-4px',
            right: '-4px',
          }}
          onChange={(e) => {
            const nextPage = parseInt(e.target.value) || 0;
            if (nextPage > numPages) {
              setPageNumber(numPages);
              return;
            }
            if (nextPage < 1) {
              setPageNumber(1);
              return;
            }
            setPageNumber(nextPage);
          }}
          value={pageNumber} />
        / {numPages}
      </div>
      <div
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          overflow: store.isSelecting ? 'hidden' : 'auto',
          position: "absolute",
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        className={["pdf-container", store.pureMode ? 'pure-text-mode' : ''].join(' ')}
      >
        <div
          style={{
            width: `${placeholderWidth}px`,
            height: `${placeholderHeight}px`,
            background: "#ccc",
          }}
          className="canvas-placeholder"
        ></div>
        <div
          style={{
            position: "absolute",
            top: 0,
            width: `${placeholderWidth}px`,
          }}
          className={styles.pdfWrapper}
          onTouchStart={onTouchStart}
          onTouchMove={(e) => touchMove$.next(e)}
          onTouchEnd={onTouchEnd}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (isPc) {
              console.log('mouseDown:', e);
              onTouchStart(e);
            }
          }}
          onMouseMove={(e) => {
            if (isPc && store.isSelecting) {
              console.log('onMouseMove:', e);
              touchMove$.next(e);
            }
          }}
          onMouseUp={(e) => {
            if (isPc) {
              onTouchEnd(e);
            }
          }}
        >
          <InnerPdf scale={scale} filePath={filePath} onGetNumPages={_setNumPages} onGetPageLoaded={_setPageLoaded} pageRef={pageRef} pageNumber={pageNumber} fitWidth={fitWidth} pageWidth={pageWidth} fitHeight={fitHeight} pageHeight={pageHeight}
            onGetWordIndexMap={onGetWordIndexMap} />
        </div>
      </div>
      <Modal title="颜色设置" visible={store.isModalVisible} onOk={() => {
        setIsModalVisible(false);
        localStorage.setItem('pdf-font-color', store.colorEditing);
        localStorage.setItem('pdf-background-color', store.backgroundColorEditing);
        setColor(store.colorEditing);
        setBackgroundColor(store.backgroundColorEditing);
      }}
        okText="save"
        onCancel={() => {
          setIsModalVisible(false);
        }}
      >
        <div>文本颜色：</div>
        <HexColorPicker color={store.colorEditing} onChange={setColorEditing} />
        <div>背景颜色：</div>
        <HexColorPicker color={store.backgroundColorEditing} onChange={setBackgroundColorEditing} />
        <div>效果：</div>
        <div style={{ color: store.colorEditing, backgroundColor: store.backgroundColorEditing }}>Hello World!</div>
      </Modal>
    </div>
  );
}
export const PDFViewer = memo(Component);