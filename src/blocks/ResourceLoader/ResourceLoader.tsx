import { FilePdfFilled, FolderOutlined, LeftOutlined, VideoCameraFilled } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import React, { useEffect, useState } from 'react';
import { loadDirChildren } from '../../service/http/ResourceLoader';
import styles from './ResourceLoader.module.css';

export const ResourceLoader = ({ visible, onClose, onOpenPDF, onOpenVideo }: {
  visible: boolean;
  onClose: () => void;
  onOpenPDF: (filePath: string) => void;
  onOpenVideo: (filePath: string) => void;
}) => {
  const [currDir, setCurrDir] = useState('/');
  const [dirname, setDirname] = useState('/');
  const [dirs, setDirs] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

  const openFolder = (currDir: string, dir: string) => {
    if (currDir.endsWith('/')) {
      currDir = currDir.slice(0, currDir.length - 1);
    }
    if (dir.startsWith('/')) {
      dir.slice(1);
    }
    const dirToOpen = currDir + '/' + dir;
    loadDirChildren(dirToOpen).then(({ dirs, videos, pdfs }) => {
      setDirs(dirs);
      setPdfs(pdfs);
      setVideos(videos);
      setCurrDir(dirToOpen);
      setDirname(dir);
    });
  }

  useEffect(() => {
    if (visible) {
      openFolder('', '');
    }
  }, [visible]);


  return <Modal
    bodyStyle={{
      background: 'black',
    }}
    closable={false}
    title={<div style={{ color: '#ccc', background: 'black', position: 'absolute', top: 0, left: 0, width: '100%', height: '54px', padding: '14px' }}>
      <Button 
      type='text' 
      disabled={!dirname}
      style={{color: '#ccc'}}
      onClick={() => {
        const dirs = currDir.split('/');
        const toOpen = dirs.slice(0, dirs.length - 1).join('/');
        console.log('toOpen:', toOpen);
        if (toOpen === '') {
          openFolder('', '');
        } else {
          const parentDir = dirs.slice(0, dirs.length - 2).join('/');
          console.log('parentDir:', parentDir);
          openFolder(parentDir, dirs[dirs.length - 2]);
        }
      }}> <LeftOutlined /> </Button>{dirname}</div>}
    visible={visible} footer={null} onCancel={onClose}>
    {/* render dirs */}
    {dirs.length > 0 &&
      dirs.map((dir, index) => {
        return (
          <div
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                openFolder(currDir, dir);
              }
            }}
            key={`dir${dir}`}
            onClick={() => openFolder(currDir, dir)}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#ccc',
              cursor: 'pointer',
              marginTop: '10px',
            }}
          >
            <FolderOutlined />
            <div style={{ marginLeft: '14px' }}>{dir}</div>
          </div>
        );
      })}
    {/* render pdfs */}
    <div style={{ flexGrow: 1 }}>
      {pdfs.map((pdfFile, index) => {
        const openPdf = () => {
          const relativePath = currDir + '/' + pdfFile;
          onOpenPDF(relativePath);
        };
        return (
          <div
            key={pdfFile}
            style={{
              color: '#ccc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginTop: '10px',
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                openPdf();
              }
            }}
            onClick={openPdf}
          >
            <FilePdfFilled />
            <div style={{ marginLeft: '14px' }}>{pdfFile}</div>
          </div>
        );
      })}
    </div>
    {/* render videos */}
    <div style={{ flexGrow: 1 }}>
      {videos.map((videoFile, index) => {
        const openVideo = () => {
          const filePath = currDir + '/' + videoFile;
          onOpenVideo(filePath);
        };
        return (
          <div
            key={videoFile}
            style={{
              color: '#ccc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginTop: '10px',
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                openVideo();
              }
            }}
            onClick={openVideo}
          >
            <VideoCameraFilled />
            <div style={{ marginLeft: '14px' }}>{videoFile}</div>
          </div>
        );
      })}
    </div>
  </Modal>
};
