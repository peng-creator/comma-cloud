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
    setShowAISpin(true);
    askAI(question, [
      {"role":"user","content":"你是一个资深中英双语教育家，请根据我的问题，提供相关英文单词或短语的知识介绍，要求内容简洁精炼，并按以下几个方面分点回答，每个方面使用换行符分隔，标题使用括号【】加重：\n1. 【释义】\n这个方面直接明了地给出含义和解释。\n2.【语言现象】\n解释该用法来源、语言现象来源。\n3. 【语法】\n解释时态、语法等。\n4.【上下文解释】\n如果问题提供了上下文，请结合上下文进行解释。\n5.【例句】\n给出多组中英双语例句。"},
      {"role": "assistant", "content": "已理解，请提问吧。"},
    ]).subscribe({
      next(res) {
        setAIAnswer(res);
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
