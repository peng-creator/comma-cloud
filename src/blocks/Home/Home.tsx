import { Button, Modal, } from 'antd';
import React, { useEffect, useState } from 'react';
import { CollectedSeason, VideoInfo, getGenres, getSeasonsByGenre } from '../../service/http/Video';
import { SeasonPreview, VideoPreview, getFullImageUrl } from '../VideoPreview/VideoPreview';
import styles from './Home.module.css';
import { TvSeasonResponse } from 'moviedb-promise/dist/request-types';
import { loadDirChildren } from '../../service/http/ResourceLoader';
import { playSubtitle$ } from '../../state/video';
import { BehaviorSubject } from 'rxjs';
import { useBehavior } from '../../state';
import { groupBy } from 'lodash';
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-cards';
// import required modules
import { EffectCards, Keyboard, Pagination, Navigation } from 'swiper/modules';

type GenreSeasons = { genre: string; tvShows: { name: string; seasons: CollectedSeason[] }[] };

const genreSeasons$ = new BehaviorSubject<GenreSeasons[]>([]);
const focusedSeason$ = new BehaviorSubject<CollectedSeason | null>(null);

const HOME_SWIPER_CACHE: any = {

};

export const Home = () => {
  const [genreSeasons, setGenreSeasons] = useBehavior(genreSeasons$, []);
  const [popUpSeasons, setPopUpSeasons] = useState([] as CollectedSeason[]);
  const [focusedSeason, setFocusedSeason] = useBehavior(focusedSeason$, null);

  useEffect(() => {
    getGenres().then(async (genres) => {
      const genreSeasons = [] as GenreSeasons[];
      for (const genre of genres.sort()) {
        await getSeasonsByGenre(genre).then((seasons) => {
          const groupedSeasons = groupBy(seasons, (season) => {
            return season.videoInfo.tvInfo?.original_name;
          });
          genreSeasons.push({
            genre,
            tvShows: Object.keys(groupedSeasons).map((name) => {
              return {
                name,
                seasons: groupedSeasons[name]
              }
            }),
          });
          setGenreSeasons([...genreSeasons].sort(({ genre: genreA }, { genre: genreB }) => genreA > genreB ? 1 : -1));
        });
      }
    })
  }, []);

  return <div style={{ padding: '14px', height: '100%', overflow: 'hidden' }}>
    {focusedSeason === null && <div style={{ height: '100%', overflowY: 'auto', padding: '14px' }}>
      {genreSeasons.map(({ genre, tvShows }) => {
        const tvShowsMapped = tvShows.map(({ name, seasons }) => {
          return {
            name,
            image: seasons[0].videoInfo.tvInfo?.poster_path,
            seasons,
          }
        })
        return <div key={genre} style={{ width: '100%', overflowX: 'hidden' }}>
          <div style={{ fontSize: '40px', fontWeight: 'bold' }}>{genre}</div>
          <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', display: 'flex' }}>
            {tvShowsMapped.map(({ name, image, seasons }, i) => {
              const SwiperAny: any = Swiper;
              if (seasons.length === 1) {
                const collectedSeason = seasons[0];
                const { seasonInfo, videoInfo } = collectedSeason;
                return <div onClick={() => {
                  setFocusedSeason(collectedSeason);
                }} onKeyDown={(e) => {
                  const key = e.key.toLowerCase();
                  if (key === "enter".toLowerCase()) {
                    setFocusedSeason(collectedSeason);
                  }
                }}
                className={styles.seasonItem} tabIndex={0} 
                   key={`${seasonInfo.id} - ${seasonInfo.name}`} style={{
                    margin: '0 14px',
                    borderRadius: '5px',
                    height: '100%',
                    width: '310px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '30px'
                  }}>
                  <img style={{ width: '250px', borderRadius: '5px' }} src={getFullImageUrl(seasonInfo.poster_path || '')} alt="" />
                  <div style={{ fontSize: '18px', background: 'rgba(0,0,0,.9)', textAlign: 'center' }}>{videoInfo?.tvInfo?.original_name} {seasonInfo.name}</div>
                </div>
              }
              const swiperCacheKey = genre + name + i;
              return <div key={name + i} style={{minWidth: '360px', marginRight: '15px', paddingRight: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '5px', }} className={styles.seasonItem} tabIndex={0}
              onKeyDown={(e) => {
                const key = e.key.toLowerCase();
                let innerSwiper: any = HOME_SWIPER_CACHE[swiperCacheKey];
                console.log('on key down:', key);
                if (key === "h".toLowerCase()) {
                  innerSwiper.slidePrev();
                }
                if (key === "l".toLowerCase()) {
                  innerSwiper.slideNext();
                }
                if (key === 'enter'.toLowerCase()) {
                  const index = innerSwiper.realIndex;
                  console.log('open index:', index);
                  console.log('open season:', seasons[index]);
                  setFocusedSeason(seasons[index]);
                }
              }}
              >
                <div style={{width: '250px' }}>
                <SwiperAny
              effect='cards'
              grabCursor={true}
              modules={[EffectCards, ]}
              className="mySwiper"
              onSwiper={(s: any) => {
                HOME_SWIPER_CACHE[swiperCacheKey] = s;
              }}
            >
              {
                seasons.map((collectedSeason) => {
                  const { seasonInfo, videoInfo } = collectedSeason;
                  return <SwiperSlide key={collectedSeason.seasonDir}><div onClick={() => {
                    setFocusedSeason(collectedSeason);
                  }} onKeyDown={(e) => {
                    const key = e.key.toLowerCase();
                    if (key === "enter".toLowerCase()) {
                      setFocusedSeason(collectedSeason);
                    }
                  }}
                     key={`${seasonInfo.id} - ${seasonInfo.name}`} style={{
                      // margin: '14px',
                      borderRadius: '5px',
                      width: '250px',
                      display: 'flex',
                      flexDirection: 'column',

                    }}>
                    <img style={{ width: '250px', borderRadius: '5px' }} src={getFullImageUrl(seasonInfo.poster_path || '')} alt="" />
                    <div style={{ fontSize: '18px', background: 'rgba(0,0,0,.9)', textAlign: 'center' }}>{videoInfo?.tvInfo?.original_name} {seasonInfo.name}</div>
                  </div></SwiperSlide>

                  return <div onClick={() => {
                    // setFocusedSeason(collectedSeason);
                    setPopUpSeasons(seasons);
                  }} onKeyDown={(e) => {
                    const key = e.key.toLowerCase();
                    if (key === "enter".toLowerCase()) {
                      // setFocusedSeason(collectedSeason);
                      setPopUpSeasons(seasons);
                    }
                  }}
                    className={styles.seasonItem} key={name + i} tabIndex={0} style={{
                      margin: '14px',
                      borderRadius: '5px',
                      width: '220px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}>
                    <img style={{ width: '220px' }} src={getFullImageUrl(image || '')} alt="" />
                    <div style={{ fontSize: '20px', textAlign: 'center' }}>{name}</div>
                  </div>
                })
              }

            </SwiperAny>
            </div>
            </div>
              
              return;
            })}
          </div>
        </div>
      })}
    </div>}
    {/* {
      popUpSeasons.length > 0 && <div style={{ borderRadius: '12px', height: '100%', overflow: 'hidden' }}>
        {popUpSeasons.map((collectedSeason) => {
          const { seasonInfo, videoInfo } = collectedSeason;
          return <div onClick={() => {
            setFocusedSeason(collectedSeason);
          }} onKeyDown={(e) => {
            const key = e.key.toLowerCase();
            if (key === "enter".toLowerCase()) {
              setFocusedSeason(collectedSeason);
            }
          }}
            className={styles.seasonItem} key={`${seasonInfo.id} - ${seasonInfo.name}`} tabIndex={0} style={{
              margin: '14px',
              borderRadius: '5px',
              width: '220px',
              display: 'flex',
              flexDirection: 'column',

            }}>
            <img style={{ width: '220px' }} src={getFullImageUrl(seasonInfo.poster_path || '')} alt="" />
            <div style={{ fontSize: '20px' }}>{videoInfo?.tvInfo?.original_name} {seasonInfo.name}</div>
          </div>;
        })}
      </div>
    } */}
    {focusedSeason && <div style={{ borderRadius: '12px', height: '100%', overflow: 'hidden' }}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <SeasonPreview
          onCancel={() => setFocusedSeason(null)}
          onEpisodeSelect={async (episodeNumber) => {
            const { videos } = await loadDirChildren(focusedSeason.seasonDir);
            console.log('videos:', videos);
            if (videos.length > 0) {
              if (!episodeNumber) {
                playSubtitle$.next({ file: `${focusedSeason.seasonDir}/${videos[0]}`, start: 0, end: 0, subtitles: [] });
              } else {
                playSubtitle$.next({ file: `${focusedSeason.seasonDir}/${videos[episodeNumber - 1]}`, start: 0, end: 0, subtitles: [] });
              }
            }
          }}
          onSeasonSelect={async () => {
            const { videos } = await loadDirChildren(focusedSeason.seasonDir);
            console.log('videos:', videos);
            if (videos.length > 0) {
              playSubtitle$.next({ file: `${focusedSeason.seasonDir}/${videos[0]}`, start: 0, end: 0, subtitles: [] });
            }
          }} season={focusedSeason.seasonInfo}></SeasonPreview>
      </div>
    </div>}
  </div>
};
