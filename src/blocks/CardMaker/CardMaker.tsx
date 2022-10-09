import React, { memo, useEffect, useRef, useState } from "react";
import { Button, Input, message, Popconfirm, Tooltip } from "antd";
import {
  DeleteOutlined,
  PlayCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { v5 as uuidv5 } from "uuid";
import { BehaviorSubject, debounceTime, Subject, throttleTime } from "rxjs";
import { PDFNote } from "../../type/PDFNote";
import { FlashCard } from "../../type/FlashCard";
import { Subtitle } from "../../type/Subtitle";
import { stringFolder } from "../../utils/string";
import { SearchResult } from "../../type/SearchResult";
import { search$ } from "../../state/search";
import { LazyInput } from "../../compontent/LazyInput/LazyInput";
import { millisecondsToTime } from "../../utils/time";
import {
  getCardCollection,
  getCardCollections,
  saveCard,
  searchCardCollections,
} from "../../service/http/Card";
import { IonList, IonItem, IonLabel } from "@ionic/react";
import { Virtuoso } from "react-virtuoso";
import { playSubtitle$ } from "../../state/video";
import { checkClipboard } from "../../utils/clipboard";

const MY_NAMESPACE = "2a671a64-40d5-491e-99b0-da01ff1f3341";
export const CARD_COLLECTION_NAMESPACE = "3b671a64-40d5-491e-99b0-da01ff1f3341";

const newFlashCard = (keyword: string): FlashCard => {
  return {
    id: uuidv5(keyword + Date.now(), MY_NAMESPACE),
    front: {
      word: keyword,
      subtitles: [],
      pdfNote: [],
    },
    back: "",
    dueDate: Date.now(),
    interval: 0,
    repetition: 0,
    efactor: 2.5,
    clean: true,
  };
};

export const pdfNote$ = new Subject<PDFNote>();
export const openNote$ = new Subject<PDFNote>();

export const addSubtitle$ = new Subject<Subtitle>();
export const openCardReviewAction$ = new Subject();
export const saveCard$ = new BehaviorSubject<FlashCard | null>(null);

const throttledAddSubtitle$ = addSubtitle$.pipe(throttleTime(3000));

const Component = ({ layoutMode }: { layoutMode: number }) => {
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]); // 卡片集，一个卡片集存储关键词相同的卡片。
  const [currentCard, setCurrentCard] = useState<FlashCard | null>(null);
  const [cardCollections, setCardCollections] = useState<string[]>([]); // 全部卡片集
  const [currentCollectionName, setCurrentCollectionName] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchResultList, setSearchResultList] = useState<SearchResult[]>([]);
  const [searchFocus, setSearchFocus] = useState(false);
  const searchRef = useRef<any>(null);
  const [copiedText, setCopiedText] = useState('');

  useEffect(() => {
    const sp = saveCard$.pipe(debounceTime(1000)).subscribe({
      next(card) {
        if (card === null) {
          return;
        }
        saveCard(card);
      }
    });
    return () => sp.unsubscribe();
  }, [saveCard$]);

  useEffect(() => {
    const sp = search$.subscribe({
      next(content) {
        setCurrentCollectionName(content);
        getCollectionCardsByName(content);
        searchRef.current?.blur();
        setSearchFocus(false);
        setSearchName(content);
        searchCardCollections(content).then((collections) =>
          setSearchResultList(collections)
        );
      },
    });
    return () => {
      sp.unsubscribe();
    };
  }, [searchRef]);

  useEffect(() => {
    const sp = throttledAddSubtitle$.subscribe({
      next(subtitle: Subtitle) {
        if (currentCard === null) {
          message.warn("没有打开的卡片");
          return;
        }
        currentCard.front.subtitles.push(subtitle);
        currentCard.clean = false;
        saveCard(currentCard);
        setFlashCards([...flashCards]);
      },
    });
    return () => sp.unsubscribe();
  }, [currentCard, flashCards]);

  useEffect(() => {
    const sp = pdfNote$.subscribe({
      next(note) {
        if (note === null) {
          return;
        }
        if (currentCard === null) {
          message.warn("没有打开的卡片");
          return;
        }
        if (!currentCard.front.pdfNote) {
          currentCard.front.pdfNote = [];
        }
        currentCard.front.pdfNote.push(note);
        currentCard.clean = false;
        saveCard(currentCard);
        setFlashCards([...flashCards]);
      },
    });
    return () => sp.unsubscribe();
  }, [currentCard, flashCards]);

  useEffect(() => {
    getCardCollections().then((res) => setCardCollections(res));
  }, []);

  const getCollectionCardsByName = (name: string) => {
    getCardCollection(name).then((cards) => {
      if (cards.length > 0) {
        const newCard = newFlashCard(name);
        const nextCards = [...cards, newCard];
        setFlashCards(nextCards);
        setCurrentCard(nextCards[0]);
      } else {
        const newCard = newFlashCard(name);
        setFlashCards([newCard]);
        setCurrentCard(newCard);
      }
    });
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: layoutMode === 0 ? "row" : "column",
        width: "100%",
        height: "100%",
        overflow: "auto",
        position: "relative",
        minWidth: '396px',
      }}
    >
      <div style={{ width: layoutMode === 0 ? '300px' : '100%', height: layoutMode === 0 ? '100%' : '200px', flexGrow: 1 }}>
        <Input
          style={{ width: "100%" }}
          placeholder="搜索卡片"
          value={searchName}
          onChange={(e) => {
            const search = e.target.value;
            setSearchName(search);
            setCurrentCollectionName("");
            if (search) {
              getCollectionCardsByName(search);
              searchCardCollections(search).then((collections) =>
                setSearchResultList(collections)
              );
            } else {
              setCurrentCollectionName("");
              getCardCollections().then((res) => setCardCollections(res));
              setSearchResultList([]);
            }
          }}
          onKeyDown={(e) => {
            if (e.key.toLowerCase() === "enter") {
              setCurrentCollectionName(searchName);
              getCollectionCardsByName(searchName);
              setSearchFocus(false);
              searchRef.current?.blur();
            }
          }}
          onFocus={() => {
            setSearchFocus(true);
          }}
          ref={searchRef}
        />
        {/* 没有搜索内容时，显示全部 */}
        {searchResultList.length === 0 && (
          <Virtuoso
            style={{ height: "calc(100% - 32px)" }}
            totalCount={cardCollections.length}
            itemContent={(index) => {
              const collection = cardCollections[index];
              return (
                <div
                  style={{ padding: "14px", borderBottom: ".5px solid #ddd" }}
                  onClick={() => {
                    console.log("collection:", collection);
                    setCurrentCollectionName(collection);
                    getCollectionCardsByName(collection);
                    searchRef.current?.blur();
                    setSearchFocus(false);
                    setSearchName(collection);
                  }}
                >
                  {collection}
                </div>
              );
            }}
          />
        )}
        {searchResultList.length > 0 && (
          <Virtuoso
            style={{ height: "calc(100% - 32px)" }}
            totalCount={searchResultList.length}
            itemContent={(index) => {
              const { id, match, score, terms } = searchResultList[index];
              const item = () => {
                return id.split(/\s/).map((word: string, wordIndex: number) => {
                  if (terms.includes(word.replaceAll(/\W/g, "").toLowerCase())) {
                    return (
                      <span key={wordIndex} style={{ color: "rgb(226, 68, 68)" }}>
                        {word}{" "}
                      </span>
                    );
                  }
                  return <span key={wordIndex}>{word} </span>;
                });
              };
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    borderBottom: ".5px solid #ddd",
                    padding: "14px",
                    cursor: "pointer",
                  }}
                  tabIndex={0}
                  onKeyDown={() => { }}
                  onClick={() => {
                    setCurrentCollectionName(id);
                    getCollectionCardsByName(id);
                    setSearchName(id);
                    searchRef.current?.blur();
                    setSearchFocus(false);
                  }}
                >
                  <div>{item()}</div>
                </div>
              );
            }}
          />
        )}
      </div>

      {currentCollectionName && (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            overflow: "hidden",
            flexDirection: "column",
            ...(layoutMode === 0 ? {}: {marginTop: '14px'} )
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              overflowY: "hidden",
              overflowX: "auto",
              height: "30px",
            }}
            className="scrollbarHidden"
            onWheel={(e) => {
              const delta = Math.max(
                -1,
                Math.min(1, (e.nativeEvent as any).wheelDelta)
              );
              e.currentTarget.scrollLeft -= delta * 30;
            }}
          >
            {flashCards.map((card, index) => {
              const selected = card === currentCard;
              return (
                <div key={index}>
                  <Button
                    type="text"
                    style={{
                      color: selected ? "#138bff" : "#ccc",
                      background: selected ? "#484d56" : "none",
                      borderRadius: "5px 5px 0 0",
                    }}
                    onClick={() => {
                      setCurrentCard(card);
                    }}
                  >
                    {card.clean && "*"} {stringFolder(card.front.word, 10)}
                  </Button>
                </div>
              );
            })}
          </div>
          {currentCard !== null && (
            <div
              style={{
                height: "calc(100% - 30px)",
                width: "100%",
                overflowY: "hidden",
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  height: '70%',
                  maxHeight: 'calc(100% - 200px)',
                  minHeight: '100px',
                  backgroundColor: "#484d56",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  padding: "14px",
                  width: "100%",
                  overflowY: "auto",
                }}
              >
                <div>摘抄：</div>
                <div style={{ flex: 1, width: "100%" }}>
                  {currentCard.front.subtitles.length === 0 &&
                    (currentCard.front.pdfNote === undefined ||
                      currentCard.front.pdfNote.length === 0) && (
                      <>
                        <div>您可以将视频字幕片段、PDF摘录加入到卡片</div>
                      </>
                    )}
                  {currentCard.front.subtitles.map((subtitle, index) => {
                    const { subtitles, start, end, file, title } = subtitle;
                    const deleteSubtitle = () => {
                      const updatedSubtitles =
                        currentCard.front.subtitles.filter(
                          (sub) => subtitle !== sub
                        );
                      const nextCard: FlashCard = {
                        ...currentCard,
                      };
                      nextCard.front.subtitles = updatedSubtitles;
                      const currentCardIndex = flashCards.findIndex(
                        (f) => f === currentCard
                      );
                      const nextCards = [
                        ...flashCards.slice(0, currentCardIndex),
                        nextCard,
                        ...flashCards.slice(currentCardIndex + 1),
                      ];
                      setFlashCards(nextCards);
                      setCurrentCard(nextCard);
                      saveCard(currentCard);
                    };
                    return (
                      <div
                        key={index}
                        style={{
                          padding: "0 10px",
                          cursor: "pointer",
                          display: "flex",
                          width: "100%",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ margin: "0 14px" }}>-{index}.</div>
                        <LazyInput
                          showEditBtn
                          onWordClick={() => {
                            playSubtitle$.next(subtitle);
                          }}
                          value={file}
                          displayValueTo={(file: string) => {
                            const li = file.split("/");
                            return stringFolder(li[li.length - 1], 30) ;
                          }}
                          onChange={(updatedFilePath: string) => {
                            const updatedSubtitle = {
                              ...subtitle,
                              file: updatedFilePath,
                            };
                            currentCard.front.subtitles[index] =
                              updatedSubtitle;
                            const nextCard = { ...currentCard };
                            setCurrentCard(nextCard);
                            const currentIndex =
                              flashCards.indexOf(currentCard);
                            setFlashCards([
                              ...flashCards.slice(0, currentIndex),
                              nextCard,
                              ...flashCards.slice(currentIndex + 1),
                            ]);
                            saveCard(nextCard);
                          }}
                        />
                        <div
                          style={{ marginLeft: "20px" }}
                          tabIndex={0}
                          onClick={() => {
                            deleteSubtitle();
                          }}
                          onKeyDown={(e) => {
                            if (e.key.toLowerCase() === "enter") {
                              deleteSubtitle();
                            }
                          }}
                        >
                          <DeleteOutlined></DeleteOutlined>
                        </div>
                      </div>
                    );
                  })}
                  {(currentCard.front.pdfNote || []).map((pdfNote, index) => {
                    const { file } = pdfNote;
                    const fileName = file.split("/").pop();
                    return (
                      <div key={index} style={{ display: 'flex' }}>
                        <div
                          tabIndex={0}
                          onClick={() => {
                            openNote$.next(pdfNote);
                          }}
                          onKeyDown={() => { }}
                          style={{ cursor: "pointer", marginRight: '14px' }}
                        >
                          [pdf] {stringFolder(fileName || file, 30)}
                        </div>
                        <Popconfirm
                          title="删除"
                          onConfirm={() => {
                            const updatedPdfNote =
                              currentCard.front.pdfNote.filter(
                                (note) => pdfNote !== note
                              );
                            const nextCard: FlashCard = {
                              ...currentCard,
                            };
                            nextCard.front.pdfNote = updatedPdfNote;
                            const currentCardIndex = flashCards.findIndex(
                              (f) => f === currentCard
                            );
                            const nextCards = [
                              ...flashCards.slice(0, currentCardIndex),
                              nextCard,
                              ...flashCards.slice(currentCardIndex + 1),
                            ];
                            setFlashCards(nextCards);
                            setCurrentCard(nextCard);
                            saveCard(nextCard);
                          }}
                        >
                          <div
                            style={{
                              display: "inline-block",
                              cursor: "pointer",
                              color: "rgb(189, 79, 79)",
                            }}
                          >
                            <DeleteOutlined></DeleteOutlined>
                          </div>
                        </Popconfirm>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div
                style={{
                  height: "30%",
                  maxHeight: '200px',
                  flexGrow: 1,
                  backgroundColor: "#484d56",
                  display: "flex",
                  flexDirection: "column",
                  padding: "14px",
                }}
              >
                <div>解释：</div>
                {copiedText.trim() && <div style={{ margin: '14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <span style={{ marginRight: '14px' }}>{copiedText}</span><Button type="ghost" style={{ color: '#ccc' }} onClick={() => {
                    currentCard.back += `\n${copiedText}`;
                    currentCard.clean = false;
                    setFlashCards([...flashCards]);
                    saveCard$.next(currentCard);
                  }}>填入</Button>
                </div>
                }
                <Input.TextArea
                  value={currentCard.back}
                  onChange={(e) => {
                    currentCard.back = e.target.value;
                    currentCard.clean = false;
                    setFlashCards([...flashCards]);
                    saveCard$.next(currentCard);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  placeholder="此处记录您的理解"
                  style={{
                    flexGrow: 1,
                    resize: "none",
                    background: "none",
                    color: "#ccc",
                    outline: "none",
                  }}
                  onFocus={async () => {
                    const copiedText = await checkClipboard();
                    setCopiedText(copiedText);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setCopiedText('');
                    }, 500);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CardMaker = memo(Component);
