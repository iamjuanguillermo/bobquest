import { configure } from 'quasar/wrappers';

export default configure(() => ({
  boot: [],
  css: ['app.scss'],
  extras: ['material-icons'],
  build: {
    target: {
      browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
      node: 'node20'
    },
    vueRouterMode: 'history',
    publicPath: '/'
  },
  devServer: {
    open: false,
    port: 9000,
    host: '0.0.0.0'
  },
  framework: {
    config: {},
    plugins: ['Notify']
  }
}));
