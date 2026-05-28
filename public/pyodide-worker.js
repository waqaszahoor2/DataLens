importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

let pyodide = null;
let ready = false;
let initPromise = null;

async function init() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });
    await pyodide.loadPackage(['pandas', 'numpy', 'scipy', 'micropip']);
    try {
      await pyodide.runPythonAsync(`
        import micropip
        await micropip.install('plotly')
      `);
    } catch (e) {
      console.warn("Failed to preinstall plotly:", e);
    }
    ready = true;
    self.postMessage({ type: 'ready' });
  })();

  return initPromise;
}

// Start initialization
init().catch(err => {
  self.postMessage({ type: 'error', error: 'Failed to initialize Pyodide: ' + err.message });
});

self.onmessage = async (e) => {
  try {
    await init();
  } catch (err) {
    self.postMessage({ type: 'error', error: 'Pyodide not ready yet: ' + err.message });
    return;
  }

  const { code, sheets, id } = e.data;
  // sheets = [{ name: 'Sheet1', csv: '...' }, ...]

  try {
    // Load all sheets as named dataframes
    for (const sheet of sheets) {
      const safeName = 'df_' + sheet.name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      pyodide.globals.set(`_csv_${safeName}`, sheet.csv);
      await pyodide.runPythonAsync(`
import pandas as pd, io
${safeName} = pd.read_csv(io.StringIO(_csv_${safeName}))
      `);
    }

    // Build the sheets dict
    const sheetDictCode = `sheets = {${
      sheets.map(s => {
        const safeName = 'df_' + s.name
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        return `'${s.name}': ${safeName}`;
      }).join(', ')
    }}`;
    await pyodide.runPythonAsync(sheetDictCode);

    // Also provide df as alias for the first sheet
    if (sheets.length > 0) {
      const firstName = 'df_' + sheets[0].name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      await pyodide.runPythonAsync(`df = ${firstName}`);
    } else {
      await pyodide.runPythonAsync(`df = pd.DataFrame()`);
    }

    // Run user code with output capture
    pyodide.globals.set('_user_code', code);
    const result = await pyodide.runPythonAsync(`
import contextlib, io as _io, json
import numpy as np
_buf = _io.StringIO()
_chart_json = None
_result_csv = None
_result_shape = "(0, 0)"
_result_dtypes = "{}"

with contextlib.redirect_stdout(_buf):
    _globals = globals()
    # Execute user code in global namespace
    exec(_user_code, _globals)

_console = _buf.getvalue()

# Check for output_chart (plotly figure) in globals
try:
    if 'output_chart' in _globals:
        _chart_json = _globals['output_chart'].to_json()
    elif 'output_chart' in dir():
        _chart_json = output_chart.to_json()
except Exception as ex:
    pass

# Check for result_df or df updates
try:
    if 'result_df' in _globals:
        _res_df = _globals['result_df']
    elif 'result_df' in dir():
        _res_df = result_df
    elif 'df' in _globals:
        _res_df = _globals['df']
    else:
        _res_df = df
        
    _result_csv = _res_df.to_csv(index=False)
    _result_shape = str(_res_df.shape)
    _result_dtypes = _res_df.dtypes.astype(str).to_json()
except Exception as ex:
    pass

[_console, _chart_json, _result_csv, _result_shape, _result_dtypes]
    `);

    self.postMessage({
      type: 'success',
      id,
      console: result[0],
      chartJson: result[1],
      csv: result[2],
      shape: result[3],
      dtypes: result[4],
    });

  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      error: err.message,
      traceback: err.message
    });
  }
};
