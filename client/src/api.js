const API_BASE = '/api/v1';

export const api = {
  returns: {
    initiate: async (payload) => {
      const res = await fetch(`${API_BASE}/returns/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    },

    resolveTroubleshooter: async (returnId, resolved) => {
      const res = await fetch(`${API_BASE}/returns/${returnId}/troubleshooter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved }),
      });
      return res.json();
    },

    // Mock chunked upload — simulates slow mobile bandwidth (prototype only)
    // In production: GCS XML multipart resumable upload with signed URL
    uploadMedia: async (returnId, blob, onProgress) => {
      return new Promise((resolve) => {
        let progress = 0;
        const sendChunk = () => {
          const jitter = Math.random() * 1500 + 1000;
          progress += Math.floor(Math.random() * 18) + 8;
          if (progress > 100) progress = 100;
          if (onProgress) onProgress(progress);
          if (progress >= 100) {
            resolve({ status: 'success', upload_id: 'up_' + Date.now() });
          } else {
            setTimeout(sendChunk, jitter);
          }
        };
        setTimeout(sendChunk, 800);
      });
    },

    startInspection: async (returnId) => {
      const res = await fetch(`${API_BASE}/returns/${returnId}/inspect`, {
        method: 'POST',
      });
      return res.json();
    },

    // Poll for AI inspection result
    getReturn: async (returnId) => {
      const res = await fetch(`${API_BASE}/returns/${returnId}`);
      return res.json();
    },
  },
};
