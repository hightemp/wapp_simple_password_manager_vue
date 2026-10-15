<template>
  <span class="site-icon" :title="title">
    <img
      v-if="src && !failed.has(domain!)"
      :src="src"
      :class="['site-icon-img', { 'site-icon-img--loading': !loaded }]"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      @load="loaded = true"
      @error="failed.add(domain!)"
    />
    <!-- The type icon until the website icon has loaded, or when there is none -->
    <span v-if="!loaded || !src || failed.has(domain!)" :class="fallback" class="site-icon-fallback" />
  </span>
</template>

<script lang="ts">
import { reactive } from 'vue'

// Domains without an icon, so they are not requested again on every render
const failed = reactive(new Set<string>())
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { siteDomain } from '@/utils/url'
import { useSiteIcons, siteIconUrl } from '@/composables/useSiteIcons'

const props = defineProps<{
  url: string
  // Icon class shown without a website icon (the entry type's icon)
  fallback: string
  title?: string
}>()

const { siteIconsEnabled } = useSiteIcons()

const domain = computed(() => (siteIconsEnabled.value ? siteDomain(props.url) : null))
const src = computed(() => (domain.value ? siteIconUrl(domain.value) : ''))
const loaded = ref(false)
watch(src, () => { loaded.value = false })
</script>

<style scoped>
/* Same size as the icon font classes (scale 1.2) */
.site-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
  flex-shrink: 0;
}

.site-icon-img {
  width: 1.2em;
  height: 1.2em;
  border-radius: 3px;
  object-fit: contain;
}

/* Not display:none — a lazy image that is not displayed is never loaded */
.site-icon-img--loading {
  position: absolute;
  opacity: 0;
}
</style>
