import { Button, Modal, Skeleton } from "antd";
import React,{ CSSProperties, useEffect, useState } from "react";
import { skip, startWith } from "rxjs";
import { useBehavior } from "../../state";
import { showFloatCardMaker$ } from "../../state/cardMaker";
import { openFloatPDFNote$ } from "../../state/pdf";
import { UserPreference, userPreference$ } from "../../state/preference";
import { tapSearch$, } from "../../state/search";
import { PDFViewer } from "../PDFViewer/PDFViewer";


export const FloatPDF = ({
  style,
}: {
  style?: CSSProperties;
}) => {
  const [pdfNote, setPdfNote] = useBehavior(openFloatPDFNote$, null);

  if (pdfNote === null) {
    return null;
  }
  console.log('render openFloatPDFNote:', pdfNote);
  const show = pdfNote !== null;
  return (
<Modal
    width="calc(100% - 40px)"
    style={{
        height: '95%',
        top: '50%',
        transform: 'translate(0, -50%)',
        minHeight: '550px',
    }}
    modalRender={() => {
        return <div style={{
            background: '#000',
            height: '100%',
            width: '100%',
            borderRadius: '14px',
            pointerEvents: 'auto',
            overflow: 'hidden'
        }}>
          <PDFViewer filePath={pdfNote.file} note={pdfNote}></PDFViewer>
        </div>;
    }}
    footer={null}
    closable={false}
    visible={show}
    onCancel={() => { setPdfNote(null); }}
    onOk={() => { setPdfNote(null); }}
    />
  );
};
