import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';

// Compile JSX with the same Vite defaults as the app, then actually render it.
// A production build alone does not catch a missing React runtime binding.
const source = await readFile(new URL('../src/MainNavigation.jsx', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source.replace("import './navigation.css';", ''), 'MainNavigation.jsx', { format: 'cjs' });
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', code)(
  name => {
    assert.equal(name, 'react');
    return React;
  },
  compiledModule,
  compiledModule.exports,
);
const MainNavigation = compiledModule.exports.default;

test('navigation renders without a runtime error and selects the current category', () => {
  for (const [category, label] of [['All products', 'Shop'], ['Computers', 'Computers'], ['Accessories', 'Accessories'], ['Displays', 'Displays']]) {
    const html = renderToStaticMarkup(React.createElement(MainNavigation, { page: 'shop', category, onSelect() {} }));
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    assert.match(html, new RegExp(`aria-current="page"[^>]*><span[^>]*>${label}</span>`));
    assert.equal((html.match(/href="#shop"/g) || []).length, 4);
  }
});

test('navigation has no selected shop category on the cart page', () => {
  const html = renderToStaticMarkup(React.createElement(MainNavigation, { page: 'cart', category: 'All products', onSelect() {} }));
  assert.doesNotMatch(html, /aria-current="page"/);
});
