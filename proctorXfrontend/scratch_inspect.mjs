import * as ort from './node_modules/onnxruntime-web/dist/ort.min.js';
import fs from 'fs';

async function inspectModel() {
  const modelPath = './public/models/sface_int8.onnx';
  console.log('Loading model buffer...');
  const buffer = fs.readFileSync(modelPath);
  console.log(`Model size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);

  try {
    const session = await ort.InferenceSession.create(buffer);
    console.log('Input names:', session.inputNames);
    console.log('Output names:', session.outputNames);
  } catch (e) {
    console.error('Session create error:', e);
  }
}

inspectModel();
