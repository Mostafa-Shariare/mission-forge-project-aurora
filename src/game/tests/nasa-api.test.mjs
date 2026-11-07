import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  fetchNasaMissionData, 
  fetchSampleSpectroscopy, 
  fetchSpaceWeatherStatus,
  NASA_STATIC_MISSION_ARCHIVE 
} from '../src/nasa-api.js';

test('fetchNasaMissionData returns valid telemetry and authentic NASA dataset IDs for Mars', async () => {
  const data = await fetchNasaMissionData('mars');
  assert.ok(data);
  assert.equal(data.destination, 'mars');
  assert.ok(data.datasetId.includes('M2020-PIXL'));
  assert.ok(data.activeInstruments.length > 0);
  assert.ok(data.samples.length >= 2);
  assert.ok(data.source);
});

test('fetchNasaMissionData handles all 5 destinations gracefully', async () => {
  const destinations = ['earth', 'moon', 'mars', 'asteroid', 'jupiter'];
  for (const dest of destinations) {
    const data = await fetchNasaMissionData(dest);
    assert.ok(data, `Telemetry failed for destination ${dest}`);
    assert.ok(data.datasetId, `Missing datasetId for destination ${dest}`);
    assert.ok(data.provenanceArchive, `Missing provenanceArchive for destination ${dest}`);
    assert.ok(data.syncedAt, `Missing syncedAt for destination ${dest}`);
  }
});

test('fetchSampleSpectroscopy returns authentic rock core samples', async () => {
  const sample = await fetchSampleSpectroscopy('mars', 0);
  assert.ok(sample);
  assert.equal(sample.name, 'Montdenier');
  assert.equal(sample.type, 'Clay Mudstone');
  assert.ok(sample.pdsCitation.includes('PDS: M2020-PIXL'));
});

test('fetchSpaceWeatherStatus returns non-blocking status with baseline', async () => {
  const weather = await fetchSpaceWeatherStatus();
  assert.ok(weather);
  assert.ok(typeof weather.kpIndex === 'number');
  assert.ok(weather.status);
});

