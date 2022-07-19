import React, { useRef, useState } from 'react';
import { Icon, Viewer, Worker } from '@react-pdf-viewer/core';
import { Button, Empty } from 'antd';
import styles from './PDFView.module.css';

export const PDFView = ({data}: {data: {filePath: string}}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const file = data.filePath;
  const [documentLoaded, setDocumentLoaded] = useState(false);

  if (file === '') {
    return <Empty description="没有打开的pdf"></Empty>;
  }
  return (
    <div className={styles.pdfWrapper} ref={wrapperRef}>
      <Worker workerUrl="/assets/pdf.worker.min.js">
        <div
          style={{
            height: '750px',
            width: '900px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <Viewer
            fileUrl={file}
            onDocumentLoad={() => {
              setDocumentLoaded(true);
            }}
          />
        </div>
      </Worker>
    </div>
  );
};
