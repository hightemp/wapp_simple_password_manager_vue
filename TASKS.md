# TASKS

## Архитектура и безопасность

- [x] Заменить Vuex на Pinia — `src/stores/repos.ts` + `src/stores/database.ts`, Vuex полностью удалён
- [x] Перейти на Composition API — все компоненты переписаны на `<script setup lang="ts">`
- [x] Заменить 3DES на AES-256-GCM — реализовано в `src/crypto.ts`, с автодетекцией формата при чтении (v1=3DES, v2=AES+PBKDF2)
- [x] Добавить PBKDF2 для деривации ключа — 100k итераций, 256-bit ключ, случайный salt
- [x] Автоблокировка — таймер 5 минут неактивности с очисткой пароля и возвратом к окну репозитория

## Качество кода

- [x] Добавить ESLint + Prettier — `eslint.config.js` + `.prettierrc`, скрипты `npm run lint` / `npm run format`
- [x] Добавить TypeScript — все `.js` → `.ts`, `<script setup lang="ts">`, `tsconfig.json`, `vue-tsc`
- [x] Разбить store на модули — `src/stores/repos.ts` (репозитории) + `src/stores/database.ts` (БД, формы, UI)
- [x] Убрать `console.log` — удалены все отладочные логи из `FileSystemDriver`, `App.vue`, `store.js`
- [x] Исправить баг в `fnWriteFileWebdav` — убран двойной вложенный Promise

## UX и фичи

- [x] Генератор паролей — кнопка в окне редактирования, 20 символов (буквы, цифры, символы)
- [x] Поиск с debounce — `fnDebounce` в `lib.ts`, 300мс задержка на фильтрации
- [x] Маскировка паролей в таблице — пароли скрыты `••••••••`, клик показывает на 3 секунды
- [x] Подтверждение удаления — `confirm()` перед удалением записи
- [x] Темная тема — переключатель в левой панели, сохраняется в localStorage

## Билд и деплой

- [x] Code splitting — `@octokit/rest` и `webdav/web` в отдельном vendor chunk
- [x] Добавить тесты — 54 теста в Vitest (crypto, lib, database store, repos store, FileSystemDriver)
- [x] CI/CD — GitHub Actions для авто-деплоя `docs/` в GitHub Pages (`.github/workflows/deploy.yml`)
