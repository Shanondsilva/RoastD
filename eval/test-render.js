const React = require('react');
const ReactDOMServer = require('react-dom/server');
const babel = require('@babel/core');
const fs = require('fs');

const raw = fs.readFileSync('public/Roastd.jsx', 'utf8');
const transformed = babel.transformSync(raw, { presets: ['@babel/preset-react'] }).code;

// Set up globals
global.React = React;
global.window = {
  innerWidth: 1024,
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { hash: '' },
  localStorage: { getItem: () => null, setItem: () => {} },
  scrollTo: () => {}
};
global.document = {
  createElement: () => ({ setAttribute: () => {} }),
  head: { appendChild: () => {} },
  querySelector: () => null
};

// Evaluate the transformed code to get Roastd
const module = { exports: {} };
const wrapper = new Function('exports', 'require', 'module', 'global', 'window', 'document', 'React', transformed + '\nmodule.exports = Roastd;');
wrapper(module.exports, require, module, global, global.window, global.document, React);

const Roastd = module.exports;

try {
  const html = ReactDOMServer.renderToString(React.createElement(Roastd));
  console.log("Rendered successfully!", html.substring(0, 100));
} catch (e) {
  console.error(e.stack);
}
