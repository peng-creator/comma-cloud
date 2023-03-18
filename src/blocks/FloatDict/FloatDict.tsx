import { Modal, Skeleton } from "antd";
import React,{ CSSProperties, useEffect, useState } from "react";
import { skip, startWith } from "rxjs";
import { useBehavior } from "../../state";
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
    width="95%"
    style={{
        height: '50%',
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
            overflow: 'hidden'
        }}>
            <div style={{ width: '100%', color: '#ccc', fontSize: '14px', height: '100%', display: 'flex' }}>
                <iframe
                    title={'有道词典'}
                    src={"https://mobile.youdao.com/dict?le=eng&q={}" .replace("{}", searchContent)}
                    frameBorder="0"
                    style={{ flexGrow: 1 }}
                ></iframe>
            </div>
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
