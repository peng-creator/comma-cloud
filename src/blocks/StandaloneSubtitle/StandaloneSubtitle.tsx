import React, { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { fetchStandaloneProps$, StandaloneSubtitleProps, standaloneSubtitleProps$, subtitleReadyToFeedStandaloneProps$ } from "../../state/subtitle";
import { SubtitleComponent } from "../Subtitle/Subtitle";

export const StandaloneSubtitle = ({
  fromZoneId,
  layoutMode,
  style
}: {
  fromZoneId: string;
  style?: CSSProperties;
  layoutMode: number;
}) => {
  console.log('entring StandaloneSubtitle component, fromZoneId:', fromZoneId);
  const [standaloneProps, setStandaloneProps] = useState<StandaloneSubtitleProps | null>(null);

  useEffect(() => {
    console.log('in StandaloneSubtitle component, subscribe standaloneSubtitleProps$');
    const sp = standaloneSubtitleProps$.subscribe({
      next(standaloneSubtitleProps) {
        console.log('in StandaloneSubtitle component, receive standaloneSubtitleProps:', standaloneSubtitleProps);
        const { fromZoneId: _fromZoneId } = standaloneSubtitleProps;
        if (fromZoneId === _fromZoneId) {
          setStandaloneProps(standaloneSubtitleProps);
          sp.unsubscribe();
        }
      }
    });
    const sp1 = subtitleReadyToFeedStandaloneProps$.subscribe({
      next(zoneId) {
        if (zoneId === fromZoneId) {
          fetchStandaloneProps$.next({fromZoneId});
          sp1.unsubscribe();
        }
      }
    });
    return () => {
      sp.unsubscribe();
      sp1.unsubscribe();
    };
  }, [fromZoneId]);

  if (standaloneProps === null) {
    return null;
  }

  return <div style={{...(style || {}),}}>
      <SubtitleComponent
        {...standaloneProps}  
        layoutMode={layoutMode}    
      ></SubtitleComponent>
    </div>
};
