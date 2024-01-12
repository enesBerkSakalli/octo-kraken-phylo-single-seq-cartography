// Open the IndexedDB database
export async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MyDatabase', 1);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            db.createObjectStore('JsonStore', { keyPath: 'id' });
        };

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

// Retrieve data from IndexedDB
export async function getData(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['JsonStore'], 'readonly');
        const objectStore = transaction.objectStore('JsonStore');
        const request = objectStore.get(id);

        request.onsuccess = function (event) {
            resolve(event.target.result ? event.target.result.data : null);
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

// Store data in IndexedDB
export async function storeData(db, id, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['JsonStore'], 'readwrite');
        const objectStore = transaction.objectStore('JsonStore');
        const request = objectStore.put({ id: id, data: data });

        request.onsuccess = function () {
            resolve();
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

export function deepCopyJSON(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Delete data from IndexedDB
export async function deleteData(db, id) {
    return new Promise((resolve, reject) => {
        // Open a transaction as readwrite
        const transaction = db.transaction(['JsonStore'], 'readwrite');
        // Access your 'JsonStore'
        const objectStore = transaction.objectStore('JsonStore');
        // Use the delete method to remove the item
        const request = objectStore.delete(id);

        request.onsuccess = function () {
            resolve();
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}