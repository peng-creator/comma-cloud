import { Button, Modal, Skeleton, Tabs } from "antd";
import React, { CSSProperties, useEffect, useState } from "react";
import { skip, startWith } from "rxjs";
import { useBehavior } from "../../state";
import { pdfNoteToBeAdded$, showFloatCardMaker$, subtitleToBeAdded$ } from "../../state/cardMaker";
import { UserPreference, userPreference$ } from "../../state/preference";
import { search$, tapSearch$, } from "../../state/search";

import type { TabsProps } from 'antd';
import { FloatWrapper } from "../FloatWrapper/FloatWrapper";

export const FloatDict = () => {
  const [searchContent, setSearchContent] = useState('');
  const [tabKey, setTabKey] = useState('1');
  const [subtitleToBeAdded] = useBehavior(subtitleToBeAdded$, null);
  const [pdfNoteToBeAdded] = useBehavior(pdfNoteToBeAdded$, null);
  const [AIQuestion, setAIQuestion] = useState([] as string[]);

  useEffect(() => {
    const sp = search$.subscribe({
      next(s) {
        setSearchContent(s);
      },
    })
    return () => {
      sp.unsubscribe();
    };
  }, []);


  useEffect(() => {
    if (!subtitleToBeAdded || !searchContent || tabKey !== '2' ) {
      return;
    }
    setAIQuestion([
      `what does "${searchContent}" mean in context: \`\`\`${subtitleToBeAdded.subtitles.join(' ')}\`\`\``,
      `given context: ${subtitleToBeAdded.subtitles.join(' ')}, explain ${searchContent} in Chinese`,
      `translate ${searchContent} to Chinese of context ${subtitleToBeAdded.subtitles.join(' ')}`
    ]);
  }, [subtitleToBeAdded, searchContent, tabKey]);

  useEffect(() => {
    if (!pdfNoteToBeAdded || !searchContent || tabKey !== '2' ) {
      return;
    }
    setAIQuestion([
      `simplify: ${searchContent}`,
      `translate to Chinese: ${searchContent}`,
      `summarize: ${searchContent}`
    ]);
  }, [pdfNoteToBeAdded, searchContent, tabKey]);

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: `有道词典`,
      children: '',
    },
    {
      key: '2',
      label: `Ask AI`,
      children: '',
    },
  ];

  if (!searchContent) {
    return null;
  }
  return <FloatWrapper onClose={() => setSearchContent('')}><div style={{
    background: '#fff',
    height: '100%',
    width: '100%',
    borderRadius: '14px',
    pointerEvents: 'auto',
    overflow: 'hidden'
  }}>
    <div style={{ width: '100%', color: '#ccc', fontSize: '14px', height: 'calc(100% - 60px)', borderRadius: '14px 14px 0 0', overflow: 'hidden' }}>
      <Tabs defaultActiveKey="1" items={items} onChange={(tabKey: string) => {
        setTabKey(tabKey);
      }} />
      <div style={{ width: '100%', color: '#000', fontSize: '14px', height: 'calc(100% - 60px)', display: 'flex', padding: '0 14px'}}>
        {tabKey === '1' && 
          <iframe
            title={'有道词典'}
            src={"https://mobile.youdao.com/dict?le=eng&q={}".replace("{}", searchContent)}
            frameBorder="0"
            style={{ flexGrow: 1, width: '100%', height: '100%' }}
          ></iframe>  
        }
        <div>
          {tabKey === '2' && AIQuestion.map((question: string, index) => {
            return <div key={index}>{question}</div>
          }) }
        </div>
      </div>

    </div>
    <Button style={{ width: '100%', height: '60px', fontSize: '20px' }} onClick={() => {
      showFloatCardMaker$.next(true);
      setSearchContent('');
    }}>制作卡片</Button>
  </div></FloatWrapper> ;
};
