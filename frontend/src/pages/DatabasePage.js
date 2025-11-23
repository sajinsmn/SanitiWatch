import React, { useState } from 'react';
import MongoDBViewer from '../components/database/MongoDBViewer';
import CloudinaryViewer from '../components/database/CloudinaryViewer';

const DatabasePage = () => {
  const [activeView, setActiveView] = useState('mongodb');

  return (
    <div style={{ padding: '1rem', minHeight: '100vh' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          color: '#fff',
          margin: 0
        }}>
          Database Management
        </h1>
        
        {/* View Toggle Buttons */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '0.5rem',
          padding: '0.25rem'
        }}>
          <button
            onClick={() => setActiveView('mongodb')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: activeView === 'mongodb' 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeView === 'mongodb' ? 600 : 400,
              transition: 'all 0.2s ease'
            }}
          >
            🗃️ MongoDB
          </button>
          <button
            onClick={() => setActiveView('cloudinary')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: activeView === 'cloudinary' 
                ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeView === 'cloudinary' ? 600 : 400,
              transition: 'all 0.2s ease'
            }}
          >
            ☁️ Cloudinary
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        minHeight: '600px'
      }}>
        {activeView === 'mongodb' ? (
          <MongoDBViewer />
        ) : (
          <CloudinaryViewer />
        )}
      </div>
    </div>
  );
};

export default DatabasePage;
