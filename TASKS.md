# TASKS

## Архитектура и безопасность

- [ ] Заменить Vuex на Pinia — Vuex 4 в режиме поддержки, Pinia — официальная рекомендация для Vue 3, проще API, типизация из коробки
- [ ] Перейти на Composition API — все компоненты написаны на Options API, Composition API лучше для переиспользования логики и tree-shaking
- [ ] Заменить 3DES на AES-256-GCM — `crypto-js/tripledes` устарел и менее безопасен; `AES` из того же `crypto-js` или нативный `Web Crypto API` (`SubtleCrypto`) — значительно лучше
- [ ] Добавить PBKDF2/Argon2 для деривации ключа — сейчас пароль используется как ключ напрямую, нужна Key Derivation Function
- [ ] Автоблокировка — таймер неактивности с очисткой пароля из памяти

## Качество кода

- [ ] Добавить ESLint + Prettier — в проекте нет линтинга
- [ ] Добавить TypeScript — Vite поддерживает TS из коробки, повысит надёжность
- [ ] Разбить store на модули — `src/store.js` содержит 326 строк, стоит вынести actions/mutations по файлам
- [ ] Убрать `console.log` — в коде много отладочных логов (в `FileSystemDriver`, в фильтрации `aRows`)
- [ ] Исправить баг в `fnWriteFileWebdav` — двойной вложенный Promise — внешний resolve никогда не вызывается

## UX и фичи

- [ ] Генератор паролей — встроенный генератор случайных паролей
- [ ] Поиск с debounce — фильтрация сейчас на каждый `input` event
- [ ] Мастер-пароль при каждом показе — сейчас пароли видны в таблице открытым текстом
- [ ] Подтверждение удаления — `fnRemoveClick` удаляет без confirm-диалога
- [ ] Темная тема — CSS variables уже в `public/styles.css`, легко добавить переключение

## Билд и деплой

- [ ] Code splitting — Vite предупреждает о чанке >500KB; вынести `@octokit/rest` и `webdav` в отдельный vendor chunk через `build.rollupOptions.output.manualChunks`
- [ ] Добавить тесты — Vitest идеально интегрируется с Vite
- [ ] CI/CD — GitHub Actions для авто-деплоя `docs/` в GitHub Pages
