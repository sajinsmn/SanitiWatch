import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const MongoDBViewer = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editJson, setEditJson] = useState('');

  // Fetch collections
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/database/collections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCollections(response.data.collections || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      alert('Error fetching collections: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!selectedCollection) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/database/collections/${selectedCollection}`, {
        params: { page: currentPage, limit: 10, search: searchTerm },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDocuments(response.data.documents || []);
      setTotalPages(response.data.totalPages || 1);
      setCurrentPage(response.data.currentPage || 1);
      setTotalDocuments(response.data.totalDocuments || 0);
    } catch (error) {
      console.error('Error fetching documents:', error);
      alert('Error fetching documents: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [selectedCollection, currentPage, searchTerm]);

  // Edit document
  const saveEdit = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      let updatedData;
      
      try {
        updatedData = JSON.parse(editJson);
      } catch (parseError) {
        alert('Invalid JSON format. Please check your edits.');
        return;
      }
      
      // Remove _id from the update data as it shouldn't be modified
      const { _id, ...dataToUpdate } = updatedData;
      
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/database/collections/${selectedCollection}/${selectedDocument._id}`, 
        dataToUpdate,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      fetchDocuments();
      setShowEditModal(false);
      setSelectedDocument(null);
      setEditJson('');
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Error updating document: ' + (error.response?.data?.message || error.message));
    }
  }, [selectedCollection, selectedDocument, editJson, fetchDocuments]);

  // Delete document
  const deleteDocument = useCallback(async (documentId) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/database/collections/${selectedCollection}/${documentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDocuments();
      setShowDeleteModal(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document: ' + (error.response?.data?.message || error.message));
    }
  }, [selectedCollection, fetchDocuments]);

  // Delete all documents
  const deleteAllDocuments = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/database/collections/${selectedCollection}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDocuments();
      setShowDeleteAllModal(false);
    } catch (error) {
      console.error('Error deleting all documents:', error);
      alert('Error deleting all documents: ' + (error.response?.data?.message || error.message));
    }
  }, [selectedCollection, fetchDocuments]);

  // Open edit modal
  const openEditModal = useCallback((document) => {
    setSelectedDocument(document);
    setEditJson(JSON.stringify(document, null, 2));
    setShowEditModal(true);
  }, []);

  // Open delete modal
  const openDeleteModal = useCallback((document) => {
    setSelectedDocument(document);
    setShowDeleteModal(true);
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    if (selectedCollection) {
      fetchDocuments();
    }
  }, [selectedCollection, currentPage, searchTerm, fetchDocuments]);

  return (
    <div style={{ padding: '1rem' }}>
      {/* Collection Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
          Select Collection
        </label>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsCollectionDropdownOpen(!isCollectionDropdownOpen)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <span style={{ color: selectedCollection ? '#fff' : '#9ca3af' }}>
              {selectedCollection || 'Choose a collection'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {isCollectionDropdownOpen ? '\u25B2' : '\u25BC'}
            </span>
          </button>

          {isCollectionDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.25rem',
                maxHeight: '240px',
                overflowY: 'auto',
                background: 'linear-gradient(135deg, #0a3f67 0%, #2c679e 100%)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 20
              }}
            >
              <div
                onClick={() => {
                  setSelectedCollection('');
                  setCurrentPage(1);
                  setIsCollectionDropdownOpen(false);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#9ca3af',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(31,41,55,1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Choose a collection
              </div>
              {collections.map((collection) => (
                <div
                  key={collection}
                  onClick={() => {
                    setSelectedCollection(collection);
                    setCurrentPage(1);
                    setIsCollectionDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    color: '#e5e7eb',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(31,41,55,1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {collection}
                </div>
              ))}
            </div>
          )}
        </div>
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
          {selectedCollection ? `${totalDocuments} documents in ${selectedCollection}` : 'Select a collection to view documents'}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ 
              position: 'absolute',
              left: '0.75rem',
              color: '#9ca3af',
              fontSize: '0.875rem',
              pointerEvents: 'none'
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: '0.875rem',
                width: '250px',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.12)';
                e.target.style.borderColor = 'rgba(59,130,246,0.5)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.08)';
                e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
            />
          </div>
          
          {/* Delete All Button */}
          {selectedCollection && documents.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
              }}
            >
              🗑️ Delete All
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
          Loading documents...
        </div>
      )}

      {/* Documents List */}
      {!loading && documents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {documents.map((document) => (
            <DocumentCard
              key={document._id}
              document={document}
              onEdit={() => openEditModal(document)}
              onDelete={() => openDeleteModal(document)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && documents.length === 0 && selectedCollection && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          color: '#9ca3af'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <div>No documents found</div>
        </div>
      )}

      {/* Pagination */}
      {!loading && documents.length > 0 && totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '0.5rem',
          marginTop: '2rem'
        }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: currentPage === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.2)',
              color: '#fff',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          <span style={{ color: '#9ca3af', padding: '0.5rem' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: currentPage === totalPages ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.2)',
              color: '#fff',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDocument && (
        <EditModal
          document={selectedDocument}
          editJson={editJson}
          setEditJson={setEditJson}
          onSave={saveEdit}
          onCancel={() => setShowEditModal(false)}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedDocument && (
        <DeleteModal
          document={selectedDocument}
          onConfirm={() => deleteDocument(selectedDocument._id)}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Delete All Modal */}
      {showDeleteAllModal && (
        <DeleteAllModal
          collection={selectedCollection}
          onConfirm={deleteAllDocuments}
          onCancel={() => setShowDeleteAllModal(false)}
        />
      )}
    </div>
  );
};

// Document Card Component
const DocumentCard = React.memo(({ document, onEdit, onDelete }) => {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
          ID: {document._id}
        </div>
        <pre style={{ 
          fontSize: '0.75rem', 
          color: '#e5e7eb', 
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          {JSON.stringify(document, null, 2)}
        </pre>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
        <button
          onClick={onEdit}
          style={{
            padding: '0.5rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '0.5rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
});

// Edit Modal Component
const EditModal = ({ document, editJson, setEditJson, onSave, onCancel }) => {
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
        background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
        borderRadius: '1rem',
        padding: '2rem',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '85vh',
        overflow: 'auto',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.5rem', fontWeight: 600 }}>
              ✏️ Edit Document
            </h3>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Document ID: <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{document._id}</span>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db', fontSize: '0.875rem', fontWeight: 500 }}>
            Document JSON
          </label>
          <textarea
            value={editJson}
            onChange={(e) => setEditJson(e.target.value)}
            placeholder="Edit the document JSON..."
            style={{
              width: '100%',
              height: '350px',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: '0.875rem',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              lineHeight: '1.5',
              resize: 'vertical',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(59,130,246,0.5)';
              e.target.style.background = 'rgba(0,0,0,0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              e.target.style.background = 'rgba(0,0,0,0.3)';
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.3)';
            }}
          >
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Modal Component
const DeleteModal = ({ document, onConfirm, onCancel }) => {
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
          Are you sure you want to delete this document?
        </p>
        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ID: {document._id}</div>
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

// Delete All Modal Component
const DeleteAllModal = ({ collection, onConfirm, onCancel }) => {
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
        <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Delete All Documents</h3>
        <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
          Are you sure you want to delete ALL documents in the "{collection}" collection? This action cannot be undone.
        </p>
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
            Delete All
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

export default MongoDBViewer;
