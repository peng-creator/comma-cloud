import { Button, Modal, Skeleton, Spin, Tabs, message } from "antd";
import React, { CSSProperties, useEffect, useState } from "react";
import { useBehavior } from "../../state";
import { pdfNoteToBeAdded$, subtitleToBeAdded$ } from "../../state/cardMaker";
import { UserPreference, userPreference$ } from "../../state/preference";
import { localSearch$, search$, tapSearch$, } from "../../state/search";

import { FloatWrapper } from "../FloatWrapper/FloatWrapper";
import { askAI } from "../../service/http/Chat";
import { saveCard } from "../../service/http/Card";
import { newFlashCard } from "../CardMaker/CardMaker";

export const FloatDict = () => {
  const [searchContent, setSearchContent] = useState('');
  const [subtitleToBeAdded] = useBehavior(subtitleToBeAdded$, null);
  const [pdfNoteToBeAdded] = useBehavior(pdfNoteToBeAdded$, null);
  const [userPreference] =  useBehavior(userPreference$, {} as UserPreference);
  const [AIAnswer, setAIAnswer] = useState('');
  const [showAISpin,setShowAISpin] = useState(true);

  useEffect(() => {
    const sp = localSearch$.subscribe({
      next(s) {
        setSearchContent(s);
      },
    })
    return () => {
      sp.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!pdfNoteToBeAdded && !subtitleToBeAdded || !searchContent ) {
      return;
    }
    console.log('asking ai');
    let question = '';
    if (subtitleToBeAdded) {
      question = `解释 \`\`\`${subtitleToBeAdded.context?.reduce((acc, curr) => {
        if (acc.subtitles.length === 0) {
          acc.subtitles = [...curr.subtitles];
        } else {
          acc.subtitles = acc.subtitles.map((s, i) => s + curr.subtitles[i]) 
        }
        return acc;
      }, {end: 0, start: 0, subtitles: []}).subtitles.join(' ') || subtitleToBeAdded.subtitles.join(' ')}\`\`\` 中的 ${searchContent} `;
    }
    if (pdfNoteToBeAdded) {
      question = `explain ${searchContent} in Chinese`;
    }
    if (!question) {
      return;
    }
    console.log('asking ai:', question);
    setAIAnswer('');
    const questionToAnswer = JSON.parse(localStorage.getItem('AIAnswerquestion') || '{}');
    if (questionToAnswer[question]) {
      setAIAnswer(questionToAnswer[question]);
      return;
    }
    setShowAISpin(true);
    askAI(question, []).subscribe({
      next(res) {
        setAIAnswer(res);
        const questionToAnswer = JSON.parse(localStorage.getItem('AIAnswerquestion') || '{}');
        questionToAnswer[question] = res;
        localStorage.setItem('AIAnswerquestion', JSON.stringify(questionToAnswer));
      },
      complete() {
        setShowAISpin(false);
      },
      error() {
        setShowAISpin(false);
      }
    });
  }, [searchContent]);

  useEffect(() => {
    if (!searchContent || !userPreference.floatDict) {
      setAIAnswer('');
      setSearchContent('');
    }
  }, [
    searchContent, userPreference.floatDict
  ]);

  if (!searchContent || !userPreference.floatDict) {
    return null;
  }
  return <FloatWrapper onClose={() => setSearchContent('')} showMask={false}><div style={{
    background: '#fff',
    minHeight: '5px',
    width: '100%',
    borderRadius: '14px',
    pointerEvents: 'auto',
    overflow: 'hidden',
    padding: "14px"
  }}>
    <div style={{fontSize: '20px', color: '#000'}}>{searchContent}</div>
    <div style={{ width: '100%',  color: '#000', fontSize: '14px', height: 'calc(100% - 60px)', borderRadius: '14px 14px 0 0', overflow: 'hidden', marginTop: '14px', marginBottom: '14px' }}>
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
       {AIAnswer.split('\n').map((p, i) => {
        return <div key={i}>{p}</div>
       })}{showAISpin && <Spin/>}
      </div>
    </div>
    <Button style={{ width: '100%', height: '40px', fontSize: '20px' }} onClick={() => {
      const newCard = newFlashCard(searchContent);
      newCard.back = AIAnswer;
      if (subtitleToBeAdded) {
        newCard.front.subtitles.push(subtitleToBeAdded);
      }
      if (pdfNoteToBeAdded) {
        newCard.front.pdfNote.push(pdfNoteToBeAdded);
      }
      saveCard(newCard).then(() => {
        message.success('卡片保存成功!');
      }).catch(e => {
        message.error('卡片保存失败!');
      });
      setSearchContent('');
    }}>保存卡片</Button>
  </div></FloatWrapper> ;
};
