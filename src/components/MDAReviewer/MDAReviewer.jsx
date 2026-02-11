import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { API_CONFIG, getBlobProxyUrl } from '../../config';
import PDFViewer from '../ui/PDFViewer/PDFViewer';

// --- THEME DEFINITIONS ---
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
    '--integrate-btn-bg': '#22c55e',
    '--integrate-btn-hover-bg': '#16a34a',
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
    '--integrate-btn-bg': '#34d399',
    '--integrate-btn-hover-bg': '#10b981',
  },
};

// --- UI COMPONENTS ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>;

const MainContentHeader = ({ theme, setTheme, onDownload, isReportGenerated, isDownloading }) => (
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
      {isReportGenerated && (
        <button onClick={onDownload} disabled={isDownloading} style={{
          fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: isDownloading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        }}
        >          {isDownloading ? 'Downloading...' : 'Download Report'}
        </button>
      )}
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

const Source = ({ source, onPdfClick, extractPageNumber }) => {
  // Filter out file:// and http:// URLs - only allow https:// and /blob-proxy
  if (source.url && (source.url.startsWith('file://') || source.url.startsWith('http://'))) {
    return null; // Don't render this source
  }
  const isProxyUrl = source.url && source.url.startsWith('/blob-proxy');
  const isBlobUrl = source.url && (source.url.startsWith('https://') && source.url.includes('blob.core.windows.net'));
  const isPdfUrl = source.url && (source.url.includes('.pdf') || isBlobUrl || isProxyUrl);
  const pageNumber = isPdfUrl ? (source.page_number || extractPageNumber(source.filename_or_title || '')) : null;

  return (
    <details style={{ marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem' }}>
      <summary style={{ fontWeight: 'bold', cursor: 'pointer', color: 'var(--accent-color)' }}>
        {isPdfUrl ? (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Convert proxy URL to full URL if needed
              const fullUrl = isProxyUrl ? getBlobProxyUrl(source.url) : source.url;
              onPdfClick(fullUrl, pageNumber);
            }}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            title="Click to open PDF viewer"
          >
            📄 {source.filename_or_title || 'Source'}
          </span>
        ) : (
          source.filename_or_title || 'Source'
        )}
      </summary>
      <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.8rem', backgroundColor: 'var(--background-primary)', padding: '0.5rem', borderRadius: '4px' }}>
        {source.content || 'No snippet available.'}
      </p>
    </details>
  );
};

const AnalysisProgress = ({ progress }) => {
  if (!progress.length) return null;
  return (
    <div style={{ paddingTop: '1rem' }}>
      {progress.map((item, index) => (
        <div key={index} style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.title}</p>
          {item.status === 'completed' ? (
            <p style={{ margin: '0.25rem 0', color: 'var(--accent-color)' }}>✓ Completed</p>
          ) : (
            <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>In progress...</p>
          )}
        </div>
      ))}
    </div>
  );
};

