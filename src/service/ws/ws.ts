import { map, Observable, Subject, Subscription, throttleTime } from "rxjs";
import { addSubtitle$ } from "../../blocks/CardMaker/CardMaker";
import { remoteControlInput$, remoteControlOutput$ } from "../../state/remoteContol";
import { tapSearch$, textSearch$ } from "../../state/search";
import { addSubtitleInput$ } from "../../state/subtitle";
import { zoneHighlightInput$, zoneHighlightOutput$ } from "../../state/zone";
import { host } from "../../utils/host";

const newConnection = ({
  address,
  onClose,
  onOpen,
  onMessage,
}: {
  address: string; onOpen: (ws: WebSocket) => void; onClose: () => void; onMessage: (message: string) => void
}) => {
  const ws = new WebSocket(address);

  let pingTimer: any = null;
  let timeoutTimer: any = null;
  let closed = false;

  const close = () => {
    if (!closed) {
      closed = true;
      onClose();
    }
  }

  ws.onopen = function() {
      // Web Socket 已连接上，使用 send() 方法发送数据
    console.log('websoket 连接已建立');
    onOpen(ws);
    pingTimer = setInterval(() => {
      ws.send('__ping__');
      timeoutTimer = setTimeout(function () {
        ws.close();
        clearInterval(pingTimer);
        /// ---connection closed ///
        close();
      }, 5000);
    }, 10000);
  };
  
  ws.onmessage = (evt) => { 
    const msg = evt.data;
    if (msg === '__pong__') {
      clearTimeout(timeoutTimer);
      return;
    }
    onMessage(msg);
  };
    
  ws.onclose = () => { 
      console.log("websoket 连接已关闭..."); 
      clearInterval(pingTimer);
      close();
  };

  ws.onerror = (error) => {
    console.log('websoket 连接失败：', error);
  };
  
  return ws;
}

type Message = {
  subject: string;
  content: string;
};

type OutputStreams = {
  [subject: string]: Subject<any>;
};

type InputStreams = {
  [subject: string]: Observable<any>;
}

const openWebsocketStreaming = (address: string, inputStreams: InputStreams, outputStreams: OutputStreams) => {
  const startStreaming = () => {
    let sps: Subscription[] = [];
    console.log('startStreaming');
    newConnection({
      address,
      onOpen: (ws) => {
        sps = Object.keys(inputStreams).map(subject => {
          return inputStreams[subject].pipe(map((content) => {
            return {subject, content};
          }))
        })
        .map((stream) => {
          return stream.subscribe({
            next(msg) {
              console.log('send msg:', msg);
              try {
                ws.send(JSON.stringify(msg));
              } catch(e) {
                console.log('send msg failed:', e);
              }
            }
          })
        });
      },
      onClose: () => {
        console.log('onClose!');
        sps.forEach(sp => sp.unsubscribe());
        console.log('5s to reconnect');
        setTimeout(() => {
          startStreaming();
        }, 5000);
      },
      onMessage: (msg) => {
        const {content, subject} = JSON.parse(msg) as Message;
        const outputStream = outputStreams[subject];
        if (outputStream) {
          console.log('received msg content:', content);
          outputStream.next(content);
        }
      }
    });
  }
  startStreaming();
}


openWebsocketStreaming(`ws://${host}:8080`, {
  search: tapSearch$,
  zoneHighlight: zoneHighlightInput$,
  remoteControl: remoteControlInput$,
  addSubtitleToCard: addSubtitleInput$.pipe(throttleTime(1000)),
}, {
  search: textSearch$,
  zoneHighlight: zoneHighlightOutput$,
  remoteControl: remoteControlOutput$,
  addSubtitleToCard: addSubtitle$,
});
