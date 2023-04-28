import React, { useState } from 'react';

export function readUrlHash() {
  if (!window.location.hash) {
    return {};
  }

  try {
    const object = JSON.parse(
      decodeURIComponent(
        window.location.hash.substring(1)
      )
    );
    return object;
  } catch (e) {
    console.log('readUrlHash() Error:', e)
    return {};
  }
}

// Write hash json data in place. Existing keys are not touched.
export function writeUrlHash(object) {
  const mergedObject = { ...readUrlHash(), ...object };
  const json = encodeURIComponent(JSON.stringify(mergedObject));
  if (window.location.hash.substring(1) === json) {
    return;
  };

  history.pushState(null, null, `#${json}`);
}

export function useHash() {
  const [hash, setHash] = React.useState(() => window.location.hash);

  const hashChangeHandler = React.useCallback(() => {
    setHash(window.location.hash);
  }, []);

  React.useEffect(() => {
    window.addEventListener('hashchange', hashChangeHandler);
    return () => {
      window.removeEventListener('hashchange', hashChangeHandler);
    };
  }, []);

  const updateHash = React.useCallback(
    newHash => {
      if (newHash !== hash) window.location.hash = newHash;
    },
    [hash]
  );

  return [hash, updateHash];
};

export function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    }, wait);
    if (immediate && !timeout) func.apply(context, args);
  };
}