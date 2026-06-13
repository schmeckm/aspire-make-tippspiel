<template>
  <div class="pricing">
    <header class="pricing-hero">
      <h1 class="pricing-title">{{ t('pricing.title') }}</h1>
      <p class="pricing-subtitle">{{ t('pricing.subtitle') }}</p>
    </header>

    <AlertMessage v-if="error" :message="error" type="error" class="pricing-alert" />
    <AlertMessage v-if="info" :message="info" type="success" class="pricing-alert" />

    <div class="pricing-toggle" role="tablist" aria-label="Billing period">
      <button
        v-for="c in cycles"
        :key="c.id"
        type="button"
        class="pricing-toggle-btn"
        role="tab"
        :aria-selected="cycle === c.id"
        :class="{ active: cycle === c.id }"
        @click="cycle = c.id"
      >
        {{ c.label }}
      </button>
    </div>

    <section class="pricing-grid" aria-label="Plans">
      <button
        v-for="p in plans"
        :key="p.id"
        type="button"
        class="pricing-plan"
        :class="{ active: selectedPlanId === p.id, featured: p.featured }"
        @click="selectedPlanId = p.id"
      >
        <div class="pricing-plan-head">
          <h2 class="pricing-plan-title">{{ p.title }}</h2>
          <span v-if="p.badge" class="pricing-badge">{{ p.badge }}</span>
        </div>

        <div class="pricing-price">
          <span class="pricing-price-value">{{ p.price[cycle] }}</span>
          <span class="pricing-price-suffix">{{ cycleSuffix }}</span>
        </div>

        <ul class="pricing-plan-features">
          <li v-for="(f, idx) in p.features" :key="idx">{{ f }}</li>
        </ul>

        <span class="pricing-plan-cta">
          <span class="btn" :class="p.featured ? 'btn-primary' : 'btn-secondary'">
            {{ selectedPlanId === p.id ? t('pricing.selected') : t('pricing.select') }}
          </span>
        </span>
      </button>
    </section>

    <section class="pricing-details">
      <div class="pricing-details-card">
        <h3 class="pricing-details-title">{{ t('pricing.detailsTitle') }}</h3>
        <p class="pricing-details-subtitle">{{ t('pricing.detailsSubtitle') }}</p>

        <div class="pricing-tenant">
          <div>
            <label class="pricing-label" for="tenantName">{{ t('pricing.tenantName') }}</label>
            <input id="tenantName" v-model="tenantName" class="pricing-input" type="text" :placeholder="t('pricing.tenantNamePlaceholder')" />
          </div>

          <div>
            <label class="pricing-label" for="tenantSlug">
              {{ t('pricing.tenantSlug') }}
              <span class="pricing-optional">({{ t('common.optional') }})</span>
            </label>
            <input id="tenantSlug" v-model="tenantSlug" class="pricing-input" type="text" placeholder="acme" />
            <p class="pricing-hint">{{ t('pricing.tenantSlugHint') }}</p>
          </div>
        </div>

        <div class="pricing-actions">
          <button class="btn btn-primary pricing-pay" type="button" :disabled="loading" @click="startCheckout">
            {{ loading ? t('pricing.redirecting') : t('pricing.cta') }}
          </button>
          <router-link class="btn btn-secondary pricing-login" to="/login">
            {{ t('pricing.alreadyHaveAccount') }}
          </router-link>
        </div>

        <p class="pricing-note">{{ t('pricing.note') }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import AlertMessage from '../components/AlertMessage.vue';

const { t } = useI18n();

const tenantName = ref('');
const tenantSlug = ref('');
const cycle = ref('monthly');
const selectedPlanId = ref('business');
const loading = ref(false);
const error = ref('');
const info = ref('');

const cycles = computed(() => ([
  { id: 'monthly', label: t('pricing.cycle.monthly') },
  { id: 'annual', label: t('pricing.cycle.annual') },
  { id: 'lifetime', label: t('pricing.cycle.lifetime') },
]));

const cycleSuffix = computed(() => {
  if (cycle.value === 'annual') return t('pricing.cycleSuffix.annual');
  if (cycle.value === 'lifetime') return t('pricing.cycleSuffix.lifetime');
  return t('pricing.cycleSuffix.monthly');
});

const plans = computed(() => ([
  {
    id: 'free',
    featured: false,
    title: t('pricing.plans.free.title'),
    badge: null,
    price: {
      monthly: t('pricing.plans.free.priceMonthly'),
      annual: t('pricing.plans.free.priceAnnual'),
      lifetime: t('pricing.plans.free.priceLifetime'),
    },
    features: [
      t('pricing.plans.free.f1'),
      t('pricing.plans.free.f2'),
      t('pricing.plans.free.f3'),
      t('pricing.plans.free.f4'),
    ],
  },
  {
    id: 'developer',
    featured: false,
    title: t('pricing.plans.developer.title'),
    badge: null,
    price: {
      monthly: t('pricing.plans.developer.priceMonthly'),
      annual: t('pricing.plans.developer.priceAnnual'),
      lifetime: t('pricing.plans.developer.priceLifetime'),
    },
    features: [
      t('pricing.plans.developer.f1'),
      t('pricing.plans.developer.f2'),
      t('pricing.plans.developer.f3'),
      t('pricing.plans.developer.f4'),
    ],
  },
  {
    id: 'business',
    featured: true,
    title: t('pricing.plans.business.title'),
    badge: t('pricing.plans.business.badge'),
    price: {
      monthly: t('pricing.plans.business.priceMonthly'),
      annual: t('pricing.plans.business.priceAnnual'),
      lifetime: t('pricing.plans.business.priceLifetime'),
    },
    features: [
      t('pricing.plans.business.f1'),
      t('pricing.plans.business.f2'),
      t('pricing.plans.business.f3'),
      t('pricing.plans.business.f4'),
    ],
  },
]));

async function startCheckout() {
  loading.value = true;
  error.value = '';
  info.value = '';
  try {
    const { data } = await api.post('/billing/checkout', {
      plan: `${selectedPlanId.value}_${cycle.value}`,
      tenantName: tenantName.value,
      tenantSlug: tenantSlug.value,
    });

    if (data?.url) {
      info.value = t('pricing.redirecting');
      globalThis.location.href = data.url;
      return;
    }
    error.value = t('pricing.checkoutFailed');
  } catch (err) {
    error.value = err.response?.data?.error || t('pricing.checkoutFailed');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.pricing {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2.25rem 1.25rem 3rem;
}

.pricing-hero {
  text-align: center;
  margin-bottom: 1.25rem;
}

.pricing-title {
  margin: 0;
  font-size: 2rem;
  letter-spacing: -0.02em;
}

.pricing-subtitle {
  margin: 0.5rem auto 0;
  max-width: 62ch;
  color: var(--color-text-muted);
}

.pricing-alert {
  margin: 1rem 0;
}

.pricing-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  margin: 0 auto 1.25rem;
  box-shadow: var(--shadow-sm);
}

.pricing-toggle-btn {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.875rem;
  transition: background 0.15s ease, color 0.15s ease;
}

.pricing-toggle-btn.active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin: 0 auto 1.25rem;
}

.pricing-plan {
  text-align: left;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 1.25rem 1.25rem 1.1rem;
  box-shadow: var(--shadow-sm), var(--glow-card);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.pricing-plan:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md), var(--glow-primary);
}

