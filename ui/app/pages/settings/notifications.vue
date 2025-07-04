<script lang="ts" setup>
import DiscordNotifications from '~/components/settings/notifications/DiscordNotifications.vue';
import DiscordWebhooks from '~/components/settings/notifications/DiscordWebhooks.vue';
import EmailNotifications from '~/components/settings/notifications/EmailNotifications.vue';
import BatchingSettings from '~/components/settings/notifications/BatchingSettings.vue';

definePageMeta({
  layout: 'default',
});

const settingsStore = useSettingsStore();
const toast = useToast();

type DiscordWebhook = {
  id: string;
  name: string;
  url: string;
};

type DiscordRef = {
  discordState: {
    username: string;
    avatarUrl: string;
    maxRetries: number;
    retryDelay: number;
  };
  updateInitialData: () => void;
};

type DiscordWebhooksRef = {
  webhooks: DiscordWebhook[];
};

type EmailRef = {
  emailState: {
    enabled: boolean;
    from: string;
    to: string;
    subject: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    useTLS: boolean;
  };
};

type BatchingRef = {
  batchingState: {
    enableBatching: boolean;
    batchSize: number;
  };
  updateInitialData: () => void;
};

const discordRef = ref<DiscordRef | null>(null);
const discordWebhooksRef = ref<DiscordWebhooksRef | null>(null);
const emailRef = ref<EmailRef | null>(null);
const batchingRef = ref<BatchingRef | null>(null);

const isLoading = ref(true);
const isSaving = ref(false);
const resetConfirmationOpen = ref(false);

const discordSettings = computed(() => {
  if (!settingsStore.settings.length) return undefined;

  return {
    username:
      settingsStore.getSettingValue('notification.discord.username') ||
      'Market Monitor',
    avatarUrl:
      settingsStore.getSettingValue('notification.discord.avatar_url') || '',
    maxRetries: parseInt(
      settingsStore.getSettingValue('notification.discord.max_retries') || '3'
    ),
    retryDelay: parseInt(
      settingsStore.getSettingValue('notification.discord.retry_delay') ||
        '1000'
    ),
  };
});

const discordWebhooks = computed(() => {
  if (!settingsStore.settings.length) return [];

  const webhooksValue =
    settingsStore.getSettingValue('notification.discord.webhooks') || '[]';
  try {
    return JSON.parse(webhooksValue);
  } catch {
    return [];
  }
});

const emailSettings = computed(() => {
  if (!settingsStore.settings.length) return undefined;

  return {
    enabled:
      settingsStore.getSettingValue('notification.email.enabled') === 'true',
    from: settingsStore.getSettingValue('notification.email.from') || '',
    to: settingsStore.getSettingValue('notification.email.to') || '',
    subject:
      settingsStore.getSettingValue('notification.email.subject') ||
      'New Blocket Listings',
    smtpHost:
      settingsStore.getSettingValue('notification.email.smtp_host') || '',
    smtpPort: parseInt(
      settingsStore.getSettingValue('notification.email.smtp_port') || '587'
    ),
    smtpUser:
      settingsStore.getSettingValue('notification.email.smtp_user') || '',
    smtpPass:
      settingsStore.getSettingValue('notification.email.smtp_pass') || '',
    useTLS:
      settingsStore.getSettingValue('notification.email.use_tls') === 'true',
  };
});

const batchingSettings = computed(() => {
  if (!settingsStore.settings.length) return undefined;

  return {
    enableBatching:
      settingsStore.getSettingValue('notification.general.enable_batching') ===
      'true',
    batchSize: parseInt(
      settingsStore.getSettingValue('notification.general.batch_size') || '10'
    ),
  };
});