// --- MDA REVIEWER COMPONENT ---
function MDAReviewer() {
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState(themes.bial_style);
  const [file, setFile] = useState(null);
  const [analysisCategory, setAnalysisCategory] = useState('EV Market Status');
  const [specificAnalysis, setSpecificAnalysis] = useState('EV Market status');
  const [model, setModel] = useState('gpt-4o-mini');
  const [wordCount, setWordCount] = useState(2000);
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [mainReport, setMainReport] = useState('');
  const [allSources, setAllSources] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isProgressVisible, setIsProgressVisible] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState([]);
  const fileInputRef = useRef(null);
  const API_BASE_URL = API_CONFIG.BASE_URL;
  const [pdfViewer, setPdfViewer] = useState({ isOpen: false, url: null, pageNumber: null });

  // const analysisPromptsConfig = {
  //   "Compare Revenue for Ather and Ola": ["Compare revenue between Ather and Ola"],
  //   "Compare Costs for Ather and Ola": ["Compare costs between Ather and Ola (single cost)"],
  //   "Compare EBITDA Margin between Ather and Ola": ["Compare EBITDA margin between Ather and Ola"],
  //   "Compare CapEx between Ather and Ola": ["Compare capex between Ather and Ola"],
  //   "Growth plans of Ather or Ola": ["Comment on growth plans of Ather or Ola"],
  //   "Market Analysis for EV industry": ["Market analysis for EV industry"],
  //   "EV Market analysis": ["EV market analysis"],
  //   "Telecom Market Analysis": ["Telecom Market Analysis"],
  //   "Broadcasting Market Analysis": ["Broadcasting Market Analysis"]
  // };

  const analysisPromptsConfig = {
    "EV Market Status": ["EV Market status"],
    "EV Adoption Market impacts": ["EV adoption market impacts"],
    "EV Market Competition": ["EV market competition"],
    "EV Market Segment": ["EV market segment"],
    "2G Phase Out": ["2G Phase Out"],
    "5G Profitability Analysis": ["5G profitability analysis"],
    "Jio Market Analysis": ["Jio market analysis"],
    "Telecom Market Growth Analysis": ["Telecom Market Growth Analysis"],
    "Broadcasting Market Health Analysis": ["Broadcasting Market Health Analysis"],
    "Zee Strategy Analysis": ["Zee Strategy analysis"]
  };


  useEffect(() => {
    if (analysisCategory && analysisPromptsConfig[analysisCategory]) {
      setSpecificAnalysis(analysisPromptsConfig[analysisCategory][0]);
    }
  }, [analysisCategory]);

  // Clear report/chat on logout
  useEffect(() => {
    const clearOnLogout = () => {
      setFile(null);
      setMainReport('');
      setAllSources([]);
      setChatHistory([]);
      setAnalysisProgress([]);
      setUserInput('');
      setError('');
    };
    window.addEventListener('userLoggedOut', clearOnLogout);
    return () => window.removeEventListener('userLoggedOut', clearOnLogout);
  }, []);

  // --- PDF VIEWER HANDLERS ---
  const handlePdfLinkClick = useCallback((url, pageNumber = null) => {
    // Convert proxy URL to full URL if needed
    const fullUrl = url && url.startsWith('/blob-proxy') ? getBlobProxyUrl(url) : url;
    setPdfViewer({ isOpen: true, url: fullUrl, pageNumber });
  }, []);

  // Attach click handlers to PDF links after content is rendered (event delegation)
  useEffect(() => {
    const handlePdfLinkClickEvent = (e) => {
      const target = e.target.closest('.pdf-link-mda');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        let pdfUrl = decodeURIComponent(target.getAttribute('data-pdf-url'));
        const pageNumberAttr = target.getAttribute('data-page-number');
        const pageNumber = pageNumberAttr && pageNumberAttr !== '' ? parseInt(pageNumberAttr) : null;

        // Reject file:// and http:// URLs
        if (pdfUrl.startsWith('file://') || pdfUrl.startsWith('http://')) {
          return; // Don't open insecure URLs
        }

        // Convert https:// blob storage URLs to proxy URLs
        if (pdfUrl.startsWith('https://') && pdfUrl.includes('blob.core.windows.net')) {
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
                .replace(/=/g, ''); // Remove padding (backend uses rstrip('='))
              pdfUrl = `/blob-proxy?blob=${urlSafeBase64}`;
            }
          } catch (e) {
            console.error('Error converting blob URL to proxy:', e);
            return; // Don't open if conversion fails
          }
        }

        // Convert proxy URL to full URL if needed
        if (pdfUrl.startsWith('/blob-proxy')) {
          pdfUrl = getBlobProxyUrl(pdfUrl);
        }

        handlePdfLinkClick(pdfUrl, pageNumber);
      }
    };

    // Attach event listener to document for event delegation
    document.addEventListener('click', handlePdfLinkClickEvent);

    return () => {
      document.removeEventListener('click', handlePdfLinkClickEvent);
    };
  }, [handlePdfLinkClick]);

  const handleFileChange = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setMainReport('');
      setChatHistory([]);
      setAnalysisProgress([]);
    }
  };

  const handleGenerateReport = async () => {
    const currentPrompt = useCustomPrompt ? customPrompt : specificAnalysis;
    // if (!file || !currentPrompt) {
    //   setError("Please upload a file and select or provide an analysis prompt.");
    //   return;
    // }
    setIsLoadingReport(true);
    setIsProgressVisible(true);
    setMainReport('');
    setAllSources([]);
    setChatHistory([]);
    setError('');
    setAnalysisProgress([]);
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    formData.append('analysis_title', useCustomPrompt ? "Custom Analysis" : specificAnalysis);
    formData.append('custom_prompt', useCustomPrompt ? customPrompt : "");
    formData.append('model', model);
    formData.append('word_count', wordCount);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/analyze-document`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`Server responded with ${response.status}: ${errorData.detail || response.statusText}`);
      }
      if (!response.body) throw new Error("Response body is null");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedData = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedData += decoder.decode(value, { stream: true });
        const lines = accumulatedData.split('\n\n');
        accumulatedData = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = JSON.parse(line.substring(6));
            if (eventData.type === 'step_start') {
              setAnalysisProgress(prev => [...prev, { title: `Step ${eventData.step}/${eventData.total}: ${eventData.title}`, status: 'running' }]);
            } else if (eventData.type === 'step_result') {
              setAnalysisProgress(prev => prev.map((p, i) => i === prev.length - 1 ? { ...p, status: 'completed' } : p));
            } else if (eventData.type === 'refine_start') {
              setAnalysisProgress(prev => [...prev, { title: eventData.message, status: 'running' }]);
            } else if (eventData.type === 'final_report') {
              setAnalysisProgress(prev => prev.map((p, i) => i === prev.length - 1 ? { ...p, status: 'completed' } : p));
              setMainReport(eventData.report);
              setAllSources(eventData.sources);
            } else if (eventData.type === 'error') {
              setError(eventData.message);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || "Failed to generate report stream.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!userInput.trim()) return;

    // Debug authentication status
    const token = localStorage.getItem('authToken');

    const webSearchKeywords = ["web search", "latest", "current", "internet"];
    const isWebSearch = webSearchKeywords.some(keyword => userInput.toLowerCase().includes(keyword));
    const loadingMessageContent = isWebSearch ? 'Searching the web...' : 'Searching internal documents...';
    const newUserMessage = { role: 'user', content: userInput };
    const loadingMessage = { role: 'assistant', content: loadingMessageContent, id: Date.now() };
    const newHistory = [...chatHistory, newUserMessage, loadingMessage];
    setChatHistory(newHistory);
    setUserInput('');
    setIsLoadingChat(true);
    try {
      const sanitizedHistory = newHistory.slice(0, -2).map(({ role, content }) => ({ role, content }));
      const headers = getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/mda-chat`, {
        question: userInput,
        history: sanitizedHistory
      }, { headers });
      setChatHistory(prev => prev.map(msg =>
        msg.id === loadingMessage.id ? {
          ...msg,
          content: response.data.answer,
          plan: response.data.plan,
          sources: response.data.sources,
          source: response.data.source
        } : msg
      ));
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to get chat response.";
      setChatHistory(prev => prev.map(msg =>
        msg.id === loadingMessage.id ? { ...msg, content: `Error: ${errorMessage}`, plan: [], sources: [] } : msg
      ));
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleIntegrateReport = async (newInfo, messageId) => {
    if (!mainReport || !newInfo) return;
    setIsLoadingReport(true);
    setError('');
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/refine-report`, {
        original_report: mainReport,
        new_info: newInfo,
      }, { headers });
      if (response.data && typeof response.data.refined_report === 'string') {
        setMainReport(response.data.refined_report);
        const updatedHistory = chatHistory.map((msg) =>
          msg.id === messageId ? { ...msg, integrated: true } : msg
        );
        setChatHistory(updatedHistory);
      } else {
        setError("Received an invalid refined report from the server.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to refine the report.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!mainReport) return;
    setIsDownloading(true);
    setError('');
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/download-report`,
        { html_content: formatContent(mainReport) },
        {
          headers,
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Generated_Report.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to download the report.");
    } finally {
      setIsDownloading(false);
    }
  };

  const closePdfViewer = () => {
    setPdfViewer({ isOpen: false, url: null, pageNumber: null });
  };

  // Extract page number from reference text
  const extractPageNumber = (text) => {
    const pageMatch = text.match(/\(Page\s+(\d+)\)/i);
    return pageMatch ? parseInt(pageMatch[1], 10) : null;
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
          return section
            .replace(/<table border='1'>/g, '<table>')
            .replace(/\n/g, '');
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

    //Improved: handles spaces and parentheses
    // Step 1: Fix repeated .pdf.pdf).pdf)
    formattedContent = formattedContent.replace(
      /(\.pdf)(\.pdf)+(?=\)?)/g,
      '.pdf'
    );

    // Step 2: Clean up broken endings like .pdf).pdf) → .pdf)
    formattedContent = formattedContent.replace(
      /\.pdf\)\.pdf\)/g,
      '.pdf)'
    );

    // Step 3: Convert markdown links to <a> tags with PDF viewer functionality
    // Only match https:// URLs and proxy URLs (/blob-proxy), reject file:// and http:// URLs
    formattedContent = formattedContent.replace(
      /\[([^\]\n]{1,1000})\]\((https:\/\/[^\s]+\.pdf|\/blob-proxy[^\s\)]+)\)/g,
      (match, text, url) => {
        // Reject file:// and http:// URLs
        if (url.startsWith('file://') || url.startsWith('http://')) {
          return text.trim(); // Return just the text without link
        }
        const safeUrl = encodeURIComponent(decodeURI(url.trim()));
        const pageNumber = extractPageNumber(text);
        // Use data attributes instead of inline onclick for better security and reliability
        return `<a href="#" class="pdf-link-mda" data-pdf-url="${safeUrl}" data-page-number="${pageNumber || ''}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${text.trim()}</a>`;
      }
    );

    // Also handle https:// blob storage URLs and convert them to proxy URLs
    formattedContent = formattedContent.replace(
      /\[([^\]\n]{1,1000})\]\((https:\/\/[^\s]*blob\.core\.windows\.net[^\s\)]+)\)/g,
      (match, text, url) => {
        // Convert blob storage URL to proxy URL
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          if (pathParts.length >= 2) {
            const containerName = pathParts[0];
            const blobName = pathParts.slice(1).join('/');
            // Encode as URL-safe base64 for proxy URL (matching backend format)
            const standardBase64 = btoa(`${containerName}/${blobName}`);
            const urlSafeBase64 = standardBase64
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=/g, ''); // Remove padding (backend uses rstrip('='))
            const proxyUrl = `/blob-proxy?blob=${urlSafeBase64}`;
            const safeUrl = encodeURIComponent(proxyUrl);
            const pageNumber = extractPageNumber(text);
            return `<a href="#" class="pdf-link-mda" data-pdf-url="${safeUrl}" data-page-number="${pageNumber || ''}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${text.trim()}</a>`;
          }
        } catch (e) {
          // If parsing fails, return just the text
          return text.trim();
        }
        return text.trim();
      }
    );

    return formattedContent;
  };

  const getDynamicStyles = (theme) => `
    :root { ${Object.entries(theme).map(([key, value]) => `${key}: ${value};`).join('\n')} }
    body { font-family: 'Inter', sans-serif; background-color: var(--background-primary); margin: 0; }
    select, input, textarea, button { font-family: inherit; }
    label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: var(--text-primary); }
    select, input[type=text], input[type=number], textarea { 
        width: 100%; 
        padding: 0.5rem 0.75rem; 
        font-size: 0.875rem; 
        border: 1px solid var(--border-color); 
        border-radius: 0.375rem; 
        background-color: var(--background-secondary);
        color: var(--text-primary);
        box-sizing: border-box;
    }
    textarea { resize: vertical; }
    button {
        background-color: var(--accent-color);
        color: var(--text-light);
        font-weight: 600;
        font-size: 0.875rem;
        padding: 0.5rem 1.5rem;
        border-radius: 0.375rem;
        border: none;
        height: 2.5rem;
        cursor: pointer;
        transition: background-color 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    button:hover:not(:disabled) { background-color: var(--accent-color-hover); }
    button:disabled { background-color: var(--text-secondary); cursor: not-allowed; }
    .integrate-button {
        background-color: var(--integrate-btn-bg);
        margin-top: 0.75rem;
        padding: 0.25rem 0.75rem;
        height: auto;
        font-size: 0.75rem;
    }
    .integrate-button:hover:not(:disabled) {
        background-color: var(--integrate-btn-hover-bg);
    }
    .toggle-chat-button {
        background-color: transparent;
        color: var(--text-secondary);
        font-size: 0.8rem;
        font-weight: 500;
        height: auto;
        padding: 0.25rem 0.5rem;
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
        background-color: var(--accent-color);
        color: var(--text-light);
        font-weight: 600;
        text-align: center;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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

    /* Table header styling */
    thead th {
        position: sticky;
        top: 0;
        z-index: 10;
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

    .assistant-content h1, .assistant-content h2, .assistant-content h3 {
        color: var(--text-primary);
        margin: 1rem 0 0.5rem 0;
        font-weight: 600;
    }

    .assistant-content h1 {
        font-size: 1.5rem;
        border-bottom: 2px solid var(--accent-color);
        padding-bottom: 0.5rem;
    }

    .assistant-content h2 {
        font-size: 1.3rem;
        color: var(--accent-color);
    }

    .assistant-content h3 {
        font-size: 1.1rem;
        color: var(--text-primary);
    }

    .assistant-content p {
        margin: 0.5rem 0;
        color: var(--text-primary);
        text-align: justify;
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
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }

    .assistant-content li {
        margin: 0.2rem 0;
        color: var(--text-primary);
    }

    .assistant-content strong {
        color: var(--accent-color);
        font-weight: 600;
    }

    .assistant-content em {
        font-style: italic;
        color: var(--text-secondary);
    }

    .assistant-content br {
        line-height: 1.2;
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
        />
      )}
      <main style={{ minHeight: '100vh', backgroundColor: 'var(--background-secondary)', display: 'flex', flexDirection: 'column' }}>

        {/* <main style={{ height: '100vh', backgroundColor: 'var(--background-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> */}
        <MainContentHeader
          theme={theme}
          setTheme={setTheme}
          onDownload={handleDownloadReport}
          isReportGenerated={!!mainReport}
          isDownloading={isDownloading}
        />

        <div style={{ flex: 1, padding: '1.5rem', backgroundColor: 'var(--background-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>Operations Report Generator</h2>

          {/* First Section: Settings */}
          <div style={{ backgroundColor: 'var(--background-secondary)', padding: '1rem', borderRadius: '0.5rem', border: `1px solid var(--border-color)`, marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label>Analysis Category</label>
                <select value={analysisCategory} onChange={e => setAnalysisCategory(e.target.value)} disabled={useCustomPrompt}>
                  {Object.keys(analysisPromptsConfig).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label>AI Model</label>
                <select value={model} onChange={e => setModel(e.target.value)}>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="o3-mini">o3-Mini</option>
                </select>
              </div>
              <div>
                <label>Specific Analysis</label>
                <select value={specificAnalysis} onChange={e => setSpecificAnalysis(e.target.value)} disabled={useCustomPrompt}>
                  {analysisPromptsConfig[analysisCategory]?.map(spec => <option key={spec} value={spec}>{spec}</option>)}
                </select>
              </div>
              <div>
                <label>Target Word Count</label>
                <input type="number" value={wordCount} onChange={e => setWordCount(parseInt(e.target.value, 10))} step="100" />
              </div>
              {/* <button onClick={handleGenerateReport} disabled={!file || isLoadingReport}> */}
              <button onClick={handleGenerateReport} disabled={file || isLoadingReport}>
                {isLoadingReport ? 'Analyzing...' : 'Get Analysis'}
              </button>
            </div>
          </div>

          {/* Second Section: File Upload and Custom Prompt */}
          <div style={{ backgroundColor: 'var(--background-secondary)', padding: '1rem', borderRadius: '0.5rem', border: `1px solid var(--border-color)` }}>
            {/* File Upload Section */}
            <div>
              <label>Upload File</label>
              <div onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '2.5rem', border: '2px dashed var(--border-color)', borderRadius: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{file ? file.name : 'Click to upload (.docx)'}</span>
                <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files[0])} style={{ display: 'none' }} accept=".docx" />
              </div>
            </div>

            {/* Use Custom Prompt Section */}
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={useCustomPrompt} onChange={() => setUseCustomPrompt(!useCustomPrompt)} />
                <span style={{ marginLeft: '0.5rem' }}>Use Custom Prompt</span>
              </label>
              {useCustomPrompt && (
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows="5" placeholder="Enter your multi-step analysis prompt here..." style={{ marginTop: '0.5rem' }}></textarea>
              )}
              <br></br>
              <button onClick={handleGenerateReport} disabled={!file || isLoadingReport}>
                {isLoadingReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>


          {error && <p style={{ color: 'red', textAlign: 'center', padding: '10px' }}>{error}</p>}

          <div style={{ flex: 1, marginTop: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {isLoadingReport && (
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                backgroundColor: 'var(--background-secondary)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flex: 1,
                minHeight: '300px',   // <-- make it bigger
                maxHeight: '500px'    // <-- optional, prevents it from growing too much
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Analysis Progress</h3>
                  <button onClick={() => setIsProgressVisible(!isProgressVisible)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>
                    {isProgressVisible ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                {isProgressVisible && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem 1rem' }}>
                    <AnalysisProgress progress={analysisProgress} />
                  </div>
                )}
              </div>
            )}



            {/* <div style={{ flex: 1, backgroundColor: 'var(--background-secondary)', border: `1px solid var(--border-color)`, borderRadius: '0.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> */}
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--background-primary)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {!mainReport && !isLoadingReport && (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p>Generated report will appear here</p>
                  </div>
                )}
                {mainReport && (
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Generated Report</h2>
                    <div dangerouslySetInnerHTML={{ __html: formatContent(mainReport) }} />
                    <h3 style={{ marginTop: '1.5rem' }}>Sources Used</h3>
                    {allSources.map((source, i) => <Source key={i} source={source} onPdfClick={handlePdfLinkClick} extractPageNumber={extractPageNumber} />)}
                  </div>
                )}
              </div>

              {mainReport && (
                <div style={{ borderTop: `1px solid var(--border-color)`, marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Chat & Refine</h3>
                    <button onClick={() => setIsChatVisible(!isChatVisible)} className="toggle-chat-button" >
                      {isChatVisible ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  <div style={{
                    maxHeight: isChatVisible ? '400px' : '0px',
                    opacity: isChatVisible ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.4s ease-out, opacity 0.3s ease-in-out',
                  }}>
                    <div style={{ paddingTop: '1rem' }}>
                      <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
                        {chatHistory.length === 0 && (
                          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                            No chat messages yet. Ask a question to get started!
                          </div>
                        )}
                        {chatHistory.map((msg, index) => (
                          <div key={msg.id || index} style={{ marginBottom: '0.5rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                            <div style={{ display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: msg.role === 'user' ? 'var(--user-bubble-bg)' : 'var(--assistant-bubble-bg)' }}>
                              {msg.role === 'assistant' && msg.source && msg.source !== 'error' && !msg.content.startsWith('Searching') && (
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', opacity: 0.9 }}>
                                  {msg.source === 'web' ? '🌐 Searched Web' : '🗂️ Searched Documents'}
                                </div>
                              )}
                              <div style={{ color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  {msg.sources.map((s, i) => <Source key={i} source={s} onPdfClick={handlePdfLinkClick} extractPageNumber={extractPageNumber} />)}
                                </div>
                              )}
                              {msg.role === 'assistant' && !msg.integrated && msg.content && !msg.content.startsWith('Searching') && !msg.content.startsWith('Error') && (
                                <button
                                  className="integrate-button"
                                  onClick={() => handleIntegrateReport(msg.content, msg.id)}
                                  disabled={isLoadingReport || isLoadingChat}
                                >
                                  Integrate into Report
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !isLoadingChat && handleSendChatMessage()}
                          placeholder="Type your message here to find new info..."
                          disabled={!mainReport || isLoadingChat || isLoadingReport}
                        />
                        <button onClick={handleSendChatMessage} disabled={!mainReport || isLoadingChat || isLoadingReport}>
                          {isLoadingChat ? '...' : 'Ask'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// THIS WAS THE MISSING LINE
export default MDAReviewer;