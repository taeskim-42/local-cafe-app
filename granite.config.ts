import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'local-cafe',
  scheme: 'intoss',
  plugins: [
    appsInToss({
      brand: {
        displayName: '동네카페',
        primaryColor: '#8B4513', // 커피 브라운
        icon: '',
        bridgeColorMode: 'basic',
      },
      permissions: [],
    }),
  ],
});
