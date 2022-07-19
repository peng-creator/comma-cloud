import React, { CSSProperties, memo, useEffect, useRef, useState } from 'react';
import WebViewer, { WebViewerInstance } from '@pdftron/webviewer';

export const PDF = memo(({data, style} : {data: {filePath: string}; style: CSSProperties}) => {
  const {filePath} = data;
  const ref = useRef<HTMLDivElement | null>(null);

  const instanceRef = useRef<WebViewerInstance | null>(null);

  const [inited, setInited] = useState(false);

  console.log('filePath:', filePath);

  useEffect(() => {
    if (ref.current !== null) {
      WebViewer(
        {
          path: 'pdftron', // point to where the files you copied are served from
          initialDoc: filePath,
        },
        ref.current
      ).then((i) => {
        instanceRef.current = i;
        setInited(true);
      });
    }
  }, [ref, filePath]);

  return <div style={style}>
    <div style={{ width: '1000px', height: '100%' }} ref={ref}></div>
  </div>;
});