import React from 'react';

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle = {
  background: '#1f2937',
  color: 'white',
  borderRadius: '0.75rem',
  padding: '1.25rem',
  width: '100%',
  maxWidth: '520px',
  border: '1px solid #4b5563',
  boxShadow: '0 10px 25px rgba(0,0,0,0.4)'
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.75rem'
};

const titleStyle = { margin: 0, fontSize: '1.125rem', fontWeight: 600 };

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#9ca3af',
  fontSize: '1.25rem',
  cursor: 'pointer'
};

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}> 
          <h3 style={titleStyle}>{title}</h3>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
