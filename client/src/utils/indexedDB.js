const DB_NAME = 'ReCommOffline';
const STORE_NAME = 'returns';

const initDB = () => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = (e) => {
    e.target.result.createObjectStore(STORE_NAME);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const storeOfflineVideo = async (returnId, blob) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, returnId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getOfflineVideo = async (returnId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(returnId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const clearOfflineVideo = async (returnId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(returnId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
