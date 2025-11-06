import { createApp } from 'vue';
import App from './App.vue';

import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';

import './styles.css';
import { useTheme } from './state/theme';

const app = createApp(App);
// initialize theme before mount
const { init } = useTheme();
init();
app.use(ElementPlus);
app.mount('#app');


