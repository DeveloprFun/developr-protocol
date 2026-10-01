// Dynamic (script-rendered) copy. Static copy lives in index.html. Both are scanned by the
// originality gate, so keep every user-facing string here or in the HTML.
export const COPY = {
  rowsLoading: 'Fetching pool data…',
  rowsEmpty: 'The indexer sent back nothing.',
  rowsError: 'Pool data could not be loaded.',
  retry: 'Try again',
  unavailable: 'Unavailable',
  lookupBusy: 'Opening its market page in a fresh tab…',
  lookupPoolId: 'Pool identifier recognised. Launching its page…',
  lookupAddress: 'Token contract recognised. Launching its page…',
  copied: 'Copied',
  copyFailed: 'Copy failed',
  copyIdle: 'Copy',
  caIdle: 'Click to copy',
  samples: [
    'Sample voice. Someone genuine will fill this slot eventually.',
    'Filler text that shows the card shape. Nobody said this.',
    'Placeholder praise. It exists only to test spacing.',
    'Imagine a kind word here once the crowd shows up.',
  ],
  pools: (n) => `${n} ${n === 1 ? 'pool' : 'pools'}`,
};
