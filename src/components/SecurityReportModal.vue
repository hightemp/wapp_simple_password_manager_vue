<template>
  <BaseModal v-model="isOpen" title="Security report" size="lg">
    <p v-if="report.checked.length === 0" class="report-empty">No entries with passwords yet.</p>

    <template v-else>
      <!-- Summary -->
      <div class="report-summary">
        <a
          v-for="item in summary"
          :key="item.id"
          :href="`#report-${item.id}`"
          :class="['report-stat', { 'report-stat--bad': item.count, 'report-stat--unknown': item.count === null }]"
          @click.prevent="scrollTo(item.id)"
        >
          <span class="report-stat-count">{{ item.count ?? '—' }}</span>
          <span class="report-stat-label">{{ item.label }}</span>
        </a>
      </div>

      <!-- Breach check: only on request, it goes to the internet -->
      <div class="report-breach-box">
        <div class="i-lucide-shield-alert report-breach-icon" />
        <div class="report-breach-text">
          <template v-if="breachState === 'checking'">Checking… {{ progress.done }} / {{ progress.total }}</template>
          <template v-else-if="breachState === 'done'">
            Checked {{ checkedCount }} {{ checkedCount === 1 ? 'password' : 'passwords' }} against known data breaches{{
              uncheckedCount ? ` (${uncheckedCount} changed since — check again)` : '' }}.
          </template>
          <template v-else>
            Check passwords against known data breaches (Have I Been Pwned). Only the first 5 characters
            of each password's SHA-1 hash are sent — never the password.
          </template>
          <span v-if="breachError" class="report-breach-error">{{ breachError }}</span>
        </div>
        <button
          class="action-btn action-btn--sm"
          :class="breachState === 'done' && !uncheckedCount ? 'action-btn--ghost' : 'action-btn--primary'"
          :disabled="breachState === 'checking'"
          @click="checkBreaches"
        >
          {{ breachState === 'idle' ? 'Check for breaches' : 'Check again' }}
        </button>
      </div>

      <section v-if="breached.length" id="report-breached" class="report-section">
        <h3 class="report-heading"><div class="i-lucide-shield-alert" /> Found in data breaches</h3>
        <p class="report-hint">Change these passwords first: they are in lists attackers try.</p>
        <ul class="report-list">
          <li v-for="item in breached" :key="item.entry.id">
            <button class="report-row" @click="emit('open', item.entry)">
              <SiteIcon :url="entryUrl(item.entry)" :fallback="entryType(item.entry).icon" class="report-row-icon" />
              <span class="report-row-name">{{ item.entry.name || '(no name)' }}</span>
              <span class="report-row-detail report-row-detail--bad">Seen {{ formatCount(item.count) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section v-if="report.reused.length" id="report-reused" class="report-section">
        <h3 class="report-heading"><div class="i-lucide-copy" /> Reused passwords</h3>
        <p class="report-hint">If one site leaks, the others are open too. Give each entry its own password.</p>
        <ul v-for="(group, index) in report.reused" :key="index" class="report-list">
          <li class="report-group-title">Same password in {{ group.length }} entries</li>
          <li v-for="item in group" :key="item.entry.id">
            <button class="report-row" @click="emit('open', item.entry)">
              <SiteIcon :url="entryUrl(item.entry)" :fallback="entryType(item.entry).icon" class="report-row-icon" />
              <span class="report-row-name">{{ item.entry.name || '(no name)' }}</span>
              <span class="report-row-detail">{{ item.entry.category || 'Uncategorized' }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section v-if="report.weak.length" id="report-weak" class="report-section">
        <h3 class="report-heading"><div class="i-lucide-shield-off" /> Weak passwords</h3>
        <p class="report-hint">Easy to guess. Replace them with generated ones.</p>
        <ul class="report-list">
          <li v-for="item in report.weak" :key="item.entry.id">
            <button class="report-row" @click="emit('open', item.entry)">
              <SiteIcon :url="entryUrl(item.entry)" :fallback="entryType(item.entry).icon" class="report-row-icon" />
              <span class="report-row-name">{{ item.entry.name || '(no name)' }}</span>
              <span class="report-row-detail report-row-detail--bad">{{ item.strength.label }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section v-if="report.old.length" id="report-old" class="report-section">
        <h3 class="report-heading"><div class="i-lucide-clock" /> Old passwords</h3>
        <p class="report-hint">Not changed for more than {{ OLD_PASSWORD_DAYS / 365 }} year.</p>
        <ul class="report-list">
          <li v-for="item in report.old" :key="item.entry.id">
            <button class="report-row" @click="emit('open', item.entry)">
              <SiteIcon :url="entryUrl(item.entry)" :fallback="entryType(item.entry).icon" class="report-row-icon" />
              <span class="report-row-name">{{ item.entry.name || '(no name)' }}</span>
              <span class="report-row-detail">{{ formatAge(item.changedAt!) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <p v-if="allClear" class="report-ok">
        <span class="i-lucide-shield-check" /> No reused, weak or old passwords{{ breachState === 'done' ? ', none found in breaches' : '' }}.
      </p>
      <p v-if="report.unknownAge" class="report-note">
        The age of {{ report.unknownAge }} {{ report.unknownAge === 1 ? 'password is' : 'passwords are' }} unknown:
        the date is recorded from the next change.
      </p>
    </template>

    <template #footer>
      <div class="modal-footer-row">
        <button class="action-btn action-btn--primary" @click="isOpen = false">Close</button>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts">
import { ref } from 'vue'

// Breach counts by password, kept while the database is open (never saved)
const breachCounts = ref(new Map<string, number>())
</script>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useDatabaseStore, type Entry } from '@/stores/database'
import { checkPasswords } from '@/services/breaches'
import { buildReport, formatAge, OLD_PASSWORD_DAYS } from '@/utils/securityReport'
import { entryType, entryUrl } from '@/types/entryTypes'
import BaseModal from './BaseModal.vue'
import SiteIcon from './SiteIcon.vue'

const emit = defineEmits<{
  // Open an entry to fix it
  (e: 'open', entry: Entry): void
}>()
const isOpen = defineModel<boolean>({ required: true })

const db = useDatabaseStore()

const report = computed(() => buildReport(db.table.data))

// Forget the results when the database is locked or replaced
watch(() => db.masterPassword, (password) => {
  if (!password) breachCounts.value = new Map()
})

const breachError = ref('')
const progress = reactive({ done: 0, total: 0 })
let controller: AbortController | null = null
const isChecking = ref(false)

const breachState = computed(() => {
  if (isChecking.value) return 'checking'
  return breachCounts.value.size ? 'done' : 'idle'
})

const breached = computed(() => report.value.checked
  .map((item) => ({ entry: item.entry, count: breachCounts.value.get(item.entry.password) ?? 0 }))
  .filter((item) => item.count > 0)
  .sort((a, b) => b.count - a.count))

const checkedCount = computed(() => report.value.checked.filter((item) => breachCounts.value.has(item.entry.password)).length)
const uncheckedCount = computed(() => report.value.checked.length - checkedCount.value)

const summary = computed(() => [
  { id: 'breached', label: 'Breached', count: breachState.value === 'done' ? breached.value.length : null },
  { id: 'reused', label: 'Reused', count: report.value.reused.reduce((sum, group) => sum + group.length, 0) },
  { id: 'weak', label: 'Weak', count: report.value.weak.length },
  { id: 'old', label: 'Old', count: report.value.old.length },
])

const allClear = computed(() => !report.value.reused.length && !report.value.weak.length && !report.value.old.length
  && (breachState.value !== 'done' || !breached.value.length))

async function checkBreaches() {
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  breachError.value = ''
  isChecking.value = true
  try {
    const counts = await checkPasswords(report.value.checked.map((item) => item.entry.password), {
      signal,
      onProgress: (done, total) => Object.assign(progress, { done, total }),
    })
    if (!signal.aborted) breachCounts.value = counts
  } catch (error) {
    if (!signal.aborted) breachError.value = error instanceof Error ? error.message : String(error)
  } finally {
    if (!signal.aborted) isChecking.value = false
  }
}

// Closing the report stops a running check
watch(isOpen, (open) => {
  if (open) return
  controller?.abort()
  isChecking.value = false
})

function formatCount(count: number): string {
  return count === 1 ? 'once' : `${count.toLocaleString('en-US')} times`
}

function scrollTo(id: string) {
  document.getElementById(`report-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.report-empty,
.report-note {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.report-note {
  margin-top: var(--space-3);
}

.report-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.report-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  color: var(--c-text-secondary);
  text-decoration: none;
}

.report-stat-count {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--c-success);
}

.report-stat--bad .report-stat-count {
  color: var(--c-danger);
}

.report-stat--unknown .report-stat-count {
  color: var(--c-text-muted);
}

.report-stat-label {
  font-size: var(--text-xs);
}

.report-breach-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
}

.report-breach-icon {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--c-text-muted);
}

.report-breach-text {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.report-breach-error {
  display: block;
  color: var(--c-danger);
}

.report-section {
  margin-top: var(--space-4);
  scroll-margin-top: var(--space-2);
}

.report-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--c-text);
}

.report-hint {
  margin: var(--space-1) 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.report-list {
  list-style: none;
  margin: 0 0 var(--space-2);
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.report-list > li + li {
  border-top: 1px solid var(--c-border);
}

.report-group-title {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  color: var(--c-text-muted);
  background: var(--c-bg);
}

.report-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 40px;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--c-text);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
}
.report-row:hover {
  background: var(--c-bg-hover);
}

.report-row-icon {
  color: var(--c-text-muted);
}

.report-row-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-row-detail {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--c-text-muted);
}

.report-row-detail--bad {
  color: var(--c-danger);
}

.report-ok {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-4) 0 0;
  font-size: var(--text-sm);
  color: var(--c-success);
}

@media (max-width: 768px) {
  .report-breach-box {
    flex-wrap: wrap;
  }
  .report-breach-box .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
