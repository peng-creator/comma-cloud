import React, { useState, useEffect, memo, CSSProperties } from 'react';
import dayjs from 'dayjs';
import { supermemo, SuperMemoGrade } from 'supermemo';
import { Button, Empty, Input } from 'antd';
import { v5 as uuidv5 } from 'uuid';
import { BehaviorSubject } from 'rxjs';
import { FlashCard } from '../../type/FlashCard';
import { searchSentence } from '../../state/search';
import { stringFolder } from '../../utils/string';
import { openNote$, saveCard$ } from '../CardMaker/CardMaker';
import {
  getCardCollection,
  getCardCollections,
  getCardToReview,
  saveCard,
  searchCardCollections,
} from "../../service/http/Card";
import { reverse } from 'lodash';
import { playFloatVideoSubtitle$ } from '../../state/video';
import { openFloatPDFNote$ } from '../../state/pdf';

const loadNextCardAction$ = new BehaviorSubject<any>(1);

let savingPromise: Promise<any> = Promise.resolve();

const Component = () => {
  const [cardToReview, setCardToReview] = useState<FlashCard | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [recall, setRecall] = useState<string>('');

  useEffect(() => {
    let cardsToReview = [] as FlashCard[];

    const sp = loadNextCardAction$.subscribe({
      next: async () => {
        setRecall('');
        if (cardsToReview.length === 0) {
          await savingPromise;
          cardsToReview = await getCardToReview(); // 等待集合列表加载完毕
        }
        // 从缓存中获取。
        const card = cardsToReview.shift();
        if (card !== undefined) {
          setCardToReview(card);
          setShowBack(false);
          return;
        }
        setCardToReview(null);
        setShowBack(false);
      },
    });
    return () => {
      sp.unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (cardToReview === null) {
      return;
    }
    const sp = saveCard$.subscribe({
      next(card) {
        if (card === null) {
          return;
        }
        if (cardToReview.id === card.id) {
          setCardToReview(card);
        }
      },
    });
    return () => sp.unsubscribe();
  }, [cardToReview]);

  if (cardToReview === null) {
    return <Empty description="没有需要回顾的卡片。"></Empty>;
  }

  function practice(flashcard: FlashCard, grade: SuperMemoGrade) {
    const { interval, repetition, efactor } = supermemo(flashcard, grade);
    const dueDate = dayjs(Date.now()).add(interval, 'day').valueOf();
    return { ...flashcard, interval, repetition, efactor, dueDate };
  }
  const practiceAndSave = (cardToReview: FlashCard, grade: SuperMemoGrade) => {
    const updatedCard = practice(cardToReview, grade);
    return saveCard(updatedCard);
  };
  const PracticeButton = ({
    message,
    grade,
    style,
  }: {
    message: string;
    grade: SuperMemoGrade;
    style?: CSSProperties;
  }) => {
    return (
      <Button
        type="ghost"
        style={{
          color: 'white',
          border: '1px solid white',
          borderBottom: 'none',
          ...style,
        }}
        onClick={() => {
          savingPromise = practiceAndSave(cardToReview, grade);
          loadNextCardAction$.next(1);
        }}
      >
        {message}
      </Button>
    );
  };
  console.log('render cardToReview:', cardToReview);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div
        style={{
          flexGrow: 1,
        }}
      >
        <div>
          <span
            style={{ cursor: 'pointer', fontSize: '30px' }} 
            tabIndex={0}
            onClick={() => searchSentence(cardToReview.front.word)}
            onKeyDown={() => searchSentence(cardToReview.front.word)}
          >
            {cardToReview.front.word}
          </span>
        </div>
        <div
          style={{
            borderBottom: '1px solid #ddd',
            margin: '14px 0',
            paddingBottom: '14px',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          <div>
            {cardToReview.front.subtitles.map((subtitle, index) => {
              const arr = (subtitle.file || '').split('/');
              const showTitle = arr.pop() || '';
              return (
                <div
                  key={index}
                  tabIndex={0}
                  onClick={() => {
                    playFloatVideoSubtitle$.next(subtitle);
                  }}
                  onKeyDown={(e) => {
                    if (e.key.toLowerCase() === 'enter') {
                      playFloatVideoSubtitle$.next(subtitle);
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                  }}
                >
                  - {showTitle}
                </div>
              );
            })}
          </div>
          <div>
            {(cardToReview.front.pdfNote || []).map((pdfNote, index) => {
              return (
                <div
                  key={index}
                  tabIndex={0}
                  onClick={() => {
                    openFloatPDFNote$.next(pdfNote);
                    console.log('openFloatPDFNote:', pdfNote);
                    // openNote$.next(pdfNote);
                    // if (pdfNote.file) {
                    //   openPdf$.next(pdfNote.file);
                    // }
                  }}
                  onKeyDown={(e) => {
                    if (e.key.toLowerCase() === 'enter') {
                      // openNote$.next(pdfNote);
                      console.log('openFloatPDFNote:', pdfNote);
                      openFloatPDFNote$.next(pdfNote);
                      // if (pdfNote.file) {
                      //   openPdf$.next(pdfNote.file);
                      // }
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                  }}
                >
                  - {stringFolder(pdfNote.file, 100)}
                </div>
              );
            })}
          </div>
        </div>
        <Input.TextArea
          rows={4}
          value={recall}
          onChange={(e) => {
            setRecall(e.target.value);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          placeholder="请写下您记忆中的内容。"
          style={{
            resize: 'none',
            background: 'none',
            color: 'white',
            outline: 'none',
            marginBottom: '12px',
          }}
        />
        <div style={{ position: 'relative', minHeight: '60px', }}>
          {!showBack && cardToReview.back && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'black',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              tabIndex={0}
              onKeyDown={() => {}}
              onClick={() => {
                setShowBack(true);
              }}
            >
              显示释义
            </div>
          )}
          <div>{cardToReview.back}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', color: 'white' }}>
        <PracticeButton message="完全忘记" grade={0}></PracticeButton>
        <PracticeButton message="非常模糊" grade={1}></PracticeButton>
        <PracticeButton message="记得部分" grade={2}></PracticeButton>
        <PracticeButton message="回想吃力" grade={3}></PracticeButton>
        <PracticeButton message="略微犹豫" grade={4}></PracticeButton>
        <PracticeButton
          message="完全掌握"
          grade={5}
          style={{ borderBottom: '1px solid white' }}
        ></PracticeButton>
      </div>
    </div>
  );
};
export const CardReviewer = memo(Component);
