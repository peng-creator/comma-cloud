import React, { useRef, useState } from "react";
import { useObservable } from "../../state";
import { tapCache$ } from "../../state/search";

export const TapCache = () => {
  const [tapCache] = useObservable(tapCache$, "");
  if (tapCache === "") {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        // width: "100%",
        top: 0,
        left: 0,
        width: "100%",
        justifyContent: "center",
        zIndex: 5,
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: 30,
          textAlign: "center",
          color: "rgb(223, 182, 18)",
          backgroundColor: "#000",
          width: "100%",
        }}
      >
        <span>{tapCache}</span>
      </div>
    </div>
  );
};
