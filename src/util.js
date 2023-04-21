export function readUrlHash() {
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
  history.pushState(null, null, `#${json}`);
}
