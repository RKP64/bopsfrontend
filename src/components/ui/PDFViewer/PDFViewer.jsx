import React, { useState, useRef, useEffect } from 'react';
import { getBlobProxyUrl } from '../../../config';

// Load PDF.js from CDN to avoid build issues
let pdfjsLibPromise = null;

const loadPdfJsFromCDN = () => {
  if (pdfjsLibPromise) {
    return pdfjsLibPromise;
  }

  pdfjsLibPromise = new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return pdfjsLibPromise;
};

const PDFViewer = ({ pdfUrl, pageNumber, onClose, theme, useBaseUrl2 = false }) => {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const containerRef = useRef(null);

  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [retryCount, setRetryCount] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Reset state when URL changes
  useEffect(() => {
    if (pdfUrl) {
      setPdfDocument(null);
      setCurrentPage(1);
      setTotalPages(0);
      setError(null);
      setRetryCount(0);
      setSearchText('');
      setSearchResults([]);
      setCurrentSearchIndex(0);
      loadPDF();
    }
  }, [pdfUrl]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentPage > 1) {
        goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        goToPage(currentPage + 1);
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onClose]);

  // Render page when document or page changes
  useEffect(() => {
    if (pdfDocument && pageNumber) {
      setCurrentPage(pageNumber);
      renderPage(pageNumber);
    }
  }, [pdfDocument, pageNumber]);

  // Cleanup render task on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, []);

  const loadPDF = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Convert proxy URL to full URL if needed
      // The URL should already be a full URL when passed from the component
      // But handle cases where it might be a relative URL
      let fullUrl = pdfUrl;

      // If it's already a full URL, use it as-is (but validate it's not malformed)
      if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
        // Validate the URL is not malformed (like https://blob-proxy/... or https://blob-proxy/?blob=...)
        // A valid blob-proxy URL should have a domain before /blob-proxy
        const isValidBlobProxyUrl = pdfUrl.match(/https?:\/\/[^\/]+\/blob-proxy(\?|$)/);
        if (pdfUrl.includes('blob-proxy') && !isValidBlobProxyUrl) {
          // This is a malformed URL, try to extract the blob parameter and reconstruct
          console.warn('Detected malformed blob-proxy URL:', pdfUrl);
          try {
            // Try to parse as URL
            const urlObj = new URL(pdfUrl);
            const blobParam = urlObj.searchParams.get('blob');
            if (blobParam) {
              // Reconstruct with correct base URL using the specified base URL
              fullUrl = getBlobProxyUrl(`/blob-proxy?blob=${blobParam}`, useBaseUrl2);
              console.log('Fixed malformed URL to:', fullUrl);
            } else {
              // Try to extract blob parameter from pathname or search
              const pathMatch = pdfUrl.match(/blob-proxy[\/\?]blob=([^&\/\s]+)/);
              if (pathMatch) {
                fullUrl = getBlobProxyUrl(`/blob-proxy?blob=${pathMatch[1]}`, useBaseUrl2);
                console.log('Fixed malformed URL (extracted from path) to:', fullUrl);
              }
            }
          } catch (e) {
            console.error('Error fixing malformed URL:', e);
            // Try manual extraction as last resort
            const manualMatch = pdfUrl.match(/[?&]blob=([^&\/\s]+)/);
            if (manualMatch) {
              fullUrl = getBlobProxyUrl(`/blob-proxy?blob=${manualMatch[1]}`, useBaseUrl2);
              console.log('Fixed malformed URL (manual extraction) to:', fullUrl);
            }
          }
        }
        // Otherwise, use the URL as-is
      } else if (pdfUrl.startsWith('/blob-proxy')) {
        // For relative URLs, convert to full URL using the specified base URL
        fullUrl = getBlobProxyUrl(pdfUrl, useBaseUrl2);
      } else if (pdfUrl && !pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
        // If it's not a full URL and not a relative /blob-proxy, try to convert it
        fullUrl = getBlobProxyUrl(pdfUrl, useBaseUrl2);
      }

      // Check if this is a proxy URL that requires authentication
      const isProxyUrl = fullUrl.includes('/blob-proxy');
      const pdfjsLib = await loadPdfJsFromCDN();

      let loadingTask;

      if (isProxyUrl) {
        const token = localStorage.getItem('authToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        loadingTask = pdfjsLib.getDocument({
          url: fullUrl,
          httpHeaders: headers,
          disableAutoFetch: false,
          disableStream: false,
          verbosity: 0,
        });
      } else {
        loadingTask = pdfjsLib.getDocument({
          url: fullUrl,
          disableAutoFetch: false,
          disableStream: false,
          verbosity: 0,
        });
      }

      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);

      // Load initial page
      if (pageNumber) {
        setCurrentPage(pageNumber);
        await renderPage(pageNumber);
      } else {
        await renderPage(1);
      }

    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(`Failed to load PDF: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = async (pageNum) => {
    if (!pdfDocument || isRendering) return;

    try {
      setIsRendering(true);

      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (cancelErr) {
          console.log('Render task cancellation:', cancelErr.message);
        }
        renderTaskRef.current = null;
      }

      const page = await pdfDocument.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');

      // Calculate viewport with proper scaling
      const viewport = page.getViewport({ scale });

      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Clear canvas completely
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Wait a bit to ensure canvas is ready
      await new Promise(resolve => setTimeout(resolve, 10));

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      // Wait for render to complete
      await renderTask.promise;
      renderTaskRef.current = null;

    } catch (err) {
      console.error('Error rendering page:', err);
      if (err.name !== 'RenderingCancelledException' && err.name !== 'AbortException') {
        setError(`Failed to render PDF page ${pageNum}: ${err.message}`);
      }
    } finally {
      setIsRendering(false);
    }
  };

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      renderPage(pageNum);
    }
  };

  const zoomIn = async () => {
    const newScale = Math.min(scale + 0.25, 3.0);
    setScale(newScale);
    await new Promise(resolve => setTimeout(resolve, 100));
    await renderPage(currentPage);
  };

  const zoomOut = async () => {
    const newScale = Math.max(scale - 0.25, 0.5);
    setScale(newScale);
    await new Promise(resolve => setTimeout(resolve, 100));
    await renderPage(currentPage);
  };

  const resetZoom = async () => {
    setScale(1.0);
    await new Promise(resolve => setTimeout(resolve, 100));
    await renderPage(currentPage);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const downloadPDF = async () => {
    try {
      // Convert proxy URL to full URL if needed
      let fullUrl = pdfUrl;
      if (pdfUrl.startsWith('/blob-proxy')) {
        fullUrl = getBlobProxyUrl(pdfUrl, useBaseUrl2);
      } else if (pdfUrl && !pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
        fullUrl = getBlobProxyUrl(pdfUrl, useBaseUrl2);
      } else if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
        // Validate malformed URLs
        if (pdfUrl.includes('blob-proxy') && !pdfUrl.includes('localhost') && !pdfUrl.includes('azurewebsites.net') && !pdfUrl.includes('bialairport.com')) {
          try {
            const urlObj = new URL(pdfUrl);
            const blobParam = urlObj.searchParams.get('blob');
            if (blobParam) {
              fullUrl = getBlobProxyUrl(`/blob-proxy?blob=${blobParam}`, useBaseUrl2);
            }
          } catch (e) {
            console.error('Error fixing malformed URL in download:', e);
          }
        }
      }

      // Check if this is a proxy URL that requires authentication
      const isProxyUrl = fullUrl.includes('/blob-proxy');
      const headers = {};

      if (isProxyUrl) {
        const token = localStorage.getItem('authToken');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(fullUrl, { headers });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from URL or use default
      const urlParts = pdfUrl.split('/');
      const filename = urlParts[urlParts.length - 1] || 'document.pdf';

      // Add page number to filename if not already present
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
      const extension = filename.match(/\.[^/.]+$/)?.[0] || '.pdf';
      const finalFilename = `${nameWithoutExt}_page_${currentPage}${extension}`;

      link.setAttribute('download', finalFilename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF');
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setError(null);
      loadPDF();
    }
  };

  if (!pdfUrl) return null;

  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease-out'
  };

  const viewerStyle = {
    width: isFullscreen ? '100vw' : '90vw',
    height: isFullscreen ? '100vh' : '90vh',
    backgroundColor: 'var(--background-secondary)',
    borderRadius: isFullscreen ? '0' : '0.75rem',
    boxShadow: isFullscreen ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    transition: 'all 0.3s ease-in-out'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    backgroundColor: 'var(--background-primary)',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0
  };

  const controlsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.5rem',
    backgroundColor: 'var(--background-primary)',
    borderTop: '1px solid var(--border-color)',
    flexShrink: 0
  };

  const contentStyle = {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'var(--background-secondary)',
    padding: '2rem',
    overflow: 'auto',
    position: 'relative'
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        .pdf-viewer-backdrop {
          backdrop-filter: blur(4px);
        }
        
        .pdf-control-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: var(--accent-color);
          color: var(--text-light);
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .pdf-control-btn:hover:not(:disabled) {
          background-color: var(--accent-color-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .pdf-control-btn:disabled {
          background-color: var(--text-secondary);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .pdf-control-btn.secondary {
          background-color: var(--background-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }
        
        .pdf-control-btn.secondary:hover:not(:disabled) {
          background-color: var(--background-primary);
          border-color: var(--accent-color);
        }
        
        .pdf-control-btn.danger {
          background-color: #dc2626;
        }
        
        .pdf-control-btn.danger:hover:not(:disabled) {
          background-color: #b91c1c;
        }
        
        .pdf-page-input {
          width: 80px;
          padding: 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          text-align: center;
          background-color: var(--background-secondary);
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: border-color 0.2s ease;
        }
        
        .pdf-page-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
        }
        
        .pdf-page-input:disabled {
          background-color: var(--background-primary);
          cursor: not-allowed;
        }
        
        .pdf-zoom-display {
          background-color: var(--background-secondary);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-color);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          min-width: 80px;
          text-align: center;
        }
        
        .pdf-canvas-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          height: 100%;
          transition: all 0.3s ease;
        }
        
        .pdf-canvas {
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          background-color: white;
          display: block;
          max-width: 100%;
          height: auto;
          transition: all 0.3s ease;
        }
        
        .pdf-canvas:hover {
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18);
        }
        
        .pdf-loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color);
          border-top: 4px solid var(--accent-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .pdf-error-container {
          text-align: center;
          padding: 2rem;
          background-color: var(--background-secondary);
          border-radius: 0.75rem;
          border: 1px solid #fecaca;
          max-width: 400px;
        }
        
        .pdf-error-icon {
          font-size: 3rem;
          color: #dc2626;
          margin-bottom: 1rem;
        }
        
        .pdf-error-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        
        .pdf-error-message {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        
        .pdf-retry-btn {
          background-color: #dc2626;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s ease;
        }
        
        .pdf-retry-btn:hover:not(:disabled) {
          background-color: #b91c1c;
        }
        
        .pdf-retry-btn:disabled {
          background-color: var(--text-secondary);
          cursor: not-allowed;
        }
        
        .pdf-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        
        .pdf-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0.25rem 0 0 0;
        }
        
        .pdf-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
          z-index: 10;
        }
        
        .pdf-close-btn:hover {
          background-color: rgba(0, 0, 0, 0.7);
          transform: scale(1.1);
        }
        
        .pdf-fullscreen-btn {
          position: absolute;
          top: 1rem;
          right: 5rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
          z-index: 10;
        }
        
        .pdf-fullscreen-btn:hover {
          background-color: rgba(0, 0, 0, 0.7);
          transform: scale(1.1);
        }
        
        .pdf-progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background-color: var(--border-color);
          overflow: hidden;
        }
        
        .pdf-progress-fill {
          height: 100%;
          background-color: var(--accent-color);
          transition: width 0.3s ease;
        }
        
        @media (max-width: 768px) {
          .pdf-viewer-container {
            width: 100vw !important;
            height: 100vh !important;
            border-radius: 0 !important;
          }
          
          .pdf-controls {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          
          .pdf-control-btn {
            padding: 0.375rem 0.75rem;
            font-size: 0.8rem;
          }
          
          .pdf-close-btn {
            top: 0.5rem;
            right: 0.5rem;
            width: 36px;
            height: 36px;
            font-size: 1rem;
          }
          
          .pdf-fullscreen-btn {
            top: 0.5rem;
            right: 3rem;
            width: 36px;
            height: 36px;
            font-size: 0.9rem;
          }
        }
      `}</style>

      <div style={containerStyle} className="pdf-viewer-backdrop" onClick={onClose}>
        <div
          ref={containerRef}
          style={viewerStyle}
          className="pdf-viewer-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close and Fullscreen buttons */}
          <button className="pdf-close-btn" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
          <button className="pdf-fullscreen-btn" onClick={toggleFullscreen} title="Toggle Fullscreen (F11)">
            {isFullscreen ? '⤓' : '⤢'}
          </button>

          {/* Header */}
          <div style={headerStyle}>
            <div>
              <h3 className="pdf-title">PDF Viewer</h3>
              <p className="pdf-subtitle">
                Page {currentPage} of {totalPages} • {Math.round(scale * 100)}% zoom
              </p>
            </div>
          </div>

          {/* Content Area */}
          <div style={contentStyle}>
            {isLoading && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div className="pdf-loading-spinner"></div>
                <p style={{ marginTop: '1rem', fontSize: '1rem' }}>Loading PDF...</p>
              </div>
            )}

            {error && (
              <div className="pdf-error-container">
                <div className="pdf-error-icon">⚠️</div>
                <h3 className="pdf-error-title">Error Loading PDF</h3>
                <p className="pdf-error-message">{error}</p>
                <button
                  className="pdf-retry-btn"
                  onClick={handleRetry}
                  disabled={retryCount >= 3}
                >
                  {retryCount >= 3 ? 'Max Retries Reached' : `Retry (${retryCount}/3)`}
                </button>
              </div>
            )}

            {!isLoading && !error && (
              <div className="pdf-canvas-container">
                <canvas
                  ref={canvasRef}
                  className="pdf-canvas"
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={controlsStyle} className="pdf-controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                className="pdf-control-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || isRendering}
                title="Previous page (←)"
              >
                ← Previous
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>Page:</span>
                <input
                  type="number"
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  min="1"
                  max={totalPages}
                  disabled={isRendering}
                  className="pdf-page-input"
                />
                <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>of {totalPages}</span>
              </div>

              <button
                className="pdf-control-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || isRendering}
                title="Next page (→)"
              >
                Next →
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                className="pdf-control-btn secondary"
                onClick={zoomOut}
                disabled={isRendering}
                title="Zoom out"
              >
                −
              </button>
              <div className="pdf-zoom-display">
                {Math.round(scale * 100)}%
              </div>
              <button
                className="pdf-control-btn secondary"
                onClick={zoomIn}
                disabled={isRendering}
                title="Zoom in"
              >
                +
              </button>
              <button
                className="pdf-control-btn secondary"
                onClick={resetZoom}
                disabled={isRendering}
                title="Reset zoom"
              >
                Reset
              </button>
              <button className="pdf-control-btn secondary" onClick={downloadPDF} title="Download PDF">
                📥 Download
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="pdf-progress-bar">
            <div
              className="pdf-progress-fill"
              style={{ width: `${(currentPage / totalPages) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default PDFViewer;