import { app } from 'electron';

// Paketlenmiş exe'de NODE_ENV çoğu zaman tanımsızdır; is.dev o yüzden
// yanlışlıkla true oluyordu ve UI localhost:5173'e bağlanmaya çalışıyordu.
const packaged = app.isPackaged;

export const is = {
  dev: !packaged,
  prod: packaged,
  mac: process.platform === 'darwin',
  win: process.platform === 'win32',
  linux: process.platform === 'linux',
} as const;
