import React, { memo, useEffect, useRef, useState } from "react";
import { Button, Input, message, Popconfirm } from "antd";
import {
  DeleteOutlined,
  PlayCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { v5 as uuidv5 } from "uuid";
import { BehaviorSubject, Subject } from "rxjs";
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
    hasChanged: false,
  };
};

export const pdfNote$ = new Subject<PDFNote>();
export const openNote$ = new BehaviorSubject<PDFNote | null>(null);
export const saveCard$ = new Subject<FlashCard>();

export const addSubtitle$ = new Subject<Subtitle>();
export const openCardReviewAction$ = new Subject();

const Component = () => {
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]); // 卡片集，一个卡片集存储关键词相同的卡片。
  const [currentCard, setCurrentCard] = useState<FlashCard | null>(null);
  const [cardCollections, setCardCollections] = useState<string[]>([]); // 全部卡片集
  const [currentCollectionName, setCurrentCollectionName] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchResultList, setSearchResultList] = useState<SearchResult[]>([]);
  const [searchFocus, setSearchFocus] = useState(false);
  const searchRef = useRef<any>(null);

  useEffect(() => {
    const sp = search$.subscribe({
      next(content) {
        setCurrentCollectionName(content);
        getCollectionCardsByName(content);
        searchRef.current?.blur();
        setSearchFocus(false);
        setSearchName(content);
      },
    });
    return () => {
      sp.unsubscribe();
    };
  }, [searchRef]);

  useEffect(() => {
    const sp = addSubtitle$.subscribe({
      next(subtitle: Subtitle) {
        if (currentCard === null) {
          message.warn("没有打开的卡片");
          return;
        }
        currentCard.front.subtitles.push(subtitle);
        currentCard.clean = false;
        currentCard.hasChanged = true;
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
        currentCard.hasChanged = true;
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
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
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
      {(searchFocus || currentCollectionName === "") && searchName === "" && (
        <Virtuoso
          style={{ height: "100%" }}
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
      {searchFocus && searchName && searchResultList.length > 0 && (
        <Virtuoso
          style={{ height: "100%" }}
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
                onKeyDown={() => {}}
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
      {!searchFocus && currentCollectionName && (
        <div
          style={{
            display: "flex",
            height: "calc(100% - 32px)",
            width: "100%",
            overflow: "hidden",
            flexDirection: "column",
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
              console.log("1111111");
            }}
          >
            {flashCards.map((card, index) => {
              const selected = card === currentCard;
              return (
                <div key={index}>
                  <Button
                    type="text"
                    style={{
                      color: selected ? "#138bff" : "white",
                      background: selected ? "rgb(72, 72, 72)" : "none",
                      borderRadius: "5px 5px 0 0",
                    }}
                    onClick={() => {
                      setCurrentCard(card);
                    }}
                  >
                    {card.clean && "*"} {stringFolder(card.front.word, 10)}
                    {card.hasChanged && (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: "white",
                          marginLeft: "6px",
                        }}
                      ></span>
                    )}
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
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  minHeight: "50%",
                  backgroundColor: "rgb(72, 72, 72)",
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
                    const { subtitles, start, end, file } = subtitle;
                    const deleteSubtitle = () => {
                      const updatedSubtitles =
                        currentCard.front.subtitles.filter(
                          (sub) => subtitle !== sub
                        );
                      const nextCard: FlashCard = {
                        ...currentCard,
                        hasChanged: true,
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
                          onWordClick={() => {
                            playSubtitle$.next(subtitle);
                          }}
                          value={file} 
                          displayValueTo={(file) => {
                            const li = file.split("/");
                            return li[li.length - 1];
                          }}
                          onChange={(updatedFilePath: string) => {
                            const updatedSubtitle = {
                              ...subtitle, file: updatedFilePath,
                            };
                            currentCard.front.subtitles[index] = updatedSubtitle;
                            saveCard(currentCard);
                            const nextCard = {...currentCard};
                            setCurrentCard(nextCard);
                            const currentIndex = flashCards.indexOf(currentCard);
                            setFlashCards([
                              ...flashCards.slice(0, currentIndex),
                              nextCard,
                              ...flashCards.slice(currentIndex + 1),
                            ])
                          }}
                        />
                        <div
                          style={{marginLeft: '20px'}}
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
                    const { mergedStr } = pdfNote;
                    return (
                      <div
                        key={index}
                        tabIndex={0}
                        onClick={() => {
                          openNote$.next(pdfNote);
                          if (pdfNote.file) {
                            // openPdf$.next(pdfNote.file);
                          }
                        }}
                        onKeyDown={() => {}}
                        style={{ cursor: "pointer" }}
                      >
                        [pdf] {stringFolder(mergedStr, 60)}
                        <Popconfirm
                          title="删除"
                          onConfirm={() => {
                            const updatedPdfNote =
                              currentCard.front.pdfNote.filter(
                                (note) => pdfNote !== note
                              );
                            const nextCard: FlashCard = {
                              ...currentCard,
                              hasChanged: true,
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
                  minHeight: "50%",
                  backgroundColor: "rgb(62, 62, 62)",
                  display: "flex",
                  flexDirection: "column",
                  padding: "14px",
                }}
              >
                <div>解释：</div>
                <Input.TextArea
                  value={currentCard.back}
                  onChange={(e) => {
                    currentCard.back = e.target.value;
                    currentCard.clean = false;
                    currentCard.hasChanged = false;
                    setFlashCards([...flashCards]);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  placeholder="此处记录您对摘录的理解"
                  style={{
                    flexGrow: 1,
                    resize: "none",
                    background: "none",
                    color: "white",
                    outline: "none",
                  }}
                  onBlur={() => {
                    saveCard(currentCard);
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
