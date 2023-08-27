import React, { useEffect, useState } from 'react';
import { ZoneDefinition } from '../../type/Zone';
import { Zone } from '../Zone/Zone';
import { Icon } from '@blueprintjs/core';
import { Button } from 'antd';
import { useBehavior } from '../../state';
import { isFullscreen$ } from '../../state/system';


export const ZoneWrapper = ({difinition, onClose} : {difinition: ZoneDefinition; onClose: () => void;}) => {
  const [isFullscreen] = useBehavior(isFullscreen$, false);

  return <div style={{ zIndex: 1, position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', overflow: 'hidden'}}>
    {!isFullscreen && <div style={{width: '100%', height: '35px',  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: '#000', borderBottom: '0.5px solid #ddd', padding: '0 5px'}}>
      <div style={{flexGrow: 1,}}>{difinition.title}</div>
      <Button type="text" style={{paddingLeft: '14px', paddingRight: '14px'}} onClick={() => onClose()}>
        <Icon style={{ position: 'relative', top: '-1px' }} icon="cross" size={18} color="#ccc" />
      </Button>
    </div>}
    <div style={{width: '100%', height: isFullscreen ? '100%' : 'calc(100% - 35px)', background: '#000', padding: isFullscreen ? '0px' : '5px'}}>
      <Zone difinition={difinition}></Zone>
    </div>
  </div>
};
