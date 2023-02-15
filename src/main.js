import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap-icons/font/bootstrap-icons.css";

import { createApp } from 'vue'
import App from './App.vue'

import oStore from './store'

createApp(App).use(oStore).mount('#app')
