import getLinks from "./get-links.js";

async function checkUrl(url, startUrl) {
  const urlObj = url instanceof URL ? url : new URL(url);
  const startUrlObj = startUrl instanceof URL ? startUrl : new URL(startUrl);

  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    return { ok: true };
  }

  let status;
  let contentType;
  let contentLength;
  let lastModified;
  let eTag;
  const startTime = new Date().getTime();

  const maxRetries = 3; // Maximum number of retry attempts
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      const res = await fetch(url, { redirect: 'manual', signal });
      status = res.status;

      if (res.status >= 300 && res.status < 400) {
        const redirect = res.headers.get('location');
        return {
          responseTime: new Date().getTime() - startTime,
          ok: true,
          status,
          linksTo: [{ url: new URL(redirect, url).href, resType: 'redirect' }]
        };
      }

      if (!res.ok) {
        return {
          responseTime: new Date().getTime() - startTime,
          ok: false,
          status
        };
      }

      contentType = res.headers.get('content-type');
      contentLength = res.headers.get('content-length');
      lastModified = res.headers.get('last-modified');
      eTag = res.headers.get('etag');

      const isHtml = contentType && contentType.includes('text/html');

      if (!isHtml || urlObj.hostname !== startUrlObj.hostname) {
        controller.abort(); // throws exception in fetch and goes to catch block
      }

      const html = await res.text();
      const { links, metadata } = getLinks(html, url);

      return {
        responseTime: new Date().getTime() - startTime,
        ok: true,
        status,
        contentType,
        contentLength,
        lastModified,
        eTag,
        title: metadata.title,
        description: metadata.description,
        linksTo: links
      }
    } catch (err) {
      attempts++;
      if (attempts >= maxRetries) {
        if (err.name === 'AbortError') {
          return {
            responseTime: new Date().getTime() - startTime,
            ok: true,
            status,
            contentType,
            contentLength,
            lastModified,
            eTag
          };
        }

        const message = !!err.cause
          ? `${err.cause.code} ${err.cause.name}: ${err.cause.message}`
          : `${err.code} ${err.name}: ${err.message}`;

        return { ok: false, error: `${message}` };
      }

      // Calculate the delay before next retry
      const delay = Math.pow(2, attempts) * 100; // Exponential backoff
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

export default checkUrl;
