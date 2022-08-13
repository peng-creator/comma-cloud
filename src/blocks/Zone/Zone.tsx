import React, { useEffect, useState } from 'react';
import { ZoneDefinition, ZoneType } from '../../type/Zone';
import { CardMaker } from '../CardMaker/CardMaker';
import { Dict } from '../Dict/Dict';
import { PDFView } from '../PDFView/PDFView';
import { Video } from '../Video/Video';
import styles from './Zone.module.css';
import { dragWindowEnd$, dragWindowStart$, isDraggingSplitBar$ } from "../../state/zone";
import { PDFViewer } from '../PDFViewer/PDFViewer';

const ZoneMapping: { [key in ZoneType]: (...args: any[]) => JSX.Element | null} = {
  dict: Dict,
  pdf: PDFViewer,
  video: Video,
  cardMaker: CardMaker,
};

export const Zone = ({difinition} : {difinition: ZoneDefinition}) => {
  const [showMask, setShowMask] = useState(false);

  useEffect(() => {
    const sp1 = isDraggingSplitBar$.subscribe({
      next(isDragging) {
        setShowMask(isDragging);
      },
    });
    const sp2 = dragWindowStart$.subscribe({
      next() {
        setShowMask(true);
      }
    });
    const sp3 = dragWindowEnd$.subscribe({
      next() {
        // setShowMask(false);
      }
    });
    return () => {
      sp1.unsubscribe();
      sp2.unsubscribe();
      sp3.unsubscribe();
    }
  }, []);
  
  const Component = ZoneMapping[difinition.type];

  if (Component) {
    return <div id={`zone-${difinition.id}`} style={{ position:'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '0 14px'}}>
      {showMask && <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1}}></div>}
      <Component {...difinition.data} style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flexGrow: 1,
      }}></Component>
    </div>
  };
  return null;
};
