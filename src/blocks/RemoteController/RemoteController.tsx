import { Button, Input, message } from "antd";
import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Virtuoso } from "react-virtuoso";
import { BehaviorSubject } from "rxjs";
import { getZones } from "../../service/http/Zone";
import { remoteControlInput$, remoteControlOutput$ } from "../../state/remoteContol";
import { zoneHighlightInput$, zoneHighlightOutput$ } from "../../state/zone";
import { Subtitle } from "../../type/Subtitle";
import { ZoneDefinition } from "../../type/Zone";
import { SubtitleComponent } from "../Subtitle/Subtitle";

export const RemoteController = ({
  style,
  title,
  layoutMode,
}: {
  style: CSSProperties;
  title: string;
  layoutMode: number;
}) => {
  const [zone, setZone] = useState<ZoneDefinition | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [zones, setZones] = useState<ZoneDefinition[]>([]);
  const [subtitles$, setSubtitles$] = useState(new BehaviorSubject<Subtitle[]>([]));
  const [loopingSubtitle$, setLoopingSubtitle$] = useState(new BehaviorSubject<Subtitle | null>(null));
  const [scrollToIndex$, setScrollToIndex$] = useState(new BehaviorSubject<number>(-1));
  const [isPlaying$] = useState(new BehaviorSubject(false));

  useEffect(() => {
    if (!zone) {
      return;
    }
    remoteControlInput$.next({
      toZoneId: zone.id,
      action: 'startControl',
    });
    const sp = remoteControlOutput$.subscribe({
      next({ toZoneId, action, data, }) {
        console.log('remote controller got remoteControlOutput, toZoneId:', toZoneId, 'action:', action, 'data:', data);
        if (toZoneId !== zone?.id) {
          console.log('remote controller got remoteControlOutput, not selected zone!');
          return;
        }
        if (action === 'setSubtitles') {
          console.log('remote controller got remoteControlOutput, nextSubtitles:', data.subtitles);
          subtitles$.next(data.subtitles || []);
        }
        if (action === 'scrollToIndex') {
          scrollToIndex$.next(data.nextScrollToIndex);
        }
        if (action === 'loopingSubtitle') {
          console.log('remote controller got remoteControlOutput, loopingSubtitle:', data.subtitle);
          loopingSubtitle$.next(data.subtitle);
        }
        if (action === 'playingChange') {
          isPlaying$.next(data.playing);
        }
      },
    });
    return () => sp.unsubscribe();
  }, [loopingSubtitle$, isPlaying$, scrollToIndex$, subtitles$, zone]);

  return <div
    style={{
      ...style,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}
  >
    <Input
      style={{ width: "100%", ...( layoutMode === 0 ? {} : {'display' : 'none'}) }}
      placeholder="选择窗口"
      value={zone?.title || ''}
      onChange={(e) => {

      }}
      contentEditable={false}
      onFocus={() => {
        const hide = message.loading('加载窗口中...', 0);
        getZones().then(zones => {
          console.log('getZones:', zones);
          setZones(zones.filter((zone) => {
            return zone.type === 'video';
          }));
          hide();
          setSelecting(true);
        })
      }}
    />
    {selecting && (
      <Virtuoso
        style={{ height: "calc(100% - 32px)", width: '100%' }}
        totalCount={zones.length}
        itemContent={(index) => {
          const zone = zones[index];
          return (
            <div
              style={{ padding: "14px", borderBottom: ".5px solid #ddd" }}
              onClick={() => {
                setZone(zone);
                setSelecting(false);
              }}
            >
              <Button onClick={(e) => {
                e.stopPropagation();
                zoneHighlightInput$.next(zone.id);
                zoneHighlightOutput$.next(zone.id);
              }}>高亮</Button> {zone.title}
            </div>
          );
        }}
      />
    )}
    {
      zone && zone.type === 'video' && <SubtitleComponent
        layoutMode={layoutMode}
        filePath={zone.data.filePath}
        title={zone.title}
        subtitles$={subtitles$}
        seekTo={(time) => {
          remoteControlInput$.next({
            toZoneId: zone.id,
            action: 'seekTime',
            data: {
              time,
            }
          });
        }}
        isPlaying$={isPlaying$}
        loopingSubtitle$={loopingSubtitle$}
        scrollToIndex$={scrollToIndex$}
        onSubtitlesChange={(nextSubtitles: Subtitle[]) => {
          remoteControlInput$.next({
            toZoneId: zone.id,
            action: 'setSubtitles',
            data: {
              nextSubtitles,
            }
          });
        }}
        onScrollToIndexChange={(nextScrollToIndex: number) => {
          remoteControlInput$.next({
            toZoneId: zone.id,
            action: 'scrollToIndex',
            data: {
              nextScrollToIndex,
            }
          });
        }}
        onLoopingSubtitleChange={(subtitle: Subtitle | null) => {
          console.log('remote controller send loopingSubtitle:', subtitle);
          remoteControlInput$.next({
            toZoneId: zone.id,
            action: 'loopingSubtitle',
            data: {
              subtitle,
            }
          });
          loopingSubtitle$.next(subtitle);
        }}
        onPlayingChange={(playing: boolean) => {
          remoteControlInput$.next({
            toZoneId: zone.id,
            action: 'playingChange',
            data: {
              playing,
            }
          });
          isPlaying$.next(playing);
        }}
      ></SubtitleComponent>
    }
  </div>
};