.pricing-plan.active {
  border-color: color-mix(in srgb, var(--color-primary) 65%, var(--color-border));
  box-shadow: var(--shadow-md), var(--glow-primary);
}

.pricing-plan.featured {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
}

.pricing-plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.pricing-plan-title {
  margin: 0;
  font-size: 1.1rem;
}

.pricing-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
}

.pricing-price {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0.35rem 0 0.85rem;
}

.pricing-price-value {
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--color-text);
}

.pricing-price-suffix {
  color: var(--color-text-muted);
  font-weight: 700;
  font-size: 0.875rem;
}

.pricing-plan-features {
  margin: 0 0 1rem;
  padding-left: 1.15rem;
  color: var(--color-text);
}

.pricing-plan-cta {
  display: flex;
  justify-content: flex-end;
}

.pricing-details {
  margin-top: 0.25rem;
}

.pricing-details-card {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm), var(--glow-card);
}

.pricing-details-title {
  margin: 0;
  font-size: 1.1rem;
}

.pricing-details-subtitle {
  margin: 0.35rem 0 1rem;
  color: var(--color-text-muted);
}

.pricing-tenant {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 0.25rem 0 1.1rem;
}

.pricing-label {
  display: block;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
}

.pricing-input {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
  color: var(--color-text);
}

.pricing-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 0.0625rem var(--color-primary);
}

.pricing-hint {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.pricing-optional {
  font-weight: 500;
  opacity: 0.9;
}

.pricing-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pricing-pay {
  min-width: 14rem;
}

.pricing-login {
  text-decoration: none;
}

.pricing-note {
  margin: 0.9rem 0 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

@media (max-width: 980px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }
  .pricing-tenant {
    grid-template-columns: 1fr;
  }
  .pricing-actions {
    justify-content: stretch;
  }
  .pricing-pay {
    width: 100%;
  }
  .pricing-login {
    width: 100%;
    text-align: center;
  }
}
</style>

