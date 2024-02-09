import { Button, Modal, Skeleton } from "antd";
import React,{ CSSProperties, useEffect, useState } from "react";
import { skip, startWith } from "rxjs";
import { useBehavior } from "../../state";
import { showFloatCardMaker$ } from "../../state/cardMaker";
import { UserPreference, userPreference$ } from "../../state/preference";
import { tapSearch$, } from "../../state/search";
import { CardMaker } from "../CardMaker/CardMaker";
import { FloatWrapper } from "../FloatWrapper/FloatWrapper";


export const FloatCardMaker = () => {
  const [show, setShow] = useBehavior(showFloatCardMaker$, false);
  if (!show) {
    return null;
  }
  return <FloatWrapper onClose={() => setShow(false)} showMask>
    <CardMaker layoutMode={0} ></CardMaker>
  </FloatWrapper>
};
