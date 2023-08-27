import React, { useEffect, useState } from 'react';


export const FloatWrapper = ({children, onClose}: {children: React.ComponentElement<any, any>; onClose: () => void;}) => {

  return <div style={{ zIndex: 1, position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', overflow: 'hidden', padding: '45px', background: 'rgba(0,0,0,.8)'}} onClick={() => onClose()}>
    <div style={{width: '100%', height: '100%'}} onClick={(e) => {
      e.stopPropagation();
    }}>
      {children}
    </div>
  </div>
};
