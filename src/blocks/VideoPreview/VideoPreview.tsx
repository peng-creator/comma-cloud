import { Button, Modal, Collapse } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import styles from './VideoPreview.module.css';
import { VideoInfo } from '../../service/http/Video';
import { host } from '../../utils/host';
import { TvSeasonResponse } from 'moviedb-promise';

const { Panel } = Collapse;

export const getFullImageUrl = (url: string | undefined | null, width: number = 300, height: number = 450, rate = 1) => `http://${host}:8080/api/thirdpartyImage/${encodeURIComponent(`https://www.themoviedb.org/t/p/w${width * rate}_and_h${height * rate}_bestv2` + url)}`;

export const SeasonPreview = ({ season, onSeasonSelect, onCancel, onEpisodeSelect }: {
  season: TvSeasonResponse;
  onSeasonSelect: () => void;
  onEpisodeSelect: (episodeNumber?: number) => void;
  onCancel?: () => void;
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.focus();
    }
  }, [wrapperRef]);
  return <div ref={wrapperRef} style={{ flexGrow: 1, background: 'rgba(0, 0, 0, .5)', overflow: 'hidden', padding: '14px' }} tabIndex={0} onKeyDown={(e) => {
    const key = e.key.toLowerCase();
    if (key === "escape".toLowerCase()) {
      onCancel && onCancel();
    }
  }}>
    <div style={{ fontSize: '40px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ marginRight: '14px' }}>{season.name}</div>
      <div style={{ display: 'flex' }}>
        <div className={styles.btn} tabIndex={0} style={{ color: '#ccc', fontSize: '18px', marginRight: '14px' }} onClick={() => { onSeasonSelect() }} onKeyDown={(e) => {
          const key = e.key.toLowerCase();
          if (key === "enter".toLowerCase()) {
            onSeasonSelect();
          }
        }}>Select</div>
        {onCancel && <div className={styles.btn} tabIndex={0} style={{ color: '#ccc', fontSize: '18px' }} onClick={() => { onCancel() }} onKeyDown={(e) => {
          const key = e.key.toLowerCase();
          if (key === "enter".toLowerCase()) {
            onCancel();
          }
        }}>Cancel</div>}
      </div>
    </div>
    <div style={{ height: 'calc(100% - 50px)', overflowY: 'auto' }}>
      {season.episodes?.map((episode, i) => {
        return <div className={styles.seasonItem} tabIndex={0} key={i} style={{ padding: '15px' }} onClick={() => { onEpisodeSelect(episode.episode_number) }} onKeyDown={(e) => {
          const key = e.key.toLowerCase();
          if (key === "enter".toLowerCase()) {
            onEpisodeSelect(episode.episode_number);
          }
        }}>
          <div style={{ fontSize: '25px' }}>{episode.episode_number}. {episode.name} - <span style={{ fontSize: '25px', color: '#40e142' }}>{episode.vote_average?.toFixed(1)}</span></div>
          <div style={{ display: 'flex', padding: '14px', justifyContent: 'space-between' }} >
            <div style={{ marginLeft: '15px', fontSize: '20px', minWidth: '320px', padding: '14px' }}>
              {episode.overview}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src={getFullImageUrl(episode.still_path, 227, 127, 2)} alt="" />
            </div>
          </div>
        </div>
      })}</div>
  </div>
};

export const VideoPreview = ({
  videoInfo,
  onSeasonSelect,
  onClose,
}: {
  videoInfo: VideoInfo;
  onSeasonSelect: (focusedSeason: TvSeasonResponse, close: () => void) => void;
  onClose: () => void;
}) => {
  const [showEpisodeModal, setShowEpisodeModal] = useState(true);

  return <Modal
    width="95%"
    bodyStyle={{
      background: 'black',
    }}
    footer={null}
    open={showEpisodeModal} onCancel={() => {
      setShowEpisodeModal(false);
      onClose();
    }} style={{
    }}>
    <div style={{ color: '#ccc', height: 'calc(100vh - 250px)', display: 'flex' }}>
      <div style={{ width: '100%', background: 'rgba(0, 0, 0, .5)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} >
        <div style={{ display: 'flex' }}>
          <img width={'120px'} src={getFullImageUrl(videoInfo?.tvInfo?.poster_path)}></img>
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column-reverse' }}>
            <div><span style={{ fontSize: '14px', }}><i>{videoInfo?.tvInfo?.tagline}</i></span></div>
            <div><span style={{ fontSize: '14px', fontWeight: 'bold', }}>{videoInfo?.tvInfo?.genres?.map(({ name }) => name).join(', ')}</span></div>
            <div><span style={{ fontSize: '14px', }}>{videoInfo?.tvInfo?.first_air_date}  -  {videoInfo?.tvInfo?.last_air_date}</span></div>
            <div style={{ fontSize: '25px', fontWeight: 'bold', }}>{videoInfo?.tvInfo?.original_name} - <span style={{ color: '#40e142' }}>{videoInfo?.tvInfo?.vote_average?.toFixed(1)}</span></div>
          </div>
        </div>
        <div style={{ padding: '14px', marginBottom: '14px' }}>
          {videoInfo?.tvInfo?.overview}
        </div>
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          <Collapse accordion className='site-collapse-custom-collapse' defaultActiveKey={[]} style={{background: 'rgba(0, 0, 0, .3)',}} >
            {videoInfo?.tvInfo?.seasons?.map((season: any, i) => {
              const seasonDetail = (videoInfo?.seasonInfoList || []).find((seasonDetail) => {
                return seasonDetail.season_number === season.season_number;
              });
              return <Panel className='site-collapse-custom-panel'  showArrow={false} header={
                <div key={i} style={{ padding: '6px', display: 'flex', color: '#ccc' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img src={`${getFullImageUrl(season.poster_path)}`} width={'90px'} alt="" />
                  </div>
                  <div style={{ padding: '6px', flexGrow: 1, }}>
                    <div style={{ fontSize: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}> <span>{season.name}</span> <span style={{ fontSize: '25px', color: '#40e142' }}>{season.vote_average.toFixed(1)}</span></div>
                    <div></div>
                    <div>{season.overview || 'no overview'}</div>
                  </div>
                </div>
              }
                key={i}
              >
                {seasonDetail ? <SeasonPreview 
                  onEpisodeSelect={() => {}}
                  onSeasonSelect={() => {
                    onSeasonSelect(seasonDetail, () => setShowEpisodeModal(false));
                  }} 
                  season={seasonDetail}/> : 'no episodes information available.'}
              </Panel>
            })}
          </Collapse>
        </div>
      </div>
    </div>
  </Modal>
};
