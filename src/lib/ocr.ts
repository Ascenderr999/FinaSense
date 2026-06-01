import { createWorker } from 'tesseract.js';

let workerPromise: Promise<Tesseract.Worker> | null = null;

export const getTesseractWorker = () => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('aze+eng');
      return worker;
    })();
  }
  return workerPromise;
};
