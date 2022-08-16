import { map, Observable, Subject, Subscription } from "rxjs";
import { tapSearch$, textSearch$ } from "../../state/search";
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
        onClose();
      }, 5000);
    }, 10000);
  };
  
  ws.onmessage = function (evt) 
  { 
    const msg = evt.data;
    if (msg === '__pong__') {
      clearTimeout(timeoutTimer);
      return;
    }
    onMessage(msg);
  };
    
  ws.onclose = function() { 
      console.log("websoket 连接已关闭..."); 
      clearInterval(pingTimer);
      onClose();
  };
}

type Message = {
  subject: string;
  content: string;
};

type OutputStreams = {
  [subject: string]: Subject<string>;
};

type InputStreams = {
  [subject: string]: Observable<string>;
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
              ws.send(JSON.stringify(msg));
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
}, {
  search: textSearch$,
}); // sync search



// export const search = (text: string) => {
//   ws.send(text);
// };