const settingsMap = {
  'notification.discord.username': (value: string) => {
    if (discordRef.value) discordRef.value.discordState.username = value;
  },
  'notification.discord.avatar_url': (value: string) => {
    if (discordRef.value) discordRef.value.discordState.avatarUrl = value;
  },
  'notification.discord.max_retries': (value: string) => {
    if (discordRef.value)
      discordRef.value.discordState.maxRetries = parseInt(value) || 3;
  },
  'notification.discord.retry_delay': (value: string) => {
    if (discordRef.value)
      discordRef.value.discordState.retryDelay = parseInt(value) || 1000;
  },
  'notification.discord.webhooks': (value: string) => {
    if (discordWebhooksRef.value) {
      try {
        discordWebhooksRef.value.webhooks = JSON.parse(value);
      } catch {
        discordWebhooksRef.value.webhooks = [];
      }
    }
  },

  'notification.email.enabled': (value: string) => {
    if (emailRef.value) emailRef.value.emailState.enabled = value === 'true';
  },
  'notification.email.from': (value: string) => {
    if (emailRef.value) emailRef.value.emailState.from = value;
  },
  'notification.email.to': (value: string) => {
    if (emailRef.value) emailRef.value.emailState.to = value;
  },
  'notification.email.subject': (value: string) => {
    if (emailRef.value) emailRef.value.emailState.subject = value;
  },
  'notification.email.smtp_host': (value: string) => {
    if (emailRef.value) emailRef.value.emailState.smtpHost = value;
  },
  'notification.email.smtp_port': (value: string) => {
    if (emailRef.value)
      emailRef.value.emailState.smtpPort = parseInt(value) || 587;
  },
  'notification.email.smtp_user': (value: string) => {
    if (emailRef.value) emailRef.value.emailState.smtpUser = value;
  },
  'notification.email.smtp_pass': (value: string) => {
    if (emailRef.value) emailRef.value.emailState.smtpPass = value;
  },
  'notification.email.use_tls': (value: string) => {
    if (emailRef.value) emailRef.value.emailState.useTLS = value === 'true';
  },

  'notification.general.enable_batching': (value: string) => {
    if (batchingRef.value)
      batchingRef.value.batchingState.enableBatching = value === 'true';
  },
  'notification.general.batch_size': (value: string) => {
    if (batchingRef.value)
      batchingRef.value.batchingState.batchSize = parseInt(value) || 10;
  },
};

onMounted(async () => {
  await nextTick();
  await settingsStore.fetchSettings();
  isLoading.value = false;
});

watch(
  () => settingsStore.settings,
  () => {
    settingsStore.settings.forEach((setting: Setting) => {
      const mapFn = settingsMap[setting.key as keyof typeof settingsMap];
      if (mapFn) {
        mapFn(setting.value);
      }
    });
  },
  { immediate: true }
);

async function updateSettings(
  settings: Array<{ key: string; value: string }>
): Promise<void> {
  for (const setting of settings) {
    await settingsStore.updateSetting(setting.key, setting.value);
  }
}

async function saveDiscordSettings() {
  if (!discordRef.value) return;

  isSaving.value = true;
  try {
    const discordSettings = [
      {
        key: 'notification.discord.username',
        value: discordRef.value.discordState.username,
      },
      {
        key: 'notification.discord.avatar_url',
        value: discordRef.value.discordState.avatarUrl,
      },
      {
        key: 'notification.discord.max_retries',
        value: discordRef.value.discordState.maxRetries.toString(),
      },
      {
        key: 'notification.discord.retry_delay',
        value: discordRef.value.discordState.retryDelay.toString(),
      },
    ];

    await updateSettings(discordSettings);

    // Update initial data to reflect successful save
    discordRef.value?.updateInitialData();

    toast.add({
      title: 'Success',
      description: 'Discord notification settings saved',
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to save Discord settings',
      color: 'error',
    });
    console.error('Failed to save Discord settings:', error);
  } finally {
    isSaving.value = false;
  }
}

async function saveDiscordWebhooks(webhooks: DiscordWebhook[]) {
  isSaving.value = true;
  try {
    await settingsStore.updateSetting(
      'notification.discord.webhooks',
      JSON.stringify(webhooks)
    );

    toast.add({
      title: 'Success',
      description: 'Discord webhook settings saved',
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to save Discord webhook settings',
      color: 'error',
    });
    console.error('Failed to save Discord webhook settings:', error);
  } finally {
    isSaving.value = false;
  }
}

