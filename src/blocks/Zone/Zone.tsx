import React, { useEffect, useState } from 'react';
import { ZoneDefinition, ZoneType } from '../../type/Zone';
import { CardMaker } from '../CardMaker/CardMaker';
import { Dict } from '../Dict/Dict';
import { PDFView } from '../PDFView/PDFView';
import { Video } from '../Video/Video';
import styles from './Zone.module.css';
import { dragWindowEnd$, dragWindowStart$, isDraggingSplitBar$, toggleLayout$, zoneHighlightOutput$ } from "../../state/zone";
import { PDFViewer } from '../PDFViewer/PDFViewer';
import { RemoteController } from '../RemoteController/RemoteController';
import { StandaloneSubtitle } from '../StandaloneSubtitle/StandaloneSubtitle';
import { CardReviewer } from '../CardReviewer/CardReviewer';
import { message } from 'antd';

const ZoneMapping: { [key in ZoneType]: (...args: any[]) => JSX.Element | null} = {
  dict: Dict,
  pdf: PDFViewer,
  video: Video,
  cardMaker: CardMaker,
  subtitle: StandaloneSubtitle,
  remoteController: RemoteController,
  cardReviewer: CardReviewer,
};

export const Zone = ({difinition} : {difinition: ZoneDefinition}) => {
  const [showMask, setShowMask] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [layoutMode, setLayoutMode] = useState(0);

  useEffect(() => {
    const sp = toggleLayout$.subscribe({
      next(id) {
        if (id !== difinition.id) {
          return;
        }
        if (layoutMode === 1) {
          setLayoutMode(0);
        } else {
          setLayoutMode(1);
        }
        message.info('窗口布局已改变');
      }
    });
    return () => sp.unsubscribe();
  }, [difinition, layoutMode]);

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
  
  useEffect(() => {
    const sp = zoneHighlightOutput$.subscribe({
      next(zoneId: string) {
        console.log('zoneHighlightOutput$ zoneId:', zoneId)
        if (zoneId === difinition.id) {
          setHighlight(true);
          setTimeout(() => {
            setHighlight(false);
          }, 3000);
        }
      }
    });
    return () => sp.unsubscribe();
  }, [difinition]);

  const Component = ZoneMapping[difinition.type];

  if (Component) {
    return <div id={`zone-${difinition.id}`} style={{ position:'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: '20px'}}>
      {showMask && <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1,}}></div>}
      {highlight && <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, background: 'rgba(49, 106, 239, 0.6)'}}></div>}
      <Component {...difinition.data} zoneId={difinition.id} title={difinition.title} layoutMode={layoutMode} 
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flexGrow: 1,
      }}></Component>
    </div>
  };
  return null;
};
