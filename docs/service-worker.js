if(!self.define){let e,c={};const n=(n,s)=>(n=new URL(n+".js",s).href,c[n]||new Promise((c=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=c,document.head.appendChild(e)}else e=n,importScripts(n),c()})).then((()=>{let e=c[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e})));self.define=(s,i)=>{const a=e||("document"in self?document.currentScript.src:"")||location.href;if(c[a])return;let r={};const f=e=>n(e,a),o={module:{uri:a},exports:r,require:f};c[a]=Promise.all(s.map((e=>o[e]||f(e)))).then((e=>(i(...e),r)))}}define(["./workbox-db5fc017"],(function(e){"use strict";e.setCacheNameDetails({prefix:"wapp_simple_password_manager_vue"}),self.addEventListener("message",(e=>{e.data&&"SKIP_WAITING"===e.data.type&&self.skipWaiting()})),e.precacheAndRoute([{url:"config.xml",revision:"829cf5fc059f46f23c78e205da656b68"},{url:"css/app.a75778db.css",revision:null},{url:"css/chunk-vendors.4666f03e.css",revision:null},{url:"favicon.png",revision:"02a07991f13f2ba8915f2f3165bb9a3c"},{url:"favicons/apple-touch-icon-114x114.png",revision:"af01c47ff4657329615040aaf60a09ff"},{url:"favicons/apple-touch-icon-120x120.png",revision:"dd233de961515cbf70c4e90bb240a122"},{url:"favicons/apple-touch-icon-144x144.png",revision:"fe70b6fad513794c31b40d9718283294"},{url:"favicons/apple-touch-icon-152x152.png",revision:"dda5fa2f79f19854b4b92dcb53f336cb"},{url:"favicons/apple-touch-icon-57x57.png",revision:"477a3872223e0ac5db5719e7a20fc63e"},{url:"favicons/apple-touch-icon-60x60.png",revision:"69bae84e3e08371a0265040384383655"},{url:"favicons/apple-touch-icon-72x72.png",revision:"fb9ec2ca059baf8841fb3be58e28f56e"},{url:"favicons/apple-touch-icon-76x76.png",revision:"13f722065a26ef9f7d3beb3402ba3bf5"},{url:"favicons/favicon-128x128.png",revision:"990fe47553a69027dd58e29423dd018b"},{url:"favicons/favicon-16x16.png",revision:"6511cfd85ad80c7ad09e465a7a37a3e8"},{url:"favicons/favicon-196x196.png",revision:"ff774f2acc3b848d33cdb4017dd2f05f"},{url:"favicons/favicon-32x32.png",revision:"5a837ba04f308a0b972a6f6c6cd3b3dd"},{url:"favicons/favicon-96x96.png",revision:"7a2680033cbc033c769585e72b724cb3"},{url:"favicons/ms-tile-144x144.png",revision:"fe70b6fad513794c31b40d9718283294"},{url:"favicons/ms-tile-150x150.png",revision:"eeded77ad7b80bef93712821677860cd"},{url:"favicons/ms-tile-310x150.png",revision:"fecbc157c52398c28d9fd1f24c6f7659"},{url:"favicons/ms-tile-310x310.png",revision:"2048f526d46b0b895fda1b2c750125d5"},{url:"favicons/ms-tile-70x70.png",revision:"a95fb1da870d467a51b0078ab04abc0c"},{url:"fonts/bootstrap-icons.35e09da2.woff2",revision:null},{url:"fonts/bootstrap-icons.cb4c7c05.woff",revision:null},{url:"icons/icon-128x128.png",revision:"990fe47553a69027dd58e29423dd018b"},{url:"icons/icon-144x144.png",revision:"fe70b6fad513794c31b40d9718283294"},{url:"icons/icon-152x152.png",revision:"dda5fa2f79f19854b4b92dcb53f336cb"},{url:"icons/icon-192x192.png",revision:"c5c8ee6cbe181dfd97ac2d3ba035eb90"},{url:"icons/icon-384x384.png",revision:"fe04dee7ffd4bae42c7c71c919bcbee8"},{url:"icons/icon-512x512.png",revision:"00a3a885430b6f5686312433f1dc5700"},{url:"icons/icon-72x72.png",revision:"fb9ec2ca059baf8841fb3be58e28f56e"},{url:"icons/icon-96x96.png",revision:"7a2680033cbc033c769585e72b724cb3"},{url:"index.html",revision:"b7693626047773941417ba12d931dd6c"},{url:"js/app.03e0ff1b.js",revision:null},{url:"js/chunk-vendors.d8df331a.js",revision:null},{url:"js/safari-nomodule-fix.js",revision:"cd7a34e714de94d5c29b8ac5acdde24b"},{url:"launch-screens/launch-screen-1125x2436.png",revision:"be3a4880d078ab4037b54054883bf985"},{url:"launch-screens/launch-screen-1136x640.png",revision:"56cfd8fffb6b4cb9994793962090f10b"},{url:"launch-screens/launch-screen-1242x2208.png",revision:"dc5fc2ef0793b5c7dfa86852b510a5d7"},{url:"launch-screens/launch-screen-1242x2688.png",revision:"16a1a63fb8ec5cf4ac718fe4711797b2"},{url:"launch-screens/launch-screen-1334x750.png",revision:"a5277896e4c253c7baf63d1b583359a3"},{url:"launch-screens/launch-screen-1536x2048.png",revision:"4417dde93fa06202f1f0aa1f2c6b54f8"},{url:"launch-screens/launch-screen-1668x2224.png",revision:"4fa66834c5cc5ccbc7099546b2a31f47"},{url:"launch-screens/launch-screen-1668x2388.png",revision:"619ddc030a43ab2f62fd1680b40ea33c"},{url:"launch-screens/launch-screen-1792x828.png",revision:"71d4ffac35d19aab9b1c9159b6b7bd95"},{url:"launch-screens/launch-screen-2048x1536.png",revision:"b32faccb7e5b6c035b3253cacdd7ef2d"},{url:"launch-screens/launch-screen-2048x2732.png",revision:"5198b7707ea9663d1846c136c09b0f96"},{url:"launch-screens/launch-screen-2208x1242.png",revision:"b173ecddbe417d7825ae53906fb6c0bc"},{url:"launch-screens/launch-screen-2224x1668.png",revision:"358724963bdbe6e71c8de4a53a4f9183"},{url:"launch-screens/launch-screen-2388x1668.png",revision:"4cbb46063f469a184a59738f238e460d"},{url:"launch-screens/launch-screen-2436x1125.png",revision:"f2644cfe8b73f8f52824914e84baedbb"},{url:"launch-screens/launch-screen-2688x1242.png",revision:"c8821e9a7766e3ee513c4f15138c0bf2"},{url:"launch-screens/launch-screen-2732x2048.png",revision:"ed3a0543f88834ea0935bbdec9347fd4"},{url:"launch-screens/launch-screen-640x1136.png",revision:"affc04fd77f2ca229274f34e86d55945"},{url:"launch-screens/launch-screen-750x1334.png",revision:"ab95988951b386c63aa4162bdf2103e2"},{url:"launch-screens/launch-screen-828x1792.png",revision:"98628a800404a9fe8ef4af1a4cffc252"},{url:"manifest.json",revision:"4d2c3317f743e153a3b50c03e690aff4"},{url:"robots.txt",revision:"b6216d61c03e6ce0c9aea6ca7808f7ca"},{url:"styles.css",revision:"a808417d74978facfce300dd32c5df39"}],{})}));
//# sourceMappingURL=service-worker.js.map