async function saveEmailSettings() {
  if (!emailRef.value) return;

  isSaving.value = true;
  try {
    const emailSettings = [
      {
        key: 'notification.email.enabled',
        value: emailRef.value.emailState.enabled.toString(),
      },
      { key: 'notification.email.from', value: emailRef.value.emailState.from },
      { key: 'notification.email.to', value: emailRef.value.emailState.to },
      {
        key: 'notification.email.subject',
        value: emailRef.value.emailState.subject,
      },
      {
        key: 'notification.email.smtp_host',
        value: emailRef.value.emailState.smtpHost,
      },
      {
        key: 'notification.email.smtp_port',
        value: emailRef.value.emailState.smtpPort.toString(),
      },
      {
        key: 'notification.email.smtp_user',
        value: emailRef.value.emailState.smtpUser,
      },
      {
        key: 'notification.email.smtp_pass',
        value: emailRef.value.emailState.smtpPass,
      },
      {
        key: 'notification.email.use_tls',
        value: emailRef.value.emailState.useTLS.toString(),
      },
    ];

    await updateSettings(emailSettings);

    toast.add({
      title: 'Success',
      description: 'Email notification settings saved',
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to save Email settings',
      color: 'error',
    });
    console.error('Failed to save Email settings:', error);
  } finally {
    isSaving.value = false;
  }
}

async function saveBatchingSettings() {
  if (!batchingRef.value) return;

  isSaving.value = true;
  try {
    const batchingSettings = [
      {
        key: 'notification.general.enable_batching',
        value: batchingRef.value.batchingState.enableBatching.toString(),
      },
      {
        key: 'notification.general.batch_size',
        value: batchingRef.value.batchingState.batchSize.toString(),
      },
    ];

    await updateSettings(batchingSettings);

    // Update initial data to reflect successful save
    batchingRef.value?.updateInitialData();

    toast.add({
      title: 'Success',
      description: 'Notification batching settings saved',
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to save batching settings',
      color: 'error',
    });
    console.error('Failed to save batching settings:', error);
  } finally {
    isSaving.value = false;
  }
}

async function resetSettings() {
  try {
    await settingsStore.resetToDefaults();
    resetConfirmationOpen.value = false;

    toast.add({
      title: 'Success',
      description: 'All settings have been reset to default values',
      color: 'success',
    });

    window.location.reload();
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to reset settings',
      color: 'error',
    });
    console.error('Failed to reset settings:', error);
  }
}

