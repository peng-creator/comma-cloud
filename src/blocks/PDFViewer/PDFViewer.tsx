import { Button, Dropdown, Input, message, Modal, Pagination, Space, Switch } from "antd";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "./react-pdf";
import styles from "./PDFViewer.module.css";
import { useContextMenu } from "react-contexify";
import { setContextMenu } from "../../state/contextMenu";
import { pdfNote$ } from "../CardMaker/CardMaker";
import { PDFNote } from "../../type/PDFNote";
import { searchSentence, tapWord$ } from "../../state/search";
import { debounceTime, Subject } from "rxjs";
import { host } from "../../utils/host";
import { DownOutlined, LeftOutlined, RightOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { HexColorPicker } from "react-colorful";
import { complementary, hex2rgbObject } from 'lumino';

const MENU_ID = "MENU_ID";

pdfjs.GlobalWorkerOptions.workerSrc = "/assets/pdf.worker.min.js";

export type MarkMap = {
  [key: string]: string | undefined;
};

const toutchWord$ = new Subject<string>();
toutchWord$.pipe(debounceTime(100)).subscribe({
  next(value) {
    tapWord$.next(value);
  },
});

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
            console.log(words);
            // Array.from(words).forEach((wordEl) => {
            //   wordEl.addEventListener('touchstart', (e) => {
            //     console.log('touchstart:', e);
            //   });
            //   wordEl.addEventListener('touchmove', (e) => {
            //     console.log('touchmove:', e);
            //   });
            //   wordEl.addEventListener('touchend', (e) => {
            //     console.log('touchend:', e);
            //   });
            // })
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

  const [wordIndexMap, setWordIndexMap] = useState(new Map<HTMLDivElement, number>());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStartIndex, setSelectStartIndex] = useState(-1);
  const [selectEndIndex, setSelectEndIndex] = useState(-1);
  const [selectLongPressTimer, setSelectLongPressTimer] = useState<any>(null);
  const [pointerDownTarget, setPointerDownTarget] = useState<HTMLElement | null>(null);

  const [createdNote, setCreatedNote] = useState<PDFNote | null>(null);

  const [scale, setScale] = useState(1);
  const [pureMode, setPureMode] = useState(false);

  const { show, hideAll } = useContextMenu({
    id: MENU_ID,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [color, setColor] = useState(localStorage.getItem('pdf-font-color') || "#ccc");
  const [backgroundColor, setBackgroundColor] = useState(localStorage.getItem('pdf-background-color') || "#000");
  const [colorEditing, setColorEditing] = useState(color);
  const [backgroundColorEditing, setBackgroundColorEditing] = useState(backgroundColor);

  useEffect(() => {
    let styleEl = document.querySelector('style#pdf-config');
    const styleContetn = `
    .pdf-container.pure-text-mode .canvas-placeholder {
      background: ${backgroundColor} !important;
    }
    .pdf-container.pure-text-mode .pdf_page_word {
      color: ${color};
    }
    `;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'pdf-config';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = styleContetn;
  }, [color, backgroundColor]);

  useEffect(() => {
    const container = containerRef.current;
    const fitWidth = () => {
      if (container) {
        setFitHeight(false);
        setFitWidth(true);
        setPageWidth(container.clientWidth);
        setPageHeight(container.clientHeight);
      }
    };
    fitWidth();
    container?.addEventListener("resize", fitWidth);
    return () => {
      container?.removeEventListener("resize", fitWidth);
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

  const highlight = useCallback((start: number, end: number) => {
    const { r, g, b } = complementary(hex2rgbObject(color));
    wordIndexMap.forEach((index, ele) => {
      if (index >= start && index <= end) {
        if (pureMode) {
          ele.style.background = `rgba(${r}, ${g}, ${b}, 0.4)`;
        } else {
          ele.style.background = `rgba(255, 255, 0, 0.4)`;
        }
      } else {
        ele.style.background = 'none';
      }
    })
  }, [wordIndexMap, color, pureMode]);

  const cancelHighlight = useCallback((start: number, end: number) => {
    wordIndexMap.forEach((index, ele) => {
      if (index >= start && index <= end) {
        ele.style.background = 'none';
      }
    })
  }, [wordIndexMap]);

  useEffect(() => {
    if (note && !outSideNoteOpened && pageLoaded) {
      setTimeout(() => {
        const pdfPage = pageRef.current;
        if (pdfPage) {
          const { start, end } = note;
          highlight(start, end);
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
  const _onGetWordIndexMap = useCallback((map: any) => {
    setWordIndexMap(map);
  }, []);



  const checkSelectStart = (e: any) => {
    console.log('checkSelectStart')
    const target = e.target as HTMLDivElement;
    if (target.classList.contains('pdf_page_word')) {
      const index = wordIndexMap.get(target);
      if (index) {
        if (index === selectStartIndex) {
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
    // console.log('checkSelect target:', target);
    if (target.classList.contains('pdf_page_word') && isSelecting) {
      const index = wordIndexMap.get(target);
      (window as any).endTarget = target;
      (window as any).wordIndexMap = wordIndexMap;
      if (index) {
        setSelectEndIndex(index);
        let start = Math.min(index, selectStartIndex);
        let end = Math.max(index, selectStartIndex);
        highlight(start, end);
      }
    }
  };
  const checkSelectEnd = (e: any) => {
    let target: HTMLDivElement;
    try {
      const changedTouch = e.changedTouches[0];
      target = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY) as any;
    } catch (err) {
      target = e.target as HTMLDivElement;
    }

    console.log('checkSelectEnd')
    setIsSelecting(false);
    const targetIsWordEl = target.classList.contains('pdf_page_word');
    if (isSelecting) {
      console.log('isSelecting');
      let start = selectStartIndex;
      let end = selectEndIndex;
      let words: string[] = [];
      wordIndexMap.forEach((index, ele) => {
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
            },
            title: '加入卡片',
          },
          {
            onClick: () => {
              searchSentence(sentence);
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
      let wordIndex = wordIndexMap.get(target);
      const { start, end } = createdNote;
      if (wordIndex !== undefined && wordIndex >= start && wordIndex <= end) {
        setContextMenu([
          [
            {
              onClick: () => {
                pdfNote$.next(createdNote);
              },
              title: '加入卡片',
            },
            {
              onClick: () => {
                searchSentence(createdNote.content);
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
      } else if (target === pointerDownTarget && targetIsWordEl) {
        toutchWord$.next(target.textContent || '');
      }
    } else if (createdNote !== null && target === pointerDownTarget) {
      console.log('空白处点击, 隐藏菜单');
      // const { start, end } = createdNote;
      // cancelHighlight(start, end);
      // setCreatedNote(null);
      hideAll();
    }  else if (target === pointerDownTarget && targetIsWordEl) {
      toutchWord$.next(target.textContent || '');
    }
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
    // e.stopPropagation();
    if (selectLongPressTimer) {
      clearTimeout(selectLongPressTimer);
    }
    setPointerDownTarget(e.target as HTMLElement);
    setSelectLongPressTimer(setTimeout(() => {
      checkSelectStart(e);
      setSelectLongPressTimer(null);
    }, 500))
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
    if (elem !== pointerDownTarget) {
      if (selectLongPressTimer !== null) {
        clearTimeout(selectLongPressTimer);
        setSelectLongPressTimer(null);
      }
      checkSelect(elem);
    }
  };
  const onTouchEnd = (e: any) => {
    // e.stopPropagation();
    checkSelectEnd(e);
    if (selectLongPressTimer) {
      clearTimeout(selectLongPressTimer);
      setSelectLongPressTimer(null);
    }
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        userSelect: 'none',
        background: pureMode ? backgroundColor : '#fff',
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
              <span>纯文本模式:</span> <Switch style={{ margin: '0 14px' }} checked={pureMode} checkedChildren="on" unCheckedChildren="off" title="纯文本模式" onChange={(checked) => setPureMode(checked)} />
            </div>
            {pureMode && <Button onClick={() => { setIsModalVisible(true) }}>颜色设置</Button>}
          </div>}>
          <a onClick={e => e.preventDefault()} style={{ color: pureMode ? color : '#000', fontSize: '25px' }}>
            <UnorderedListOutlined />
          </a>
        </Dropdown>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', position: 'absolute', bottom: '20px', right: '14px', color: pureMode ? color : '#000', zIndex: 2, fontSize: '18px' }}>
        <Input
          style={{
            width: '50px',
            textAlign: 'right', outline: 'none', border: 'none', display: 'inline-block', background: 'none', color: pureMode ? color : '#000',
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
          overflow: isSelecting ? 'hidden' : 'auto',
          position: "absolute",
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        className={["pdf-container", pureMode ? 'pure-text-mode' : ''].join(' ')}
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
          // onPointerDown={(e) => {
          //   console.log('e.nativeEvent.pointerId:', e.nativeEvent.pointerId);
          //   (e.target as any).releasePointerCapture(e.nativeEvent.pointerId);
          //   if (selectLongPressTimer) {
          //     clearTimeout(selectLongPressTimer);
          //   }
          //   setPointerDownTarget(e.target as HTMLElement);
          //   setSelectLongPressTimer(setTimeout(() => {
          //     checkSelectStart(e);
          //     setSelectLongPressTimer(null);
          //   }, 500))
          // }}
          // onPointerMove={(e) => {
          //   if (e.target !== pointerDownTarget) {
          //     if (selectLongPressTimer !== null) {
          //       clearTimeout(selectLongPressTimer);
          //       setSelectLongPressTimer(null);
          //     }
          //     checkSelect(e);
          //   }
          // }}

          // onPointerUp={(e) => {
          //   checkSelectEnd(e);
          //   if (selectLongPressTimer) {
          //     clearTimeout(selectLongPressTimer);
          //     setSelectLongPressTimer(null);
          //   }
          // }}

          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={(e) => {
            if (isPc) {
              console.log('mouseDown:', e);
              onTouchStart(e);
            }
          }}
          onMouseMove={(e) => {
            if (isPc && isSelecting) {
              console.log('onMouseMove:', e);
              onTouchMove(e);
            }
          }}
          onMouseUp={(e) => {
            if (isPc) {
              onTouchEnd(e);
            }
          }}
          // onClick={(e) => {
          //   const target = e.target as HTMLElement;
          //   if (target.classList.contains('pdf_page_word')) {
          //     tapWord$.next(target.textContent || '');
          //   }
          // }}
        >
          <InnerPdf scale={scale} filePath={filePath} onGetNumPages={_setNumPages} onGetPageLoaded={_setPageLoaded} pageRef={pageRef} pageNumber={pageNumber} fitWidth={fitWidth} pageWidth={pageWidth} fitHeight={fitHeight} pageHeight={pageHeight} onGetWordIndexMap={_onGetWordIndexMap} />
        </div>
      </div>
      <Modal title="颜色设置" visible={isModalVisible} onOk={() => {
        setIsModalVisible(false);
        localStorage.setItem('pdf-font-color', colorEditing);
        localStorage.setItem('pdf-background-color', backgroundColorEditing);
        setColor(colorEditing);
        setBackgroundColor(backgroundColorEditing);
      }}
        okText="save"
        onCancel={() => {
          setIsModalVisible(false);
        }}
      >
        <div>文本颜色：</div>
        <HexColorPicker color={colorEditing} onChange={setColorEditing} />
        <div>背景颜色：</div>
        <HexColorPicker color={backgroundColorEditing} onChange={setBackgroundColorEditing} />
        <div>效果：</div>
        <div style={{ color: colorEditing, backgroundColor: backgroundColorEditing }}>Hello World!</div>
      </Modal>
    </div>
  );
}
export const PDFViewer = memo(Component);