# TASKS

## Архитектура и безопасность

- [ ] Заменить Vuex на Pinia — Vuex 4 в режиме поддержки, Pinia — официальная рекомендация для Vue 3, проще API, типизация из коробки
- [ ] Перейти на Composition API — все компоненты написаны на Options API, Composition API лучше для переиспользования логики и tree-shaking
- [x] Заменить 3DES на AES-256-GCM — реализовано в `src/crypto.js`, с автодетекцией формата при чтении (v1=3DES, v2=AES+PBKDF2)
- [x] Добавить PBKDF2 для деривации ключа — 100k итераций, 256-bit ключ, случайный salt
- [x] Автоблокировка — таймер 5 минут неактивности с очисткой пароля и возвратом к окну репозитория

## Качество кода

- [x] Добавить ESLint + Prettier — `eslint.config.js` + `.prettierrc`, скрипты `npm run lint` / `npm run format`
- [ ] Добавить TypeScript — Vite поддерживает TS из коробки, повысит надёжность
- [ ] Разбить store на модули — `src/store.js` содержит 326 строк, стоит вынести actions/mutations по файлам
- [x] Убрать `console.log` — удалены все отладочные логи из `FileSystemDriver`, `App.vue`, `store.js`
- [x] Исправить баг в `fnWriteFileWebdav` — убран двойной вложенный Promise

## UX и фичи

- [x] Генератор паролей — кнопка в окне редактирования, 20 символов (буквы, цифры, символы)
- [x] Поиск с debounce — `fnDebounce` в `lib.js`, 300мс задержка на фильтрации
- [x] Маскировка паролей в таблице — пароли скрыты `••••••••`, клик показывает на 3 секунды
- [x] Подтверждение удаления — `confirm()` перед удалением записи
- [x] Темная тема — переключатель в левой панели, сохраняется в localStorage

## Билд и деплой

- [x] Code splitting — `@octokit/rest` и `webdav/web` в отдельном vendor chunk
- [x] Добавить тесты — 48 тестов в Vitest (crypto, lib, store, FileSystemDriver)
- [ ] CI/CD — GitHub Actions для авто-деплоя `docs/` в GitHub Pages
