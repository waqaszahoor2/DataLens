// public/pyodide-worker.js

importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

let pyodide = null;
let initPromise = null;

async function initPyodide() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });
    // Load common pandas, numpy, and scipy packages
    await pyodide.loadPackage(['pandas', 'numpy', 'scipy']);
    self.postMessage({ type: 'ready' });
  })();

  return initPromise;
}

// Start loading immediately
initPyodide().catch(err => {
  self.postMessage({ type: 'error', error: 'Failed to initialize Pyodide: ' + err.message });
});

self.onmessage = async (e) => {
  const { code, csvData, id } = e.data;
  
  try {
    await initPyodide();

    // Set variables in pyodide globals
    pyodide.globals.set('csv_data', csvData);
    pyodide.globals.set('_user_code', code);

    // Run execution and catch stdout/results
    const result = await pyodide.runPythonAsync(`
import pandas as pd
import numpy as np
import io
import sys
import contextlib
import json

# Load the dataframe from CSV
df = pd.read_csv(io.StringIO(csv_data))

_buf = io.StringIO()
_error = None

try:
    with contextlib.redirect_stdout(_buf):
        # Create a local dictionary for execution so df is mutable and output is captured
        _locs = {'df': df, 'pd': pd, 'np': np}
        exec(_user_code, _locs)
        # Update the df variable in case it was reassigned inside exec
        if 'df' in _locs:
            df = _locs['df']
except Exception as ex:
    import traceback
    _error = traceback.format_exc()

_console_output = _buf.getvalue()
_result_csv = "" if _error else df.to_csv(index=False)
_shape = "" if _error else str(df.shape)
_dtypes = "{}" if _error else df.dtypes.to_json()

json.dumps({
    "console": _console_output,
    "csv": _result_csv,
    "shape": _shape,
    "dtypes": _dtypes,
    "error": _error
})
`);

    const parsed = JSON.parse(result);
    if (parsed.error) {
      self.postMessage({ type: 'error', id, error: parsed.error, console: parsed.console });
    } else {
      self.postMessage({
        type: 'success',
        id,
        console: parsed.console,
        csv: parsed.csv,
        shape: parsed.shape,
        dtypes: parsed.dtypes
      });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, error: err.message });
  }
};
