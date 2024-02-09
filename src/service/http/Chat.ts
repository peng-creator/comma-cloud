// import axios from 'axios';

// const instance = axios.create({
//   baseURL: `http://${host}:8000/v1/chat/completions`,
//   timeout: 15000,
//   // headers: {'X-Custom-Header': 'foobar'}
// });
// instance.interceptors.request.use((config) => {
//   return config;
// }, (error) => {
//   console.log('on request error:', error);
//   return Promise.reject(error);
// });

// export const 

import { host } from '../../utils/host';
import { ajax } from 'rxjs/ajax';
import { map, catchError, of, tap, Subject, scan } from 'rxjs';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { axiosInstancePromise } from '.';

type MessageHistory = {
    role: "assistant" | "user";
    content: string;
};

export const askAI = (question: string, history: MessageHistory[] = []) => {
    const stream = new Subject();
    fetchEventSource(`http://${host}:8080/api/askAI`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            stream: true,
            messages: [
                ...history,
                {
                    role: 'user',
                    content: question,
                }
            ]
        }),
        // signal: ctrl.signal,
        onmessage(msg) {
            console.log('msg:', msg);
            if (msg.data) {
                const data = JSON.parse(msg.data);
                const content = data?.result || '';
                if (content) {
                    stream.next(content);
                }
            }
        },
        onclose() {
            // if the server closes the connection unexpectedly, retry:
            stream.complete();
        },
        onerror(err) {
            stream.error(err);
        }
    });
    return stream.pipe(
        scan((acc, curr) => {
            return acc + curr;
        }, ''),
    );
};
