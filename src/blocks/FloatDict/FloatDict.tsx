import { Button, Modal, Skeleton } from "antd";
import React,{ CSSProperties, useEffect, useState } from "react";
import { skip, startWith } from "rxjs";
import { useBehavior } from "../../state";
import { showFloatCardMaker$ } from "../../state/cardMaker";
import { UserPreference, userPreference$ } from "../../state/preference";
import { tapSearch$, } from "../../state/search";


export const FloatDict = ({
  style,
}: {
  style?: CSSProperties;
}) => {
  const [show, setShow] = useState(false);
  const [searchContent, setSearchContent] = useState('');

  useEffect(() => {
    let userPreference = {} as UserPreference;
    userPreference$.subscribe({
      next(u) {
        userPreference = u;
      }
    })
    const sp = tapSearch$.subscribe({
      next(s) {
        if (!userPreference.floatDict) {
          return;
        }
        setShow(true);
        setSearchContent(s);
      },
    })
    return () => {
      sp.unsubscribe();
    };
  }, []);

  return (
<Modal
    width="90%"
    style={{
        height: '90%',
        top: '50%',
        transform: 'translate(0, -50%)',
        minHeight: '550px',
    }}
    modalRender={() => {
        return searchContent && <div style={{
            background: '#000',
            height: '100%',
            width: '100%',
            borderRadius: '14px',
            pointerEvents: 'auto',
            position: 'fixed',
            overflow: 'hidden'
        }}>
            <div style={{ width: '100%', color: '#ccc', fontSize: '14px', height: 'calc(100% - 60px)', display: 'flex', borderRadius: '14px 14px 0 0', overflow: 'hidden'}}>
                <iframe
                    title={'有道词典'}
                    src={"https://mobile.youdao.com/dict?le=eng&q={}" .replace("{}", searchContent)}
                    frameBorder="0"
                    style={{ flexGrow: 1 }}
                ></iframe>
            </div>
            <Button style={{width: '100%', height: '60px', fontSize: '20px'}} onClick={() => {
              showFloatCardMaker$.next(true);
              setShow(false);
              setSearchContent('');
            }}>制作卡片</Button>
        </div>;
    }}
    footer={null}
    closable={false}
    visible={show}
    onCancel={() => { setShow(false) }}
    onOk={() => { setShow(false) }}
    />
  );
};
