<script setup>
</script>

<template>
  <div class="disclaimer-banner">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
    </svg>
    <span>
      <strong>Community Documentation:</strong> This documentation is provided as-is and may contain errors or become outdated. 
      Always verify information against the actual implementation and test thoroughly before production use.
    </span>
  </div>
</template>

<style scoped>
.disclaimer-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  margin: 1rem 0 1.5rem 0;
  background: var(--vp-c-warning-soft);
  border: 1px solid var(--vp-c-warning-2);
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--vp-c-warning-1);
}

.dark .disclaimer-banner {
  background: rgba(234, 179, 8, 0.1);
  border-color: rgba(234, 179, 8, 0.3);
  color: rgb(250, 204, 21);
}

.icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.125rem;
}

.disclaimer-banner strong {
  color: var(--vp-c-warning-1);
}

.dark .disclaimer-banner strong {
  color: rgb(250, 204, 21);
}
</style>
