// Çalışma zamanı ortam tespiti — istekler boyunca sabit.
export const is = {
  dev: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
  prod: process.env.NODE_ENV === 'production',
  mac: process.platform === 'darwin',
  win: process.platform === 'win32',
  linux: process.platform === 'linux',
} as const;