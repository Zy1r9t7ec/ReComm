const API_BASE = 'http://localhost:8000/api/v1';

export const api = {
  returns: {
    initiate: async (payload) => {
      const res = await fetch(`${API_BASE}/returns/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.json();
    },
    resolveTroubleshooter: async (returnId, resolved) => {
      const res = await fetch(`${API_BASE}/returns/${returnId}/troubleshooter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved })
      });
      return res.json();
    },
    uploadMedia: async (returnId, blob, onProgress) => {
      // Mock chunked upload to GCS signed URL to respect prototype constraints
      return new Promise((resolve, reject) => {
        let progress = 0;
        
        const sendChunk = () => {
          // Jitter between 1.5s - 4.0s representing slow mobile bandwidth
          const jitterDelay = Math.random() * 2500 + 1500; 
          progress += Math.floor(Math.random() * 15) + 10; // Advancing 10-25%
          if (progress > 100) progress = 100;
          
          if (onProgress) onProgress(progress);
          
          if (progress >= 100) {
            resolve({ status: 'success', upload_id: 'up_' + Date.now() });
          } else {
            setTimeout(sendChunk, jitterDelay);
          }
        };
        
        // Start first chunk
        setTimeout(sendChunk, 1000);
      });
    },
    startInspection: async (returnId) => {
      const res = await fetch(`${API_BASE}/returns/${returnId}/inspect`, {
        method: 'POST'
      });
      return res.json();
    }
  }
};
