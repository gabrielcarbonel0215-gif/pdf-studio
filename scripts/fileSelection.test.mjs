import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectAcceptedFiles } from '../src/lib/fileSelection.ts';

const pdf = { name: 'report.pdf', type: 'application/pdf' };
const png = { name: 'scan.png', type: 'image/png' };
const unknownPdf = { name: 'REPORT.PDF', type: '' };
const text = { name: 'notes.txt', type: 'text/plain' };

test('PDF tools reject pasted or dropped images', () => {
  assert.deepEqual(selectAcceptedFiles([png, text], 'application/pdf', true), []);
});
test('single selection chooses the first compatible file in a mixed batch', () => {
  assert.deepEqual(selectAcceptedFiles([png, pdf, unknownPdf], 'application/pdf', false), [pdf]);
});
test('multiple selection preserves order and accepts empty-MIME PDFs', () => {
  assert.deepEqual(selectAcceptedFiles([png, unknownPdf, pdf], 'application/pdf', true), [unknownPdf, pdf]);
});
test('OCR accepts a comma-separated list with whitespace and image wildcards', () => {
  assert.deepEqual(selectAcceptedFiles([pdf, png, text], 'application/pdf, image/*', true), [pdf, png]);
});
test('extension rules are case insensitive', () => {
  assert.deepEqual(selectAcceptedFiles([unknownPdf, png], '.pdf', true), [unknownPdf]);
});
test('an empty accept list and */* allow all files', () => {
  for (const accept of ['', '*/*']) {
    assert.deepEqual(selectAcceptedFiles([png, text], accept, true), [png, text]);
  }
});
test('a known incompatible MIME type does not pass the PDF fallback', () => {
  assert.deepEqual(selectAcceptedFiles([{ name: 'fake.pdf', type: 'text/plain' }], 'application/pdf', false), []);
});
