import React, { useRef, useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { useContextMenu } from 'react-contexify';
import { DynamicMenu, setContextMenu } from '../../state/contextMenu';
import { EditOutlined, EllipsisOutlined, SearchOutlined } from '@ant-design/icons';

const MENU_ID = 'MENU_ID';

export const LazyInput = ({
  value,
  onChange,
  displayValueTo,
  modalTitle,
  onWordClick,
  menu,
  canEdit,
  showMenuOnClick,
  showEditBtn,
  showSearchBtn,
  onSearch,
}: {
  value: any;
  menu?: DynamicMenu;
  displayValueTo?: (value: any) => any;
  onChange?: (value: any) => void;
  onWordClick?: (word: string) => void;
  modalTitle?: string;
  canEdit?: boolean;
  showMenuOnClick: boolean;
  showEditBtn: boolean;
  showSearchBtn?: boolean;
  onSearch?: () => void;
}) => {
  const inputRef = useRef<any>();
  const [editing, setEditing] = useState(false);
  const content = displayValueTo && displayValueTo(value);
  if (canEdit === undefined) {
    canEdit = true;
  }
  const { show } = useContextMenu({
    id: MENU_ID,
  });
  const showContextMenu = (event: any) => {
    event.preventDefault();
    if (menu) {
      setContextMenu([
        ...menu,
        canEdit
          ? [
              {
                onClick: () => {
                  setEditing(true);
                },
                title: '修改',
              },
            ]
          : [],
      ]);
    } else if (canEdit) {
      setContextMenu([
        [
          {
            onClick: () => {
              setEditing(true);
            },
            title: '修改',
          },
        ],
      ]);
    }
    show(event, {
      props: {
        key: 'value',
      },
    });
  };
  console.log('subtitle content:', content);
  return (
    <>
      <div
        onContextMenu={showContextMenu}
        onClick={(e) => {
          if (showMenuOnClick) {
            showContextMenu(e);
          }
        }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          wordBreak: 'break-word',
          alignItems: 'center',
        }}
      >
       {showSearchBtn && <Button
          style={{
            color: "#ccc",
            fontSize: "20px",
            display: "flex",
            justifyContent: "center",
          }}
          type="text"
          onClick={() => {
            if (onSearch) {
              onSearch();
            }
          }}
        >
          <SearchOutlined />
        </Button>} 
        {content.split(/\s/).map((word: string, index: number) => {
          return (
            <span
              key={index}
              tabIndex={0}
              onKeyDown={() => {}}
              onClick={() => {
                if (onWordClick) {
                  onWordClick(word);
                }
              }}
              style={{ margin: '0 8px', cursor: 'pointer' }}
            >
              {word}
            </span>
          );
        })}
        {showEditBtn && <span style={{marginLeft: '12px', padding: '5px', color: "#ccc",}} onClick={showContextMenu}><EditOutlined /></span>}
      </div>
      {editing && canEdit ? (
        <Modal
          title={modalTitle}
          visible={editing}
          onOk={() => {
            console.log(
              'lazy input changed to value:',
              inputRef.current.input.value
            );
            onChange && onChange(inputRef.current.input.value);
            setEditing(false);
          }}
          onCancel={() => {
            setEditing(false);
            inputRef.current.input.value = value;
          }}
        >
          <Input ref={inputRef} autoFocus defaultValue={value}></Input>
        </Modal>
      ) : null}
    </>
  );
};
LazyInput.defaultProps = {
  displayValueTo: (value: any) => value,
  showMenuOnClick: false,
  showEditBtn: false,
  modalTitle: '修改',
};
