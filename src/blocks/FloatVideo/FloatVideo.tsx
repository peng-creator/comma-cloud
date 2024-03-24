import { Button, Modal, Skeleton } from "antd";
import React,{ CSSProperties, useEffect, useState } from "react";
import { playFloatVideoSubtitle$ } from "../../state/video";
import { Subtitle } from "../../type/Subtitle";
import { Video } from "../Video/Video";


export const FloatVideo = ({
  style,
}: {
  style?: CSSProperties;
}) => {
  const [show, setShow] = useState(false);
  const [subtitle, setSubtitle] = useState<Subtitle | null>(null);

  useEffect(() => {
    const sp = playFloatVideoSubtitle$.subscribe({
      next(subtitle) {
        if (subtitle === null) {
          return;
        }
        setSubtitle(subtitle);
        setShow(true);
      }
    });
    return () => sp.unsubscribe();
  }, []);
  if (subtitle === null) {
    return null;
  }
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
        return  <div style={{
            background: '#000',
            height: '100%',
            width: '100%',
            borderRadius: '14px',
            pointerEvents: 'auto',
            position: 'fixed',
            overflow: 'hidden'
        }}>
          <Video style={{height: '100%'}} filePath={subtitle.file || ''} zoneId={subtitle.file || ''} title={subtitle.file || ''} layoutMode={0} subtitle={subtitle}></Video>
        </div>;
    }}
    footer={null}
    closable={false}
    visible={show}
    onCancel={() => { setShow(false); setSubtitle(null); }}
    onOk={() => { setShow(false); setSubtitle(null); }}
    />
  );
};
