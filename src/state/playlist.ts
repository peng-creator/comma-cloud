import { Subject,  } from "rxjs";
import { loadDirChildren } from "../service/http/ResourceLoader";

type Playlist = {
    files: string[];
    parentDir: string;
}

const playlistIndexes: {
    [parentDir: string]: Playlist;
} = {};

export const addPalylist$ = new Subject<Playlist>();

addPalylist$.subscribe({
    next(palylist) {
        playlistIndexes[palylist.parentDir] = palylist;
    },
});

export const getPlaylistByPlayingVideo = async (file: string) => {
    const dirs = file.split('/');
    dirs.pop();
    const parentDir = dirs.join('/');
    const playlist = playlistIndexes[parentDir];
    if(!playlist) {
        try {
            const videos = await loadDirChildren(parentDir).then(({ videos }) => {
                return (videos as string[]).map((v) => {
                    return `${parentDir}/${v}`;
                });
            });
            playlistIndexes[parentDir] = {
                files: videos,
                parentDir,
            };
            return videos;
        } catch(e) {
            return [] as string[];
        }
    }
    return [...playlist.files];
}
