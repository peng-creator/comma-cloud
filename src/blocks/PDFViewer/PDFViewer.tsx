import { Button, Pagination } from "antd";
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

const MENU_ID = "MENU_ID";

pdfjs.GlobalWorkerOptions.workerSrc = "/assets/pdf.worker.min.js";

export type MarkMap = {
  [key: string]: string | undefined;
};

const toutchWord$ = new Subject<string>();
toutchWord$.pipe(debounceTime(1)).subscribe({
  next(value) {
      tapWord$.next(value);
  },
});

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

function _InnerPdf({filePath, onGetNumPages, onGetPageLoaded, pageRef, pageNumber, fitWidth, pageWidth, fitHeight, pageHeight, onGetWordIndexMap, scale }: InnerPdfProps) {
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
          const words = pageRef.current.querySelectorAll('.pdf_page_word');
          console.log(words);
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

function Component({filePath: file, note}:{ filePath: string; note?: PDFNote }) {
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

  const { show, hideAll } = useContextMenu({
    id: MENU_ID,
  });

  useEffect(() => {
    const container = containerRef.current;
    const fitWidth = () => {
      if (container) {
        setFitHeight(false);
        setFitWidth(true);
        setPageWidth(container.clientWidth - 40);
        setPageHeight(container.clientHeight - 40);
      }
    };
    fitWidth();
    container?.addEventListener("resize", fitWidth);
    return () => {
      container?.removeEventListener("resize", fitWidth);
    };
  }, [containerRef]);

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
    wordIndexMap.forEach((index, ele) => {
      if (index >= start && index <= end) {
        ele.style.background = 'rgba(244, 208, 4, 0.2)';
      } else {
        ele.style.background = 'none';
      }
    })
  }, [wordIndexMap]);

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
          const {start, end} = note;
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
  },[]);



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

  const checkSelect = (e: any) => {
    const target = e.target as HTMLDivElement;
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
    const target = e.target as HTMLDivElement;
    console.log('checkSelectEnd')
    setIsSelecting(false);
    const targetIsWordEl = target.classList.contains('pdf_page_word');
    if (isSelecting) {
      let start = selectStartIndex;
      let end = selectEndIndex;
      let words: string[] = [];
      wordIndexMap.forEach((index, ele) => {
        if (index >= start && index <= end) {
          words.push(ele.textContent || ''); 
        }
      });
      let sentence = words.join(' ');
      let pdfNote:PDFNote = {
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
            title: '撤销标注',
          },
          {
            onClick: () => {
            },
            title: '关闭',
          },
        ]
      ]);
      show(e);

    } else if (targetIsWordEl && createdNote !== null) { // 点击文字，且当前已有标注
      let wordIndex = wordIndexMap.get(target);
      const { start, end } = createdNote;
      if ( wordIndex !== undefined && wordIndex >= start && wordIndex <= end) {
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
              title: '撤销标注',
            },
            {
              onClick: () => {
              },
              title: '关闭',
            },
          ]
        ]);
        show(e);
      } else {
        let word = target.textContent || '';
        if (word) {
          tapWord$.next(word);
        }
      }
    } else if (createdNote !== null && target === pointerDownTarget) { // 空白处点击， 取消标注
      const {start, end} = createdNote;
      cancelHighlight(start, end);
      setCreatedNote(null);
    } else if (targetIsWordEl) {
      let word = target.textContent || '';
      if (word) {
        tapWord$.next(word);
      }
    }
    setSelectEndIndex(-1);
    setSelectStartIndex(-1);
  }
  console.log(`render pdf view pageHeight: ${pageHeight}, pageWidth: ${pageWidth} , `)
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        userSelect: 'none',
      }}
      ref={containerRef}
    >
      <link rel="stylesheet" href="/assets/AnnotationLayer.css" /> 
      <link rel="stylesheet" href="/assets/TextLayer.css" /> 
      <div className="pdfHeader" style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <Button
          onClick={() => {
            const container = containerRef.current;
            if (container) {
              setFitHeight(true);
              setFitWidth(false);
              setPageWidth(container.clientWidth - 40);
              setPageHeight(container.clientHeight - 40);
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
              setPageWidth(container.clientWidth - 40);
              setPageHeight(container.clientHeight - 40);
              setScale(1);
            }
          }}
        >
          适应宽度
        </Button>
        <Pagination
            simple
            current={pageNumber}
            total={numPages * 10}
            onChange={(pageNumber: number) => {
              setPageNumber(pageNumber);
            }}
          />
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '150px'}}>
          <Button onClick={() => {
          if (scale <= 0.25) {
            return;
          }
          setScale(scale - 0.25);
        }}>-</Button>
        <span style={{width: '50px', overflow: 'hidden', textAlign: 'center'}}>{parseInt(`${scale * 100}`, 10)}%</span>
        <Button onClick={() => {
          if (scale >= 3) {
            return;
          }
          setScale(scale + 0.25);
        }}>+</Button>
          </div>
      </div>
      <div
        style={{
          maxWidth: "100%",
          maxHeight: "calc(100% - 64px)",
          overflow: isSelecting ? 'hidden' : 'auto',
          position: "absolute",
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        className="pdf-container"
      >
        <div
          style={{
            width: `${placeholderWidth}px`,
            height: `${placeholderHeight}px`,
            background: "white",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            top: 0,
            width: `${placeholderWidth}px`,
          }}
          className={styles.pdfWrapper}
          onPointerDown={(e) => {
            console.log('e.nativeEvent.pointerId:', e.nativeEvent.pointerId);
            (e.target as any).releasePointerCapture(e.nativeEvent.pointerId);
            if (selectLongPressTimer) {
              clearTimeout(selectLongPressTimer);
            }
            setPointerDownTarget(e.target as HTMLElement);
            setSelectLongPressTimer(setTimeout(() => {
              checkSelectStart(e);
              setSelectLongPressTimer(null);
            }, 500))
          }}
          onPointerMove={(e) => {
            if (e.target !== pointerDownTarget) {
              if (selectLongPressTimer !== null) {
                clearTimeout(selectLongPressTimer);
                setSelectLongPressTimer(null);
              }
              checkSelect(e);
            }
          }}
    
          onPointerUp={(e) => {
            checkSelectEnd(e);
            if (selectLongPressTimer) {
              clearTimeout(selectLongPressTimer);
              setSelectLongPressTimer(null);
            }
          }}
        >
          <InnerPdf scale={scale} filePath={filePath} onGetNumPages={_setNumPages} onGetPageLoaded={_setPageLoaded} pageRef={pageRef} pageNumber={pageNumber} fitWidth={fitWidth} pageWidth={pageWidth} fitHeight={fitHeight} pageHeight={pageHeight} onGetWordIndexMap={_onGetWordIndexMap} />
        </div>
      </div>
    </div>
  );
}
export const PDFViewer = memo(Component);