import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { API_CONFIG, getBlobProxyUrl } from '../../config';
import PDFViewer from '../ui/PDFViewer/PDFViewer';

// --- 1. THEME DEFINITIONS (MATCHES MDA REVIEWER) ---
const themes = {
  bial_style: {
    name: "Light Mode",
    '--background-primary': '#f0f4f8',
    '--background-secondary': '#ffffff',
    '--text-primary': '#1a202c',
    '--text-secondary': '#6c757d',
    '--text-light': '#ffffff',
    '--border-color': '#e2e8f0',
    '--accent-color': '#0d9488',
    '--accent-color-hover': '#0f766e',
    '--sidebar-header-text': '#1e3a8a',
    '--shadow-color': 'rgba(0, 0, 0, 0.05)',
    '--user-bubble-bg': '#e7f5ff',
    '--assistant-bubble-bg': '#f8f9fa',
  },
  dark: {
    name: "Dark Mode",
    '--background-primary': '#1a202c',
    '--background-secondary': '#2d3748',
    '--text-primary': '#f7fafc',
    '--text-secondary': '#a0aec0',
    '--text-light': '#f7fafc',
    '--border-color': '#4a5568',
    '--accent-color': '#38B2AC',
    '--accent-color-hover': '#2C7A7B',
    '--sidebar-header-text': '#bfdbfe',
    '--shadow-color': 'rgba(0, 0, 0, 0.4)',
    '--user-bubble-bg': '#2b6cb0',
    '--assistant-bubble-bg': '#4a5568',
  },
};

