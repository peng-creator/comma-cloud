import React,{ CSSProperties, useEffect, useState } from "react";
import { Subject } from "rxjs";
import { search$ } from "../../state/search";

type DictData = {

};

export const focusSearch$ = new Subject<void>();

export const Dict = ({
  style,
  name,
  template,
}: {
  style?: CSSProperties;
  name: string;
  template: string;
}) => {
  const [searchContent, setSearchContent] = useState("");

  useEffect(() => {
    const sp = search$.subscribe({
      next(s) {
        setSearchContent(s);
      },
    })
    return () => {
      sp.unsubscribe();
    };
  }, []);

  useEffect(() => {});

  return (
    <div
      style={{
        position: "relative",
        ...(style || {}),
      }}
    >
      {searchContent && <iframe
        title={name}
        src={template.replace("{}", searchContent)}
        frameBorder="0"
        style={{ flexGrow: 1 }}
      ></iframe>}
      {
        searchContent ? null : <div>开始您的搜索</div>
      }
    </div>
  );
};
