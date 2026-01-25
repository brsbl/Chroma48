const esbuild = require('esbuild');

const isDev = process.argv.includes('--dev');

esbuild.build({
  entryPoints: ['src/index.js'],
  outfile: 'app/bundle.js',
  bundle: true,
  format: 'iife',
  globalName: 'Chroma48',
  minify: !isDev,
  sourcemap: isDev,
  target: 'es2020',
  platform: 'browser',
}).then(() => {
  console.log(`Build complete (${isDev ? 'development' : 'production'})`);
}).catch(() => process.exit(1));