async function testDiscordNotification() {
  if (!discordRef.value) return;

  isSaving.value = true;
  try {
    const testMessage = {
      subject: 'Test Notification',
      body: 'This is a test notification from Market Monitor',
      price: { value: 1000, suffix: ' kr' },
      share_url: 'https://www.blocket.se',
      images: [
        {
          url:
            discordRef.value.discordState.avatarUrl ||
            'https://www.blocket.se/favicon.ico',
        },
      ],
    };

    await useFetch('/api/notifications/test/discord', {
      method: 'POST',
      body: JSON.stringify([testMessage]),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    toast.add({
      title: 'Success',
      description: 'Test notification sent. Check your Discord channel.',
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to send test notification',
      color: 'error',
    });
    console.error('Failed to send test notification:', error);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="container mx-auto py-8">
    <div class="max-w-7xl mx-auto">
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold">Notification Settings</h1>
          <p class="text-neutral-500 mt-2">
            Manage your notification preferences and providers
          </p>
        </div>
        <UButton
          color="error"
          variant="outline"
          @click="resetConfirmationOpen = true"
        >
          Reset All Settings
        </UButton>
      </header>

      <UModal v-model="resetConfirmationOpen">
        <template #header>
          <div class="text-red-500 font-bold">Reset All Settings</div>
        </template>

        <template #body>
          <p>
            Are you sure you want to reset all settings to their default values?
            This action cannot be undone.
          </p>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" @click="resetConfirmationOpen = false"
              >Cancel</UButton
            >
            <UButton color="error" @click="resetSettings"
              >Reset All Settings</UButton
            >
          </div>
        </template>
      </UModal>

      <div v-if="isLoading" class="space-y-6">
        <USkeleton class="h-[600px] w-full" />
      </div>

      <div v-else class="space-y-12">
        <!-- Discord Provider Section -->
        <UCard class="overflow-hidden">
          <template #header>
            <div class="flex items-center justify-between p-1">
              <div class="flex items-center">
                <UIcon
                  name="ic:baseline-discord"
                  class="mr-4 text-3xl text-indigo-500"
                />
                <div>
                  <h2 class="text-xl font-bold">Discord</h2>
                  <p class="text-sm text-neutral-500 mt-1">
                    Configure Discord notifications and webhooks
                  </p>
                </div>
              </div>
              <UBadge color="primary" variant="soft">Active Provider</UBadge>
            </div>
          </template>

          <div class="p-6">
            <UAlert
              icon="heroicons:information-circle"
              color="primary"
              variant="soft"
              title="Discord Integration Active"
              description="Discord notifications are configured and ready to use. Manage your bot settings and webhooks below."
              :close-button="false"
              class="mb-8"
            />

            <UAccordion
              :items="[
                {
                  label: 'Bot Configuration',
                  icon: 'heroicons:cog-6-tooth',
                  defaultOpen: true,
                  slot: 'discord-config',
                },
                {
                  label: 'Webhook Management',
                  icon: 'heroicons:link',
                  defaultOpen: false,
                  slot: 'discord-webhooks',
                },
              ]"
            >
              <template #discord-config>
                <div class="pt-6">
                  <DiscordNotifications
                    ref="discordRef"
                    :is-loading="isLoading"
                    :is-saving="isSaving"
                    :settings="discordSettings"
                    @save="saveDiscordSettings"
                    @test="testDiscordNotification"
                  />
                </div>
              </template>

              <template #discord-webhooks>
                <div class="pt-6">
                  <DiscordWebhooks
                    ref="discordWebhooksRef"
                    :is-loading="isLoading"
                    :is-saving="isSaving"
                    :webhooks="discordWebhooks"
                    @save="saveDiscordWebhooks"
                  />
                </div>
              </template>
            </UAccordion>
          </div>
        </UCard>

        <UDivider class="my-16" />

        <!-- Email Provider Section, blurred until ready -->
        <UCard class="overflow-hidden blur-xs">
          <template #header>
            <div class="flex items-center justify-between p-1">
              <div class="flex items-center">
                <UIcon
                  name="heroicons:envelope"
                  class="mr-4 text-3xl text-green-500"
                />
                <div>
                  <h2 class="text-xl font-bold">Email</h2>
                  <p class="text-sm text-neutral-500 mt-1">
                    Configure SMTP email notifications
                  </p>
                </div>
              </div>
              <UBadge color="success" variant="soft">Available Provider</UBadge>
            </div>
          </template>

          <div class="p-6">
            <UAlert
              icon="heroicons:clock"
              color="warning"
              variant="soft"
              title="Coming Soon"
              description="Email notifications via SMTP are planned for a future release. Stay tuned for updates!"
              :close-button="false"
              class="mb-8"
            />

            <UAccordion
              disabled
              :items="[
                {
                  label: 'SMTP Configuration',
                  icon: 'heroicons:cog-6-tooth',
                  defaultOpen: false,
                  slot: 'email-config',
                },
              ]"
            >
              <template #email-config>
                <div class="pt-6">
                  <EmailNotifications
                    ref="emailRef"
                    :is-loading="isLoading"
                    :is-saving="isSaving"
                    :settings="emailSettings"
                    @save="saveEmailSettings"
                  />
                </div>
              </template>
            </UAccordion>
          </div>
        </UCard>

        <UDivider class="my-16" />

        <!-- General Settings Section -->
        <UCard class="overflow-hidden">
          <template #header>
            <div class="flex items-center p-1">
              <UIcon
                name="heroicons:adjustments-horizontal"
                class="mr-4 text-3xl text-orange-500"
              />
              <div>
                <h2 class="text-xl font-bold">General Settings</h2>
                <p class="text-sm text-neutral-500 mt-1">
                  Global notification preferences
                </p>
              </div>
            </div>
          </template>

          <div class="p-6">
            <UAlert
              icon="heroicons:light-bulb"
              color="info"
              variant="soft"
              title="Optimization Settings"
              description="Configure how notifications are batched and delivered to optimize performance and reduce spam."
              :close-button="false"
              class="mb-8"
            />

            <UAccordion
              :items="[
                {
                  label: 'Notification Batching',
                  icon: 'heroicons:squares-2x2',
                  defaultOpen: true,
                  slot: 'batching-config',
                },
              ]"
            >
              <template #batching-config>
                <div class="pt-6">
                  <BatchingSettings
                    ref="batchingRef"
                    :is-loading="isLoading"
                    :is-saving="isSaving"
                    :settings="batchingSettings"
                    @save="saveBatchingSettings"
                  />
                </div>
              </template>
            </UAccordion>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
