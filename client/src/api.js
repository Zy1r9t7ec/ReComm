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
        const interval = setInterval(() => {
          progress += 20;
          if (onProgress) onProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            // Inject random failure occasionally or resolve based on env 
            resolve({ status: 'success', upload_id: 'up_' + Date.now() });
          }
        }, 500); // Simulated 2.5sec upload time total
      });
    }
  }
};
