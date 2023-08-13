import { FilePdfFilled, FolderOutlined, LeftOutlined, SearchOutlined, VideoCameraFilled } from '@ant-design/icons';
import { Button, Input, Modal, Spin } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { loadDirChildren, searchFile } from '../../service/http/ResourceLoader';
import { addPalylist$ } from '../../state/playlist';
import styles from './ResourceLoader.module.css';

export const ResourceLoader = ({ visible, defaultDir, onClose, onOpenPDF, onOpenVideo }: {
  defaultDir: string;
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
  const [inputSearchValue, setInputSearchValue] = useState("");
  const searchBoxRef: any = useRef<any>();
  const [searchFiles, setSearchFiles] = useState([] as string[]);
  const [inSearching, setInSearching] = useState(false);

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
      const splittedDirs = defaultDir.split('/');
      const dirToOpen = splittedDirs.pop() || '';
      const currDir = splittedDirs.join('/');
      openFolder(currDir, dirToOpen);
    }
  }, [visible, defaultDir]);


  return <Modal
    bodyStyle={{
      background: 'black',
    }}
    closable={false}
    title={<div style={{ color: '#ccc', background: 'black', position: 'absolute', top: 0, left: 0, width: '100%', height: '84px', padding: '14px' }}>
      <Input
            prefix={<SearchOutlined />}
            ref={searchBoxRef}
            type="text"
            value={inputSearchValue}
            onChange={(e) => {
              setInputSearchValue(e.target.value);
            }}
            style={{
              color: "rgb(100, 100, 100)",
              fontSize: "15px",
              flexGrow: 1,
              height: '30px',
            }}
            onKeyDown={(e) => {
              const key = e.key.toLowerCase();
              if (key === "enter".toLowerCase()) {
                setInSearching(true);
                searchFile(inputSearchValue, ['pdf', 'mp4']).then((files) => {
                  setSearchFiles(files);
                }).catch((e) => {
                  console.log('搜索文件失败：', e);
                  setSearchFiles([]);
                }).finally(() => {
                setInSearching(false);

                });
              }
            }}
            placeholder="搜索文件"
          />
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
      }}> {dirname && <LeftOutlined /> } </Button>{dirname}</div>}
    visible={visible} footer={null} onCancel={onClose}>
      <div style={{marginTop: '30px'}}></div>
    {/* render search files */}
    {inSearching && <div style={{color: '#fff', display: 'flex', justifyContent: 'center', }}>
      <Spin></Spin>文件搜索中...
    </div>}
    {searchFiles.map((file) => {
      if (file.endsWith('pdf')) {
        return <div
        key={file}
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
            onOpenPDF(file);
          }
        }}
        onClick={() => onOpenPDF(file)}
      >
        <FilePdfFilled />
        <div style={{ marginLeft: '14px', wordBreak: 'break-all' }}>{file}</div>
      </div>
      }
      if (file.endsWith('mp4')) {
        return <div
        key={file}
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
            onOpenVideo(file);
          }
        }}
        onClick={() => onOpenVideo(file)}
      >
        <VideoCameraFilled />
        <div style={{ marginLeft: '14px', wordBreak: 'break-all' }}>{file}</div>
      </div>
      }
      return null;
    })}
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
            <div style={{ marginLeft: '14px', wordBreak: 'break-all' }}>{dir}</div>
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
            <div style={{ marginLeft: '14px', wordBreak: 'break-all' }}>{pdfFile}</div>
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
          addPalylist$.next({
            files: videos.map((videoFile) => {
              return currDir + '/' + videoFile;
            }),
            parentDir: currDir,
          });
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
            <div style={{ marginLeft: '14px', wordBreak: 'break-all' }}>{videoFile}</div>
          </div>
        );
      })}
    </div>
  </Modal>
};
