import { Button, Modal, Skeleton } from "antd";
import React,{ CSSProperties, useEffect, useState } from "react";
import { skip, startWith } from "rxjs";
import { useBehavior } from "../../state";
import { showFloatCardMaker$ } from "../../state/cardMaker";
import { UserPreference, userPreference$ } from "../../state/preference";
import { tapSearch$, } from "../../state/search";
import { CardMaker } from "../CardMaker/CardMaker";


export const FloatCardMaker = ({
  style,
}: {
  style?: CSSProperties;
}) => {
  const [show, setShow] = useBehavior(showFloatCardMaker$, false);


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
        return  <div style={{
            background: '#252a31',
            height: '100%',
            width: '100%',
            borderRadius: '14px',
            pointerEvents: 'auto',
            overflow: 'hidden',
            color: '#ccc',
        }}>
          <CardMaker layoutMode={0} ></CardMaker>
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
