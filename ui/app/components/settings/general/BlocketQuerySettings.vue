<script lang="ts" setup>
import * as z from 'zod';

const props = defineProps<{
  isLoading: boolean;
  isSaving: boolean;
  settings?: {
    limit?: number;
    sort?: string;
    listingType?: string;
    status?: string;
    geolocation?: number;
    include?: string;
  };
}>();

const emit = defineEmits<{
  save: [];
}>();

const blocketQuerySchema = z.object({
  limit: z.number().int().min(1, 'Min 1').max(60, 'Max 60'),
  sort: z.enum(['rel']),
  listingType: z.enum(['s']),
  status: z.enum(['active']),
  geolocation: z.number().int().min(3, 'Min 3').max(3, 'Max 3'),
  include: z.string(),
});

const blocketQueryState = reactive({
  limit: props.settings?.limit || 60,
  sort: props.settings?.sort || 'rel',
  listingType: props.settings?.listingType || 's',
  status: props.settings?.status || 'active',
  geolocation: props.settings?.geolocation || 3,
  include: props.settings?.include || 'extend_with_shipping',
});

// Initial state for comparison
const initialBlocketQueryState = reactive({
  limit: props.settings?.limit || 60,
  sort: props.settings?.sort || 'rel',
  listingType: props.settings?.listingType || 's',
  status: props.settings?.status || 'active',
  geolocation: props.settings?.geolocation || 3,
  include: props.settings?.include || 'extend_with_shipping',
});

// Form validation errors
const formErrors = ref<unknown[]>([]);

// Form state management
const { isButtonDisabled, updateInitialData } = useFormState({
  initialData: initialBlocketQueryState,
  currentData: toRef(blocketQueryState),
  errors: formErrors,
});

defineExpose({
  blocketQueryState,
  updateInitialData: () => updateInitialData(blocketQueryState),
});

function saveBlocketQuerySettings() {
  emit('save');
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center">
        <UIcon name="ic:baseline-search" class="mr-2 text-xl" />
        <h2 class="text-lg font-semibold">Blocket Query Settings</h2>
      </div>
    </template>
    <UForm
      :schema="blocketQuerySchema"
      :state="blocketQueryState"
      class="space-y-4"
      @submit="saveBlocketQuerySettings"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div class="mb-1">
            <label for="results-limit" class="block font-medium text-sm"
              >Results Limit (per page)</label
            >
          </div>
          <UInput
            id="results-limit"
            v-model.number="blocketQueryState.limit"
            type="number"
            :min="1"
            :max="60"
          />
          <p class="text-xs text-neutral-500 mt-1">
            Maximum number of results to fetch per page
          </p>
        </div>
      </div>

      <div class="flex justify-end mt-4">
        <UButton
          type="submit"
          :loading="props.isSaving"
          :disabled="isButtonDisabled"
          >Save Query Settings</UButton
        >
      </div>
    </UForm>
  </UCard>
</template>
