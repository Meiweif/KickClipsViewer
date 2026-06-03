export function checkChannelOnKick(login) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_CHANNEL', login }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      resolve(response || { ok: false, error: 'No response from extension' });
    });
  });
}
