import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const CloudinaryViewer = () => {
  const [files, setFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]); // Store all files for folder extraction
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at', 'name', 'size'
  const [folders, setFolders] = useState(new Set());
  const [currentFolder, setCurrentFolder] = useState(null); // null for root, string for folder name
  const [breadcrumb, setBreadcrumb] = useState([{ name: 'SanitiWatch', path: null }]);

  // Fetch files from Cloudinary
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/database/cloudinary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const fetchedFiles = response.data.resources || [];
      
      // Store all files for folder extraction
      setAllFiles(fetchedFiles);
      
      // Extract folders from file paths (use all files for folder extraction)
      const folderSet = new Set();
      fetchedFiles.forEach(file => {
        const pathParts = file.public_id.split('/');
        if (pathParts.length > 1) {
          folderSet.add(pathParts[0]);
        }
      });
      setFolders(folderSet);
      
      // Filter files based on current folder for display
      let filteredFiles = fetchedFiles;
      if (currentFolder) {
        filteredFiles = fetchedFiles.filter(file => {
          const relativePath = file.public_id.replace(currentFolder + '/', '');
          const pathParts = relativePath.split('/');
          // Only show files directly in current folder (no subfolders)
          return pathParts.length === 1;
        });
      } else {
        // Show only root files (no folder) - exclude sanitiwatch folder files
        filteredFiles = fetchedFiles.filter(file => 
          !file.public_id.includes('/')
        );
      }
      
      // Sort files
      const sortedFiles = [...filteredFiles].sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.public_id.localeCompare(b.public_id);
          case 'size':
            return b.bytes - a.bytes;
          case 'created_at':
          default:
            return new Date(b.created_at) - new Date(a.created_at);
        }
      });
      
      setFiles(sortedFiles);
    } catch (error) {
      console.error('Error fetching Cloudinary files:', error);
      alert('Error fetching Cloudinary files: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [sortBy, currentFolder]);

  // Delete file
  const deleteFile = useCallback(async (publicId) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/database/cloudinary/${encodeURIComponent(publicId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchFiles();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file: ' + (error.response?.data?.message || error.message));
    }
  }, [fetchFiles]);

  // Navigate to folder
  const navigateToFolder = useCallback((folderName) => {
    if (folderName === null) {
      // Navigate to root
      setCurrentFolder(null);
      setBreadcrumb([{ name: 'SanitiWatch', path: null }]);
    } else {
      // Navigate to specific folder
      setCurrentFolder(folderName);
      setBreadcrumb(prev => {
        const existingIndex = prev.findIndex(item => item.path === folderName);
        if (existingIndex >= 0) {
          // Folder already in breadcrumb, truncate to that point
          return prev.slice(0, existingIndex + 1);
        } else {
          // Add new folder to breadcrumb - extract just the folder name from the path
          const displayName = folderName.split('/').pop();
          return [...prev, { name: displayName, path: folderName }];
        }
      });
    }
  }, []);

  // Get subfolders for current folder
  const getSubfolders = useCallback(() => {
    // Use all fetched files for folder extraction, not just filtered files
    const allFilesForFolders = allFiles;
    
    if (currentFolder) {
      // If in a folder (like sanitiwatch), show only immediate subfolders and files
      const subfolders = new Set();
      const fileNames = new Set(); // Track files directly in this folder
      
      allFilesForFolders.forEach(file => {
        // Check if file is in current folder or its subfolders
        if (file.public_id.startsWith(currentFolder + '/')) {
          const relativePath = file.public_id.replace(currentFolder + '/', '');
          const pathParts = relativePath.split('/');
          
          if (pathParts.length === 1) {
            // File is directly in current folder
            fileNames.add(pathParts[0]);
          } else if (pathParts.length > 1) {
            // This is a nested folder - add the immediate subfolder
            subfolders.add(pathParts[0]);
          }
        }
      });
      
      return { folders: Array.from(subfolders).sort(), hasFiles: fileNames.size > 0 };
    } else {
      // In root, show top-level folders (sanitiwatch)
      const rootFolders = new Set();
      const rootFiles = new Set();
      
      allFilesForFolders.forEach(file => {
        const pathParts = file.public_id.split('/');
        if (pathParts.length === 1) {
          // File is in root
          rootFiles.add(pathParts[0]);
        } else if (pathParts.length > 1) {
          // This is a top-level folder (sanitiwatch)
          rootFolders.add(pathParts[0]);
        }
      });
      
      return { folders: Array.from(rootFolders).sort(), hasFiles: rootFiles.size > 0 };
    }
  }, [currentFolder, allFiles]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const subfolders = getSubfolders();

  return (
    <div style={{ padding: '1rem' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        marginBottom: '1rem',
        padding: '0.5rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '0.5rem'
      }}>
        {breadcrumb.map((item, index) => (
          <React.Fragment key={item.path || 'sanitiwatch'}>
            {index > 0 && <span style={{ color: '#6b7280' }}>›</span>}
            <button
              onClick={() => navigateToFolder(item.path)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                border: 'none',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.875rem',
                textDecoration: index === breadcrumb.length - 1 ? 'underline' : 'none'
              }}
            >
              📁 {item.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Header Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
          {files.length} files {currentFolder ? `in ${currentFolder}` : 'in root'} • {subfolders.folders.length} folders
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '0.875rem'
            }}
          >
            <option value="created_at">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
          </select>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {viewMode === 'grid' ? '📋 List' : '⚏ Grid'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
          Loading Cloudinary files...
        </div>
      )}

      {/* File Explorer View */}
      {!loading && (
        <div>
          {/* Folders Section */}
          {subfolders.folders.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#9ca3af', 
                marginBottom: '0.5rem',
                fontWeight: 600
              }}>
                Folders
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(200px, 1fr))' : '1fr',
                gap: '0.5rem'
              }}>
                {subfolders.folders.map((folder) => (
                  <div
                    key={folder}
                    onClick={() => navigateToFolder(currentFolder ? `${currentFolder}/${folder}` : folder)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>📁</span>
                    <span style={{ color: '#fff', fontSize: '0.875rem' }}>{folder}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section - Only show if current location has files */}
          {subfolders.hasFiles && files.length > 0 && (
            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#9ca3af', 
                marginBottom: '0.5rem',
                fontWeight: 600
              }}>
                Files
              </div>
              {viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {files.map((file) => (
                    <FileCard key={file.public_id} file={file} onDelete={() => {
                      setSelectedFile(file);
                      setShowDeleteModal(true);
                    }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {files.map((file) => (
                    <FileListItem key={file.public_id} file={file} onDelete={() => {
                      setSelectedFile(file);
                      setShowDeleteModal(true);
                    }} />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {files.length === 0 && subfolders.folders.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>☁️</div>
              <div>No files or folders found</div>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedFile && (
        <DeleteModal
          file={selectedFile}
          onConfirm={() => deleteFile(selectedFile.public_id)}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

// Folder Section Component
const FolderSection = React.memo(({ folderName, files, viewMode, onFileDelete }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (files.length === 0) return null;
  
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Folder Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          marginBottom: '0.5rem'
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>
          {isExpanded ? '📂' : '📁'}
        </span>
        <span style={{ color: '#fff', fontWeight: 500 }}>
          {folderName === 'root' ? 'Root' : folderName}
        </span>
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          ({files.length} files)
        </span>
      </div>
      
      {/* Files */}
      {isExpanded && (
        <div style={{ marginLeft: '1.5rem' }}>
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {files.map((file) => (
                <FileCard key={file.public_id} file={file} onDelete={onFileDelete} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {files.map((file) => (
                <FileListItem key={file.public_id} file={file} onDelete={onFileDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// File Card Component (Grid View)
const FileCard = React.memo(({ file, onDelete }) => {
  const folderPath = file.public_id.split('/');
  const fileName = folderPath.pop();
  const folder = folderPath.join('/') || 'root';
  
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.5rem',
        padding: '1rem',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {file.resource_type === 'image' ? (
          <img 
            src={file.url} 
            alt={fileName}
            style={{ 
              width: '60px', 
              height: '60px', 
              objectFit: 'cover',
              borderRadius: '0.25rem'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div style={{ 
          width: '60px', 
          height: '60px', 
          background: file.resource_type === 'image' ? 'none' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '0.25rem',
          display: file.resource_type === 'image' ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '1.5rem'
        }}>
          {file.resource_type === 'video' ? '🎥' : 
           file.resource_type === 'raw' ? '📄' : '📄'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: '0.875rem', 
            fontWeight: 500, 
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {fileName}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#9ca3af',
            marginTop: '0.25rem'
          }}>
            📁 {folder}
          </div>
        </div>
      </div>
      
      <div style={{ 
        fontSize: '0.75rem', 
        color: '#6b7280',
        marginBottom: '0.75rem'
      }}>
        {(file.bytes / 1024).toFixed(1)} KB • {file.format?.toUpperCase() || file.resource_type}
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.75rem',
            textAlign: 'center',
            textDecoration: 'none'
          }}
        >
          👁️ View
        </a>
        <button
          onClick={() => onDelete(file)}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
});

// File List Item Component (List View)
const FileListItem = React.memo(({ file, onDelete }) => {
  const folderPath = file.public_id.split('/');
  const fileName = folderPath.pop();
  const folder = folderPath.join('/') || 'root';
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.75rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.25rem',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      }}
    >
      <div style={{ marginRight: '1rem', fontSize: '1.5rem' }}>
        {file.resource_type === 'image' ? '🖼️' : 
         file.resource_type === 'video' ? '🎥' : '📄'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: '0.875rem', 
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {fileName}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#9ca3af'
        }}>
          📁 {folder} • {(file.bytes / 1024).toFixed(1)} KB • {file.format?.toUpperCase() || file.resource_type}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.75rem',
            textDecoration: 'none'
          }}
        >
          View
        </a>
        <button
          onClick={() => onDelete(file)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
});

// Delete Modal Component
const DeleteModal = ({ file, onConfirm, onCancel }) => {
  const folderPath = file.public_id.split('/');
  const fileName = folderPath.pop();
  const folder = folderPath.join('/') || 'root';
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1f2937',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Confirm Delete</h3>
        <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
          Are you sure you want to delete this file?
        </p>
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.5rem', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '0.25rem',
          fontSize: '0.875rem',
          color: '#e5e7eb'
        }}>
          <div>📁 {folder}</div>
          <div>📄 {fileName}</div>
          <div style={{ color: '#9ca3af', marginTop: '0.25rem' }}>
            {(file.bytes / 1024).toFixed(1)} KB • {file.format?.toUpperCase() || file.resource_type}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudinaryViewer;
