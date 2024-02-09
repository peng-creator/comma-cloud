import React, { useEffect, useState } from 'react';


export const FloatWrapper = ({children, onClose, showMask}: {children: React.ComponentElement<any, any>; onClose: () => void; showMask: boolean}) => {

  return <div style={{ zIndex: 1, position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', overflow: 'hidden', padding: '45px', background: showMask ? 'rgba(0,0,0,.8)' : 'none'}} onClick={() => onClose()}>
    <div style={showMask && {width: '100%', height: '100%'} || {}} onClick={(e) => {
      e.stopPropagation();
    }}>
      {children}
    </div>
  </div>
};
