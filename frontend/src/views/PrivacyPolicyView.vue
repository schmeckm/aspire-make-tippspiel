<template>
  <div class="legal-page">
    <header class="legal-header">
      <LanguageSwitcher show-label />
      <router-link to="/login" class="legal-back">{{ t('privacy.backToLogin') }}</router-link>
    </header>

    <article class="legal-document card">
      <div class="card-body">
        <h1>{{ t('privacy.title') }}</h1>
        <p class="legal-meta">{{ t('privacy.lastUpdated') }}</p>
        <p class="legal-intro">{{ t('privacy.intro') }}</p>

        <section v-for="sectionId in sectionIds" :key="sectionId" class="legal-section">
          <h2>{{ t(`privacy.sections.${sectionId}.title`) }}</h2>
          <p v-if="te(`privacy.sections.${sectionId}.text`)">
            {{ t(`privacy.sections.${sectionId}.text`) }}
          </p>
          <ul v-if="sectionItems(sectionId).length" class="legal-list">
            <li v-for="(item, index) in sectionItems(sectionId)" :key="index">
              {{ item }}
            </li>
          </ul>
        </section>
      </div>
    </article>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const { t, te, tm } = useI18n();

const sectionIds = [
  'controller',
  'dataCollected',
  'purpose',
  'teamData',
  'legalBasis',
  'sharing',
  'retention',
  'rights',
  'security',
  'contact',
];

function sectionItems(sectionId) {
  const items = tm(`privacy.sections.${sectionId}.items`);
  return Array.isArray(items) ? items : [];
}
</script>

<style scoped>
.legal-page {
  min-height: 100%;
  padding: 2rem 1.5rem 3rem;
  background: var(--color-bg);
}

.legal-header {
  max-width: 48rem;
  margin: 0 auto 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.legal-back {
  font-size: 0.875rem;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
}

.legal-back:hover {
  text-decoration: underline;
}

.legal-document {
  max-width: 48rem;
  margin: 0 auto;
  padding: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--glow-card);
}

.legal-document h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
}

.legal-meta {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.legal-intro {
  margin: 0 0 1.5rem;
  line-height: 1.6;
}

.legal-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.legal-section h2 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.legal-section p {
  margin: 0;
  line-height: 1.65;
  color: var(--color-text);
}

.legal-list {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  line-height: 1.65;
}

.legal-list li + li {
  margin-top: 0.35rem;
}
</style>