// --- UI COMPONENTS (SHARED STYLE WITH MDA REVIEWER) ---
const MainContentHeader = ({ theme, setTheme }) => (
  <header style={{
    height: '4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 1.5rem',
    borderBottom: `1px solid var(--border-color)`,
    backgroundColor: 'var(--background-secondary)',
    flexShrink: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {/* <button style={{ fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'transparent', color: 'var(--text-primary)', border: 'none' }}>Playground</button> */}
      {/* <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', backgroundColor: 'var(--sidebar-header-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', fontWeight: 'bold' }}>B</div>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>BIAL_USER</span>
      </div> */}
      <select
        value={Object.keys(themes).find(key => themes[key].name === theme.name)}
        onChange={(e) => setTheme(themes[e.target.value])}
        style={{
          padding: '0.5rem', borderRadius: '8px', border: `1px solid var(--border-color)`,
          backgroundColor: 'var(--background-secondary)', color: 'var(--text-primary)',
          cursor: 'pointer', fontFamily: 'inherit'
        }}
      >
        {Object.entries(themes).map(([key, themeObject]) => (
          <option key={key} value={key}>{themeObject.name}</option>
        ))}
      </select>
    </div>
  </header>
);

// --- MAIN CONVERSATIONAL AGENT COMPONENT ---
function ConversationalAgent() {
  const { getAuthHeaders } = useAuth();
  const [theme, setTheme] = useState(themes.bial_style);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfViewer, setPdfViewer] = useState({ isOpen: false, url: null, pageNumber: null });
  const chatEndRef = useRef(null);

  const API_BASE_URL = API_CONFIG.BASE_URL_2;

  // --- PDF VIEWER HANDLERS ---
  const openPdfViewer = useCallback((url, pageNumber) => {
    setPdfViewer({ isOpen: true, url, pageNumber });
  }, []);

  const closePdfViewer = useCallback(() => {
    setPdfViewer({ isOpen: false, url: null, pageNumber: null });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Attach click handlers to PDF reference links after content is rendered
  useEffect(() => {
    const handlePdfReferenceClick = (e) => {
      const target = e.target.closest('.pdf-reference-link');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        let pdfUrl = decodeURIComponent(target.getAttribute('data-pdf-url'));
        const pageNumberAttr = target.getAttribute('data-page-number');
        const pageNumber = pageNumberAttr && pageNumberAttr !== '' ? parseInt(pageNumberAttr) : null;


        // Fix URLs that contain example.com (from LLM examples)
        if (pdfUrl.includes('example.com')) {
          // Extract the blob parameter if present
          try {
            // Ensure URL has protocol for parsing
            const urlToParse = pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')
              ? pdfUrl
              : `https://${pdfUrl}`;
            const urlObj = new URL(urlToParse);
            const blobParam = urlObj.searchParams.get('blob');
            if (blobParam) {
              // Reconstruct as /blob-proxy URL (ensure it starts with / and has correct format)
              pdfUrl = `/blob-proxy?blob=${blobParam}`;
              // Ensure URL format is correct: /blob-proxy?blob=... (not /blob-proxy/?blob=...)
              pdfUrl = pdfUrl.replace(/^\/blob-proxy\/\?/, '/blob-proxy?');
            }
          } catch (e) {
            console.error('Error parsing example.com URL:', e);
            // If parsing fails, try to extract blob parameter manually
            const blobMatch = pdfUrl.match(/[?&]blob=([^&]+)/);
            if (blobMatch) {
              pdfUrl = `/blob-proxy?blob=${blobMatch[1]}`;
              // Ensure URL format is correct: /blob-proxy?blob=... (not /blob-proxy/?blob=...)
              pdfUrl = pdfUrl.replace(/^\/blob-proxy\/\?/, '/blob-proxy?');
            }
          }
        }

        // Clean up the URL - remove any trailing slashes before query params
        pdfUrl = pdfUrl.replace(/\/\?/g, '?').replace(/\/+$/, '');

        // Ensure the URL starts with / for relative paths
        if (pdfUrl && !pdfUrl.startsWith('/') && !pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
          pdfUrl = `/${pdfUrl}`;
        }

        // Convert proxy URL to full URL if needed
        // Use BASE_URL_2 for ConversationalAgent since it uses the FF backend
        if (pdfUrl.startsWith('/blob-proxy') || pdfUrl.startsWith('/api-ff/blob-proxy')) {
          // If URL already has /api-ff/blob-proxy, extract just /blob-proxy part
          if (pdfUrl.startsWith('/api-ff/blob-proxy')) {
            pdfUrl = pdfUrl.replace('/api-ff', '');
          }
          // Ensure the URL format is correct: /blob-proxy?blob=... (not /blob-proxy/?blob=...)
          pdfUrl = pdfUrl.replace(/^\/blob-proxy\/\?/, '/blob-proxy?');
          pdfUrl = getBlobProxyUrl(pdfUrl, true); // true = use BASE_URL_2
        }
        // For https:// blob storage URLs, convert them to proxy URLs first
        else if (pdfUrl.startsWith('https://') && pdfUrl.includes('blob.core.windows.net')) {
          try {
            const urlObj = new URL(pdfUrl);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length >= 2) {
              const containerName = pathParts[0];
              const blobName = pathParts.slice(1).join('/');
              // Encode as URL-safe base64 for proxy URL (matching backend format)
              const standardBase64 = btoa(`${containerName}/${blobName}`);
              const urlSafeBase64 = standardBase64
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
              pdfUrl = getBlobProxyUrl(`/blob-proxy?blob=${urlSafeBase64}`, true);
            }
          } catch (e) {
            console.error('Error converting blob URL to proxy:', e);
          }
        }

        // Ensure we have a valid full URL before opening
        // Always convert to full URL - don't pass relative URLs to PDFViewer
        if (pdfUrl && (pdfUrl.startsWith('/blob-proxy') || pdfUrl.startsWith('/api-ff/blob-proxy'))) {
          // If URL already has /api-ff/blob-proxy, extract just /blob-proxy part
          if (pdfUrl.startsWith('/api-ff/blob-proxy')) {
            pdfUrl = pdfUrl.replace('/api-ff', '');
          }
          // Convert relative URL to full URL using BASE_URL_2 for ConversationalAgent
          pdfUrl = getBlobProxyUrl(pdfUrl, true);
        }

        // Validate URL is a proper full URL
        if (pdfUrl && (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://'))) {
          // Double-check it's not a malformed URL like https://blob-proxy/... or https://blob-proxy/?blob=...
          // A valid blob-proxy URL should have a domain before /blob-proxy or /api-ff/blob-proxy
          // (e.g., http://localhost:8002/blob-proxy?blob=... or https://domain.com/api-ff/blob-proxy?blob=...)
          const isValidBlobProxyUrl = pdfUrl.match(/https?:\/\/[^\/]+(\/api-ff)?\/blob-proxy(\?|$)/);
          if (pdfUrl.includes('blob-proxy') && !isValidBlobProxyUrl) {
            try {
              const urlObj = new URL(pdfUrl);
              const blobParam = urlObj.searchParams.get('blob');
              if (blobParam) {
                pdfUrl = getBlobProxyUrl(`/blob-proxy?blob=${blobParam}`, true);
              } else {
                const pathMatch = pdfUrl.match(/blob-proxy[\/\?]blob=([^&\/\s]+)/);
                if (pathMatch) {
                  pdfUrl = getBlobProxyUrl(`/blob-proxy?blob=${pathMatch[1]}`, true);
                } else {
                  return;
                }
              }
            } catch (e) {
              const manualMatch = pdfUrl.match(/[?&]blob=([^&\/\s]+)/);
              if (manualMatch) {
                pdfUrl = getBlobProxyUrl(`/blob-proxy?blob=${manualMatch[1]}`, true);
              } else {
                return;
              }
            }
          }
          openPdfViewer(pdfUrl, pageNumber);
        } else {
          console.error('Invalid PDF URL:', pdfUrl);
        }
      }
    };

    // Attach event listener to document for event delegation

    document.addEventListener('click', handlePdfReferenceClick);

    return () => {
      document.removeEventListener('click', handlePdfReferenceClick);
    };
  }, [openPdfViewer]);

  // Clear chat on logout
  useEffect(() => {
    const clearOnLogout = () => {
      setChatHistory([]);
      setUserInput('');
      setError(null);
    };
    window.addEventListener('userLoggedOut', clearOnLogout);
    return () => window.removeEventListener('userLoggedOut', clearOnLogout);
  }, []);

  const handleSubmit = async (queryOverride) => {
    const currentQuestion = queryOverride || userInput;
    if (!currentQuestion.trim()) return;

    const newHistory = [...chatHistory, { role: 'user', content: currentQuestion }];
    const assistantMessageId = Date.now();
    setChatHistory([...newHistory, { role: 'assistant', content: 'Thinking...', id: assistantMessageId, plan: null, sources: null, feedback: null }]);

    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const sanitizedHistory = newHistory.slice(0, -1).map(({ role, content }) => ({ role, content }));

      const headers = getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/conversational-chat`,
        {
          question: currentQuestion,
          history: sanitizedHistory,
        },
        { headers }
      );

      const { answer, plan, sources } = response.data;

      setChatHistory(currentHistory => {
        return currentHistory.map(msg =>
          msg.id === assistantMessageId ? { ...msg, content: answer, plan, sources } : msg
        );
      });

    } catch (err) {
      const errorMessage = err.response?.data?.detail || "Failed to get an answer.";
      setError(errorMessage);
      setChatHistory(currentHistory => {
        return currentHistory.map(msg =>
          msg.id === assistantMessageId ? { ...msg, content: `Sorry, an error occurred: ${errorMessage}` } : msg
        );
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (message) => {
    if (!message || !message.content) return;

    const userMessage = chatHistory.findLast(msg => msg.role === 'user');
    const finalResponseHtml = `<h2>Question</h2><p>${userMessage?.content || 'N/A'}</p><hr/><h2>Answer</h2>${message.content}`;

    setIsDownloading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/download-report`,
        { html_content: finalResponseHtml },
        {
          headers,
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Conversation_Response.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError("Failed to download the report.");
    } finally {
      setIsDownloading(false);
    }
  };

  // --- NEW: FEEDBACK HANDLER ---
  const handleFeedback = async (messageId, feedbackType) => {
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;

    const assistantMessage = chatHistory[messageIndex];
    const userMessage = chatHistory[messageIndex - 1];

    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_BASE_URL}/feedback`, {
        question: userMessage.content,
        answer: assistantMessage.content,
        feedback: feedbackType,
        user: "BIAL_USER" // Replace with actual username if available
      }, { headers });

      // Update UI to show feedback was submitted
      setChatHistory(currentHistory => {
        return currentHistory.map(msg =>
          msg.id === messageId ? { ...msg, feedback: feedbackType } : msg
        );
      });

    } catch (err) {
      console.error("Failed to submit feedback:", err);
      // Optionally show an error to the user
    }
  };

  // Function to format content for better readability
  const formatContent = (content) => {
    if (!content) return '';

    // First, clean up excessive whitespace and normalize line breaks
    let formattedContent = content
      // Remove excessive line breaks (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove trailing whitespace from lines
      .replace(/[ \t]+$/gm, '')
      // Remove leading whitespace from lines (except for indented content)
      .replace(/^[ \t]+$/gm, '');

    // Process References section - convert markdown links to PDF viewer links
    const referencesSectionRegex = /(##?\s*References\s*:?\s*\n|^References\s*:?\s*\n)([\s\S]*?)(?=\n##?\s*\w+|\n##?\s*References|$)/i;
    const referencesMatch = formattedContent.match(referencesSectionRegex);

    if (referencesMatch) {
      const referencesHeading = referencesMatch[1];
      const referencesContent = referencesMatch[2] || '';
      let processedReferences = referencesContent;

      // Helper function to extract complete URL from markdown link
      const extractCompleteUrl = (text, startIndex) => {
        // Find the opening parenthesis after [
        const openParenIndex = text.indexOf('](', startIndex);
        if (openParenIndex === -1) return null;

        const urlStart = openParenIndex + 2;
        let urlEnd = -1;
        let inQuery = false;
        let foundPdf = false;
        let queryStartIndex = -1;
        let parenDepth = 0;

        // Scan through the text to find the complete URL
        for (let i = urlStart; i < text.length; i++) {
          const char = text[i];
          const urlSoFar = text.substring(urlStart, i);

          if (char === '?') {
            inQuery = true;
            queryStartIndex = i;
          }

          if (urlSoFar.includes('.pdf')) {
            foundPdf = true;
          }

          // Track parentheses depth (URLs can have nested parentheses in encoded characters)
          if (char === '(') {
            parenDepth++;
          } else if (char === ')') {
            if (parenDepth > 0) {
              parenDepth--;
              continue; // This is a nested closing paren, not the end of the URL
            }

            // Strategy 1: For blob URLs with query params, look for &sig= pattern
            if (inQuery && urlSoFar.includes('&sig=')) {
              // Check if &sig= is followed by what looks like a signature (base64-like)
              const sigIndex = urlSoFar.lastIndexOf('&sig=');
              if (sigIndex !== -1) {
                const afterSig = urlSoFar.substring(sigIndex + 5);
                const decodedSig = decodeURIComponent(afterSig).replace(/[^A-Za-z0-9+\/=]/g, '');
                if (decodedSig.length > 10 && /^[A-Za-z0-9+\/]+=*$/.test(decodedSig)) {
                  urlEnd = i;
                  break;
                }
              }
            }

            // Strategy 2: For URLs ending with .pdf, check if next char indicates end of markdown link
            if (foundPdf) {
              const nextChar = i + 1 < text.length ? text[i + 1] : '';
              if (nextChar === '' || nextChar === '\n' || nextChar === '\r' || /\s/.test(nextChar)) {
                urlEnd = i;
                break;
              }
              if (inQuery && queryStartIndex !== -1) {
                const queryPart = urlSoFar.substring(queryStartIndex - urlStart);
                const hasBlobParams = queryPart.includes('se=') && queryPart.includes('sp=') &&
                  queryPart.includes('sv=') && queryPart.includes('sr=');
                if (hasBlobParams || (queryPart.match(/&/g) || []).length >= 2) {
                  urlEnd = i;
                  break;
                }
              }
            }

            // Strategy 3: For https:// URLs with query params
            if (inQuery && (urlSoFar.startsWith('https://') || urlSoFar.startsWith('http://'))) {
              if (urlSoFar.length > 50 && urlSoFar.includes('://') && urlSoFar.includes('/')) {
                urlEnd = i;
                break;
              }
            }

            // Strategy 4: Long URLs with query params
            if (inQuery && urlSoFar.length > 100) {
              urlEnd = i;
              break;
            }

            // Strategy 5: Default fallback
            const nextChar = i + 1 < text.length ? text[i + 1] : '';
            if (nextChar === '' || nextChar === '\n' || nextChar === '\r' || /\s/.test(nextChar) || nextChar === '•' || nextChar === '-') {
              urlEnd = i;
              break;
            }
          }
        }

        if (urlEnd === -1) {
          for (let i = text.length - 1; i >= urlStart; i--) {
            if (text[i] === ')') {
              const nextChar = i + 1 < text.length ? text[i + 1] : '';
              if (nextChar === '' || nextChar === '\n' || nextChar === '\r' || /\s/.test(nextChar) || nextChar === '•' || nextChar === '-') {
                urlEnd = i;
                break;
              }
            }
          }
        }

        if (urlEnd === -1 || urlEnd === urlStart) return null;

        return {
          url: text.substring(urlStart, urlEnd),
          endIndex: urlEnd
        };
      };

      let currentIndex = 0;
      const processedParts = [];

      while (currentIndex < processedReferences.length) {
        const linkStart = processedReferences.indexOf('[', currentIndex);
        if (linkStart === -1) {
          processedParts.push(processedReferences.substring(currentIndex));
          break;
        }

        processedParts.push(processedReferences.substring(currentIndex, linkStart));

        const descEnd = processedReferences.indexOf(']', linkStart);
        if (descEnd === -1) {
          processedParts.push(processedReferences.substring(linkStart));
          break;
        }

        const description = processedReferences.substring(linkStart + 1, descEnd);
        const urlResult = extractCompleteUrl(processedReferences, linkStart);
        if (!urlResult) {
          currentIndex = linkStart + 1;
          continue;
        }

        const { url: cleanUrl, endIndex } = urlResult;
        let processedUrl = cleanUrl;

        if (processedUrl.startsWith('file://') || processedUrl.startsWith('http://')) {
          currentIndex = linkStart + 1;
          continue;
        }

        if (cleanUrl.includes('example.com')) {
          try {
            const urlToParse = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
              ? cleanUrl
              : `https://${cleanUrl}`;
            const urlObj = new URL(urlToParse);
            const blobParam = urlObj.searchParams.get('blob');
            if (blobParam) {
              processedUrl = `/blob-proxy?blob=${decodeURIComponent(blobParam)}`;
            } else {
              currentIndex = linkStart + 1;
              continue;
            }
          } catch (e) {
            const blobMatch = cleanUrl.match(/[?&]blob=([^&]+)/);
            if (blobMatch) {
              processedUrl = `/blob-proxy?blob=${decodeURIComponent(blobMatch[1])}`;
            } else {
              currentIndex = linkStart + 1;
              continue;
            }
          }
        }

        if (processedUrl.startsWith('https://') && processedUrl.includes('blob.core.windows.net')) {
          try {
            const urlObj = new URL(processedUrl);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length >= 2) {
              const containerName = pathParts[0];
              const blobName = pathParts.slice(1).join('/');
              const standardBase64 = btoa(`${containerName}/${blobName}`);
              const urlSafeBase64 = standardBase64
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
              processedUrl = `/blob-proxy?blob=${urlSafeBase64}`;
            }
          } catch (e) {
            currentIndex = linkStart + 1;
            continue;
          }
        }

        // Fix malformed URLs like https://blob-proxy?blob=... (should be /blob-proxy?blob=...)
        if (processedUrl.startsWith('https://blob-proxy') || processedUrl.startsWith('http://blob-proxy')) {
          try {
            const urlObj = new URL(processedUrl);
            const blobParam = urlObj.searchParams.get('blob');
            if (blobParam) {
              processedUrl = `/blob-proxy?blob=${blobParam}`;
            } else {
              const blobMatch = processedUrl.match(/[?&]blob=([^&\/\s]+)/);
              if (blobMatch) {
                processedUrl = `/blob-proxy?blob=${blobMatch[1]}`;
              } else {
                currentIndex = linkStart + 1;
                continue;
              }
            }
          } catch (e) {
            const blobMatch = processedUrl.match(/[?&]blob=([^&\/\s]+)/);
            if (blobMatch) {
              processedUrl = `/blob-proxy?blob=${blobMatch[1]}`;
            } else {
              currentIndex = linkStart + 1;
              continue;
            }
          }
        }

        processedUrl = processedUrl.replace(/^\/blob-proxy\/\?/, '/blob-proxy?');

        if (processedUrl.startsWith('/blob-proxy')) {
          const pageMatch = description.match(/\(Page\s+(\d+)\)/i);
          const pageNumber = pageMatch ? parseInt(pageMatch[1]) : null;
          const cleanDescription = description.replace(/\s*\(Page\s+\d+\)/i, '').trim();
          const encodedUrl = encodeURIComponent(processedUrl);
          processedParts.push(`<span class="reference-item">[${cleanDescription}] - <span class="pdf-reference-link" data-pdf-url="${encodedUrl}" data-page-number="${pageNumber || ''}" style="color: #007bff; text-decoration: underline; cursor: pointer; font-weight: 500;">Click Here for PDF</span></span>`);
          currentIndex = endIndex + 1;
        } else if (cleanUrl.includes('example.com')) {
          const blobMatch = cleanUrl.match(/[?&]blob=([^&\)]+)/);
          if (blobMatch) {
            processedUrl = `/blob-proxy?blob=${decodeURIComponent(blobMatch[1])}`;
            processedUrl = processedUrl.replace(/^\/blob-proxy\/\?/, '/blob-proxy?');
            const pageMatch = description.match(/\(Page\s+(\d+)\)/i);
            const pageNumber = pageMatch ? parseInt(pageMatch[1]) : null;
            const cleanDescription = description.replace(/\s*\(Page\s+\d+\)/i, '').trim();
            const encodedUrl = encodeURIComponent(processedUrl);
            processedParts.push(`<span class="reference-item">[${cleanDescription}] - <span class="pdf-reference-link" data-pdf-url="${encodedUrl}" data-page-number="${pageNumber || ''}" style="color: #007bff; text-decoration: underline; cursor: pointer; font-weight: 500;">Click Here for PDF</span></span>`);
            currentIndex = endIndex + 1;
          } else {
            currentIndex = linkStart + 1;
          }
        } else {
          currentIndex = linkStart + 1;
        }
      }

      processedReferences = processedParts.join('');
      const fullProcessedSection = referencesHeading + processedReferences;
      formattedContent = formattedContent.replace(referencesSectionRegex, fullProcessedSection);
    }

    // Split content into sections for better processing
    const sections = formattedContent.split(/\n\s*\n/);
    const processedSections = sections.map(section => {
      if (!section.trim()) return '';

      // Handle headings - convert #### to bullet points for better readability
      if (section.match(/^#{1,6}\s/)) {
        // Convert #### headers to bullet points for better readability
        if (section.match(/^####\s/)) {
          const content = section.replace(/^####\s/, '').trim();
          return `<div class="bullet-header"><span class="bullet-point">•</span><span class="header-content">${content}</span></div>`;
        }
        return section
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>');
      }

      // Handle tables - improved table detection and formatting
      if (section.includes('<table') || section.includes('|')) {
        // If it's already an HTML table, clean it up
        if (section.includes('<table')) {
          let cleaned = section
            .replace(/<table border='1'>/g, '<table>')
            .replace(/\n/g, '');

          // Remove inline background and color styles from th elements to let CSS handle it
          cleaned = cleaned.replace(/<th([^>]*)style="([^"]*)"([^>]*)>/gi, (match, before, styleAttr, after) => {
            // Remove background and color related styles
            const cleanedStyle = styleAttr
              .replace(/background-color[^;]*;?/gi, '')
              .replace(/background[^;]*;?/gi, '')
              .replace(/color[^;]*;?/gi, '')
              .replace(/;;+/g, ';')
              .replace(/^[\s;]+|[\s;]+$/g, '');

            // If style is empty or only whitespace, remove the style attribute entirely
            if (!cleanedStyle || cleanedStyle.trim() === '') {
              return `<th${before}${after}>`;
            }
            return `<th${before}style="${cleanedStyle}"${after}>`;
          });

          return cleaned;
        }

        // If it's a pipe-separated table, convert to HTML
        if (section.includes('|')) {
          const lines = section.split('\n').filter(line => {
            const trimmed = line.trim();
            // Filter out empty lines and separator lines (lines with only dashes, pipes, and spaces)
            return trimmed &&
              trimmed.includes('|') &&
              !trimmed.match(/^[\s\|\-\:]+$/);
          });

          if (lines.length > 0) {
            let htmlTable = '<table>';

            lines.forEach((line, index) => {
              const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);

              if (index === 0) {
                // First line is header
                htmlTable += '<thead><tr>';
                cells.forEach(cell => {
                  htmlTable += `<th>${cell}</th>`;
                });
                htmlTable += '</tr></thead><tbody>';
              } else {
                // Data rows
                htmlTable += '<tr>';
                cells.forEach(cell => {
                  htmlTable += `<td>${cell}</td>`;
                });
                htmlTable += '</tr>';
              }
            });

            htmlTable += '</tbody></table>';
            return htmlTable;
          }
        }

        return section;
      }

      // Handle lists - improved bullet point formatting
      if (section.match(/^[\-\*\+]\s/) || section.match(/^\d+\.\s/)) {
        const listItems = section.split('\n').map(line => {
          if (line.match(/^[\-\*\+]\s/)) {
            const content = line.replace(/^[\-\*\+]\s/, '').trim();
            return `<li><span class="bullet-point">•</span><span class="list-content">${content}</span></li>`;
          } else if (line.match(/^\d+\.\s/)) {
            const content = line.replace(/^\d+\.\s/, '').trim();
            return `<li><span class="number-point">${line.match(/^\d+/)[0]}.</span><span class="list-content">${content}</span></li>`;
          }
          return line;
        }).filter(item => item.trim());

        return `<ul class="enhanced-list">${listItems.join('')}</ul>`;
      }

      // Handle numbered calculation steps (1. 2025 to 2026:)
      if (section.match(/^\d+\.\s+\d{4}\s+to\s+\d{4}:/)) {
        const content = section.trim();
        return `<div class="calculation-step">
          <div class="calc-label">Step ${content.match(/^\d+/)[0]}:</div>
          <div class="calc-formula">${content}</div>
        </div>`;
      }

      // Handle mathematical formulas - improved formatting
      if (section.includes('\\[') && section.includes('\\]')) {
        const formula = section.replace(/\\\[/g, '').replace(/\\\]/g, '').trim();
        return `<div class="math-formula">
          <div class="formula-label">Formula:</div>
          <div class="formula-content">${formula}</div>
        </div>`;
      }

      // Handle calculation steps
      if (section.includes('YoY Change') && section.includes('=')) {
        return `<div class="calculation-step">
          <div class="calc-label">Calculation:</div>
          <div class="calc-formula">${section}</div>
        </div>`;
      }

      // Handle regular paragraphs
      return `<p>${section.trim()}</p>`;
    });

    // Join sections and clean up
    formattedContent = processedSections
      .filter(section => section.trim())
      .join('\n')
      // Convert remaining line breaks within paragraphs to <br>
      .replace(/\n/g, '<br>')
      // Convert bold and italic text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '')
      // Clean up empty list items
      .replace(/<li><\/li>/g, '')
      // Fix nested elements
      .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
      .replace(/<p>(<ul>.*<\/ul>)<\/p>/gs, '$1')
      .replace(/<p>(<table>.*<\/table>)<\/p>/gs, '$1')
      .replace(/<p>(<div class="math-formula">.*<\/div>)<\/p>/gs, '$1')
      .replace(/<p>(<div class="calculation-step">.*<\/div>)<\/p>/gs, '$1');

    // Fix repeated .pdf extensions and convert remaining markdown links
    formattedContent = formattedContent.replace(
      /\[([^\]\n]{1,1000})\]\((https?:\/\/[^\s]+?\.pdf(?:\?[^\s]*)?)\)/g,
      (match, text, url) => {
        const matchIndex = formattedContent.indexOf(match);
        if (matchIndex !== -1) {
          const beforeMatch = formattedContent.substring(Math.max(0, matchIndex - 200), matchIndex);
          const afterMatch = formattedContent.substring(matchIndex, Math.min(formattedContent.length, matchIndex + match.length + 200));
          if (beforeMatch.includes('reference-item') || afterMatch.includes('reference-item')) {
            return match;
          }
        }
        if (url.startsWith('file://') || url.startsWith('http://')) {
          return text.trim();
        }
        const safeUrl = encodeURI(decodeURI(url.trim()));
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">${text.trim()}</a>`;
      }
    );

    return formattedContent;
  };

  const getDynamicStyles = (theme) => `
    :root { ${Object.entries(theme).map(([key, value]) => `${key}: ${value};`).join('\n')} }
    body { font-family: 'Inter', sans-serif; background-color: var(--background-primary); margin: 0; }
    button {
        background-color: var(--accent-color);
        color: var(--text-light);
        font-weight: 600;
        font-size: 0.875rem;
        padding: 0.5rem 1.5rem;
        border-radius: 0.375rem;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    button:hover:not(:disabled) {
        background-color: var(--accent-color-hover);
    }
    button:disabled {
        background-color: var(--text-secondary);
        cursor: not-allowed;
    }
    .predefined-question-btn {
        text-align: left;
        padding: 0.75rem 1rem;
        background-color: var(--background-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        width: 100%;
        height: auto;
        line-height: 1.4;
    }
    .feedback-btn {
        background-color: transparent;
        padding: 0.2rem;
        height: auto;
        font-size: 1rem;
    }
    
    /* Table Styling */
    table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.8rem 0;
        font-size: 0.9rem;
        background-color: var(--background-secondary);
        border-radius: 0.5rem;
        overflow: hidden;
        box-shadow: 0 2px 4px var(--shadow-color);
    }
    
    th, td {
        border: 1px solid var(--border-color);
        padding: 0.6rem 0.8rem;
        text-align: left;
        vertical-align: top;
        line-height: 1.4;
    }
    
    th {
        background-color: var(--accent-color) !important;
        color: var(--text-light) !important;
        font-weight: 600;
        text-align: center;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    thead th {
        background-color: var(--accent-color) !important;
        color: var(--text-light) !important;
        position: sticky;
        top: 0;
        z-index: 10;
    }
    
    td {
        color: var(--text-primary);
        font-size: 0.9rem;
    }
    
    tr:nth-child(even) {
        background-color: rgba(0, 0, 0, 0.02);
    }
    
    tr:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
    
    /* Table responsive styling */
    @media (max-width: 768px) {
        table {
            font-size: 0.8rem;
        }
        
        th, td {
            padding: 0.4rem 0.6rem;
        }
    }
    
    /* Math Formula Styling */
    .math-formula {
        background-color: var(--background-secondary);
        padding: 0.8rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
        font-family: 'Courier New', monospace;
        border-left: 4px solid var(--accent-color);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .formula-label {
        font-weight: 600;
        color: var(--accent-color);
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .formula-content {
        font-size: 1.1rem;
        color: var(--text-primary);
        line-height: 1.4;
    }
    
    /* Calculation Step Styling */
    .calculation-step {
        background-color: var(--background-secondary);
        padding: 0.8rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
        border-left: 4px solid var(--accent-color);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .calc-label {
        font-weight: 600;
        color: var(--accent-color);
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .calc-formula {
        font-family: 'Courier New', monospace;
        font-size: 1rem;
        color: var(--text-primary);
        line-height: 1.4;
    }
    
    /* Enhanced List Styling */
    .enhanced-list {
        margin: 0.5rem 0;
        padding-left: 0;
        list-style: none;
    }
    
    .enhanced-list li {
        display: flex;
        align-items: flex-start;
        margin: 0.4rem 0;
        padding: 0.4rem;
        background-color: var(--background-secondary);
        border-radius: 0.375rem;
        border-left: 3px solid var(--accent-color);
        transition: all 0.2s ease;
    }
    
    .enhanced-list li:hover {
        background-color: rgba(0, 0, 0, 0.02);
        transform: translateX(2px);
    }
    
    .bullet-point {
        color: var(--accent-color);
        font-weight: bold;
        font-size: 1.2rem;
        margin-right: 0.75rem;
        margin-top: 0.1rem;
        flex-shrink: 0;
    }
    
    .number-point {
        color: var(--accent-color);
        font-weight: bold;
        font-size: 1rem;
        margin-right: 0.75rem;
        margin-top: 0.1rem;
        flex-shrink: 0;
        min-width: 2rem;
    }
    
    .list-content {
        color: var(--text-primary);
        line-height: 1.5;
        flex: 1;
    }
    
    /* Content Styling */
    .assistant-content {
        line-height: 1.6;
    }
    
    .assistant-content h1, .assistant-content h2, .assistant-content h3, 
    .assistant-content h4, .assistant-content h5, .assistant-content h6 {
        margin: 1.5rem 0 0.75rem 0;
        font-weight: 600;
        line-height: 1.3;
    }
    
    .assistant-content h1 {
        font-size: 1.75rem;
        color: var(--accent-color);
        border-bottom: 3px solid var(--accent-color);
        padding-bottom: 0.5rem;
        margin-top: 0;
    }
    
    .assistant-content h2 {
        font-size: 1.5rem;
        color: var(--accent-color);
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 0.25rem;
    }
    
    .assistant-content h3 {
        font-size: 1.25rem;
        color: var(--text-primary);
        font-weight: 700;
    }
    
    .assistant-content h4 {
        font-size: 1.125rem;
        color: var(--text-primary);
        font-weight: 600;
    }
    
    .assistant-content h5 {
        font-size: 1rem;
        color: var(--text-secondary);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .assistant-content h6 {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .assistant-content p {
        margin: 0.75rem 0;
        color: var(--text-primary);
        text-align: justify;
        line-height: 1.6;
    }
    
    /* Bullet Header Styling */
    .bullet-header {
        display: flex;
        align-items: flex-start;
        margin: 0.5rem 0;
        padding: 0.5rem;
        background-color: var(--background-secondary);
        border-radius: 0.375rem;
        border-left: 3px solid var(--accent-color);
    }
    
    .bullet-header .bullet-point {
        color: var(--accent-color);
        font-weight: bold;
        font-size: 1.2rem;
        margin-right: 0.75rem;
        margin-top: 0.1rem;
        flex-shrink: 0;
    }
    
    .bullet-header .header-content {
        color: var(--text-primary);
        font-weight: 600;
        font-size: 1rem;
        line-height: 1.4;
        flex: 1;
    }
    
    .assistant-content ul, .assistant-content ol {
        margin: 0.75rem 0;
        padding-left: 1.5rem;
    }
    
    .assistant-content li {
        margin: 0.25rem 0;
        color: var(--text-primary);
        line-height: 1.5;
    }
    
    .assistant-content strong {
        color: var(--accent-color);
        font-weight: 700;
    }
    
    .assistant-content em {
        font-style: italic;
        color: var(--text-secondary);
        font-weight: 500;
    }
    
    .assistant-content br {
        line-height: 1.2;
    }
    
    .assistant-content blockquote {
        border-left: 4px solid var(--accent-color);
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: var(--text-secondary);
        background-color: var(--background-secondary);
        padding: 1rem;
        border-radius: 0.375rem;
    }
    
    .assistant-content code {
        background-color: var(--background-secondary);
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        color: var(--accent-color);
        font-weight: 600;
    }
    
    .assistant-content pre {
        background-color: var(--background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin: 1rem 0;
        border: 1px solid var(--border-color);
    }
    
    .assistant-content pre code {
        background-color: transparent;
        padding: 0;
        color: var(--text-primary);
        font-weight: normal;
    }
    
    
    .assistant-content ul, .assistant-content ol {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
    }
    
    .assistant-content li {
        margin-bottom: 0.25rem;
        line-height: 1.5;
    }
    
    .assistant-content table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1rem;
        border: 1px solid var(--border-color);
    }
    
    .assistant-content th, .assistant-content td {
        padding: 0.5rem;
        text-align: left;
        border: 1px solid var(--border-color);
    }
    
    .assistant-content th {
        background-color: var(--background-secondary);
        font-weight: 600;
    }
    
    .assistant-content code {
        background-color: var(--background-secondary);
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
    }
    
    .assistant-content pre {
        background-color: var(--background-secondary);
        padding: 1rem;
        border-radius: 0.375rem;
        overflow-x: auto;
        margin-bottom: 1rem;
    }
    
    .assistant-content pre code {
        background-color: transparent;
        padding: 0;
    }
    
    .assistant-content blockquote {
        border-left: 4px solid var(--accent-color);
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: var(--text-secondary);
    }
    
    .assistant-content strong {
        font-weight: 600;
    }
    
    .assistant-content a {
        color: var(--accent-color);
        text-decoration: underline;
    }
    
    .assistant-content a:hover {
        text-decoration: none;
    }
    
    /* Reference Items Styling */
    .reference-item {
        display: block;
        margin: 0.75rem 0;
        padding: 0.5rem;
        line-height: 1.6;
        color: var(--text-primary);
    }
    
    .pdf-reference-link {
        color: #007bff !important;
        text-decoration: underline !important;
        cursor: pointer !important;
        font-weight: 500 !important;
        transition: color 0.2s ease;
    }
    
    .pdf-reference-link:hover {
        color: #0056b3 !important;
        text-decoration: underline !important;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
  `;

  return (
    <>
      <style>{getDynamicStyles(theme)}</style>
      {pdfViewer.isOpen && (
        <PDFViewer
          pdfUrl={pdfViewer.url}
          pageNumber={pdfViewer.pageNumber}
          onClose={closePdfViewer}
          theme={theme}
          useBaseUrl2={true}
        />
      )}
      <main style={{ height: '100vh', backgroundColor: 'var(--background-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MainContentHeader theme={theme} setTheme={setTheme} />

        <div style={{ flex: 1, padding: '1.5rem', backgroundColor: 'var(--background-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>Operational Copilot</h2>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--background-secondary)', border: `1px solid var(--border-color)`, borderRadius: '0.5rem', padding: '1.5rem' }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
              {chatHistory.length === 0 && !isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>How can I help you today?</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', marginTop: '0.5rem' }}>Select a question below or type your own to get started.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: '800px' }}>
                    <button className="predefined-question-btn" onClick={() => handleSubmit("Compare the latest financial data between Ather and Ola for FY2025 ")} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}>What are the peak congestion hours for Departure Entry at Terminal 1 versus Terminal 2</button>
                    <button className="predefined-question-btn" onClick={() => handleSubmit("Analyze latest financial data for Ather for FY2025")} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}>Compare the ratio of Aerobridge vs. Bus boarding usage between Domestic and International operations at Terminal 2</button>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, index) => (
                  <div key={msg.id || index} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ maxWidth: '80%', padding: '1rem', borderRadius: '0.75rem', backgroundColor: msg.role === 'user' ? 'var(--user-bubble-bg)' : 'var(--assistant-bubble-bg)', color: 'var(--text-primary)' }}>
                      {msg.role === 'assistant' && msg.plan && (
                        <details style={{ marginBottom: '1rem' }}>
                          <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>View Plan</summary>
                          <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>{msg.plan.map((step, i) => <li key={i}>{step}</li>)}</ol>
                        </details>
                      )}
                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <details style={{ marginBottom: '1rem' }}>
                          <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>📚 Enhanced References (with page numbers, sections, tables)</summary>
                          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                            {msg.sources.map((source, i) => {
                              // Filter out file:// and http:// URLs - only allow https:// and /blob-proxy
                              if (source.url && (source.url.startsWith('file://') || source.url.startsWith('http://'))) {
                                return null; // Skip this source
                              }
                              const isPlaceholder = source.url && source.url.startsWith('#');
                              const isBlobUrl = source.url && (source.url.startsWith('https://') && source.url.includes('blob.core.windows.net'));
                              const isProxyUrl = source.url && source.url.startsWith('/blob-proxy');

                              // Enhanced citation information
                              const pageNumber = source.page_number;
                              const sectionRefs = source.section_references || [];
                              const tableRefs = source.table_references || [];
                              const figureRefs = source.figure_references || [];
                              const sectionInfo = source.section_info || [];
                              const tableInfo = source.table_info || [];
                              const figureInfo = source.figure_info || [];

                              // Build detailed citation text
                              const citationParts = [];
                              if (pageNumber) {
                                citationParts.push(`Page ${pageNumber}`);
                              }
                              if (sectionRefs.length > 0) {
                                const sectionText = sectionRefs.slice(0, 3).map(s => `Section ${s}`).join(', ');
                                const moreSections = sectionRefs.length > 3 ? ` and ${sectionRefs.length - 3} more` : '';
                                citationParts.push(`Sections: ${sectionText}${moreSections}`);
                              }
                              if (tableRefs.length > 0) {
                                const tableText = tableRefs.slice(0, 3).map(t => `Table ${t}`).join(', ');
                                const moreTables = tableRefs.length > 3 ? ` and ${tableRefs.length - 3} more` : '';
                                citationParts.push(`Tables: ${tableText}${moreTables}`);
                              }
                              if (figureRefs.length > 0) {
                                const figureText = figureRefs.slice(0, 3).map(f => `Figure ${f}`).join(', ');
                                const moreFigures = figureRefs.length > 3 ? ` and ${figureRefs.length - 3} more` : '';
                                citationParts.push(`Figures: ${figureText}${moreFigures}`);
                              }

                              // Create enhanced display text - only add citation parts if filename_or_title doesn't already contain them
                              const hasExistingCitation = source.filename_or_title && source.filename_or_title.includes('(Page');
                              const enhancedTitle = citationParts.length > 0 && !hasExistingCitation
                                ? `${source.filename_or_title} (${citationParts.join(', ')})`
                                : source.filename_or_title;

                              // Get content for description/summary
                              const content = source.content || '';
                              const contentPreview = content.length > 300
                                ? content.substring(0, 300) + '...'
                                : content;

                              // Check if this is a PDF that can be viewed
                              // Proxy URLs are assumed to be PDFs (they come from blob storage)
                              const isPdfUrl = (isBlobUrl || isProxyUrl) && (source.url && (source.url.includes('.pdf') || source.url.includes('blob.core.windows.net') || isProxyUrl));

                              return (
                                <li key={i} style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                                  {isBlobUrl || isProxyUrl ? (
                                    <div>
                                      {isPdfUrl ? (
                                        <span
                                          onClick={() => {
                                            const fullUrl = getBlobProxyUrl(source.url, true);
                                            openPdfViewer(fullUrl, pageNumber);
                                          }}
                                          style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer', fontWeight: '500' }}
                                          title="Click to open PDF viewer"
                                        >
                                          📄 {enhancedTitle}
                                        </span>
                                      ) : (
                                        <a
                                          href={isProxyUrl ? getBlobProxyUrl(source.url, true) : source.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500' }}
                                          title={`Open document: ${source.filename_or_title}`}
                                        >
                                          📄 {enhancedTitle}
                                        </a>
                                      )}
                                      {contentPreview && (
                                        <div style={{ fontSize: '0.9em', color: '#495057', marginTop: '0.5rem', lineHeight: '1.4', fontStyle: 'italic' }}>
                                          <strong>Content:</strong> {contentPreview}
                                        </div>
                                      )}
                                    </div>
                                  ) : isPlaceholder ? (
                                    <div>
                                      <span style={{ color: '#666', fontStyle: 'italic' }}>
                                        📄 {enhancedTitle}
                                      </span>
                                      {contentPreview && (
                                        <div style={{ fontSize: '0.9em', color: '#495057', marginTop: '0.5rem', lineHeight: '1.4', fontStyle: 'italic' }}>
                                          <strong>Content:</strong> {contentPreview}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'none' }}>
                                        🔗 {enhancedTitle}
                                      </a>
                                      {contentPreview && (
                                        <div style={{ fontSize: '0.9em', color: '#495057', marginTop: '0.5rem', lineHeight: '1.4', fontStyle: 'italic' }}>
                                          <strong>Content:</strong> {contentPreview}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      )}
                      <div
                        className="assistant-content"
                        dangerouslySetInnerHTML={{
                          __html: msg.content === 'Thinking...'
                            ? `<div style="display: flex; align-items: center; gap: 0.75rem; color: var(--text-secondary);">
                                 <div style="width: 20px; height: 20px; border: 2px solid var(--border-color); border-top: 2px solid var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                 <span>Thinking...</span>
                               </div>`
                            : formatContent(msg.content)
                        }}
                      />
                      {msg.role === 'assistant' && !isLoading && msg.content && msg.content !== 'Thinking...' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid var(--border-color)` }}>
                          <button onClick={() => handleDownload(msg)} disabled={isDownloading} style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', height: 'auto' }}>
                            {isDownloading ? '...' : 'Download'}
                          </button>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                            <button className="feedback-btn" onClick={() => handleFeedback(msg.id, 'like')} disabled={!!msg.feedback}>👍</button>
                            <button className="feedback-btn" onClick={() => handleFeedback(msg.id, 'dislike')} disabled={!!msg.feedback}>👎</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid var(--border-color)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                  placeholder="Ask a question..."
                  rows="1"
                  disabled={isLoading}
                  style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', resize: 'none', outline: 'none', backgroundColor: 'var(--background-secondary)', color: 'var(--text-primary)' }}
                />
                <button onClick={() => handleSubmit()} disabled={isLoading || !userInput}>
                  {isLoading ? '...' : 'Ask'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default ConversationalAgent;
