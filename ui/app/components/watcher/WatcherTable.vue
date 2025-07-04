<script setup lang="ts">
import cronstrue from 'cronstrue';
import { h, resolveComponent } from 'vue';
import { upperFirst } from 'scule';

import { NOTIFICATION_ICON_MAP, MARKETPLACE_LABELS } from '~/constants';
import { useTableFiltersStore } from '~/stores/table-filters-store';

import WatcherTableFilters from '~/components/watcher/WatcherTableFilters.vue';

import type { TableColumn } from '@nuxt/ui';

const UButton = resolveComponent('UButton');
const UBadge = resolveComponent('UBadge');
const UDropdownMenu = resolveComponent('UDropdownMenu');
const UIcon = resolveComponent('UIcon');
const UTooltip = resolveComponent('UTooltip');

const watcherStore = useWatcherStore();
const toast = useToast();
const tableFiltersStore = useTableFiltersStore();

// Use the composable for all action functions
const {
  refreshing,
  isLoading,
  hasError,
  refresh,
  start,
  stop,
  trigger,
  clearAllFilters,
  openWatcherModal,
  openConfirmationModal,
  initialize,
  watchAuthState,
} = useWatcherTableActions();

const { watchers } = storeToRefs(watcherStore);

// Initialize and watch auth state
onMounted(initialize);
watchAuthState();

// Wrapper function for clearAllFilters that uses the table ref
function handleClearAllFilters() {
  // Clear store state
  tableFiltersStore.clearAllFilters();

  // Also clear table filters directly to ensure sync
  clearAllFilters(table.value);
}

// Computed property to show active filters
const activeFilters = computed(
  (): Array<{
    column: string;
    value: unknown;
    displayValue: string;
    label: string;
  }> => {
    if (!table.value?.tableApi) return [];

    const filters: Array<{
      column: string;
      value: unknown;
      displayValue: string;
      label: string;
    }> = [];
    const columns = table.value.tableApi.getAllColumns();

    for (const column of columns) {
      const filterValue = column.getFilterValue();

      // Only show search and marketplace filters
      if (!filterValue || !['queries', 'marketplace'].includes(column.id)) {
        continue;
      }

      let displayValue = filterValue as string;

      // Make filter values more human-readable
      switch (column.id) {
        case 'marketplace':
          if (Array.isArray(filterValue)) {
            // Handle multiple marketplace selection - create separate filters for each
            for (const marketplace of filterValue) {
              filters.push({
                column: column.id,
                value: marketplace,
                displayValue: MARKETPLACE_LABELS[marketplace] || marketplace,
                label: 'Marketplace',
              });
            }
            continue; // Skip the general push below since we handled each individually
          } else {
            // Handle single marketplace selection (backward compatibility)
            displayValue =
              MARKETPLACE_LABELS[filterValue as string] ||
              (filterValue as string);
          }
          break;
        case 'queries':
          displayValue = `"${filterValue}"`;
          break;
      }

      filters.push({
        column: column.id,
        value: filterValue,
        displayValue,
        label:
          column.id === 'queries'
            ? 'Query search'
            : upperFirst(column.id.replace('_', ' ')),
      });
    }

    return filters;
  }
);

const columns: ComputedRef<TableColumn<Watcher>[]> = computed(() => [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => `#${row.getValue('id')}`,
  },
  {
    accessorKey: 'queries',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Queries',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      });
    },
    cell: ({ row }) => {
      const watcher = row.original;
      const queries = watcher.queries.filter((q) => q.enabled !== false);

      // Handle case with no queries
      if (!queries || queries.length === 0) {
        return h('div', { class: 'lowercase text-neutral-500' }, 'No queries');
      }

      // Single query
      if (queries.length === 1) {
        const firstQuery = queries[0];
        return h(
          'div',
          { class: 'lowercase' },
          firstQuery?.query || 'No query'
        );
      }

      // Multiple queries
      const firstQuery = queries[0];
      if (!firstQuery) {
        return h('div', { class: 'lowercase text-neutral-500' }, 'No queries');
      }

      return h('div', { class: 'flex flex-col gap-1' }, [
        h('div', { class: 'lowercase font-medium' }, firstQuery.query),
        h(
          'div',
          { class: 'text-xs text-neutral-500' },
          `+${queries.length - 1} more ${
            queries.length - 1 === 1 ? 'query' : 'queries'
          }`
        ),
      ]);
    },
    sortingFn: (rowA, rowB) => {
      const queriesA = rowA.original.queries.filter((q) => q.enabled !== false);
      const queriesB = rowB.original.queries.filter((q) => q.enabled !== false);

      const firstQueryA =
        queriesA.length > 0 && queriesA[0] ? queriesA[0].query : '';
      const firstQueryB =
        queriesB.length > 0 && queriesB[0] ? queriesB[0].query : '';

      return firstQueryA.localeCompare(firstQueryB);
    },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;

      const watcher = row.original;
      const queries = watcher.queries.filter((q) => q.enabled !== false);

      // Search across all enabled queries
      return queries.some((query) =>
        query.query.toLowerCase().includes(filterValue.toLowerCase())
      );
    },
  },
  {
    accessorKey: 'marketplace',
    header: 'Marketplace',
    cell: ({ row }) => {
      const watcher = row.original;
      const marketplace = watcher.marketplace || 'BLOCKET';

      return h(
        UBadge,
        {
          class: 'capitalize',
          variant: 'outline',
          color: marketplace === 'BLOCKET' ? 'primary' : 'secondary',
        },
        () => MARKETPLACE_LABELS[marketplace] || marketplace.toLowerCase()
      );
    },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const watcher = row.original;
      const marketplace = watcher.marketplace || 'BLOCKET';

      // Handle array filtering for multiple marketplace selection
      if (Array.isArray(filterValue)) {
        return filterValue.includes(marketplace);
      }

      // Handle single value filtering (backward compatibility)
      return marketplace === filterValue;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const watcher = row.original;

      const status = watcher.status;

      const color =
        status === 'active'
          ? 'success'
          : status === 'stopped'
          ? 'error'
          : 'neutral';

      return h(
        UBadge,
        { class: 'capitalize', variant: 'subtle', color },
        () => status
      );
    },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const watcher = row.original;
      return watcher.status === filterValue;
    },
  },
  {
    accessorKey: 'schedule',
    header: 'Schedule',
    cell: ({ row }) => {
      const schedule = row.getValue('schedule') as string;

      return h(
        UTooltip,
        {
          text: cronstrue.toString(schedule),
          placement: 'bottom',
          delayDuration: 200,
        },
        h(
          'p',
          {
            class: 'lowercase',
          },
          schedule
        )
      );
    },
  },
  {
    id: 'price_range',
    header: 'Price Range',
    cell: ({ row }) => {
      const watcher = row.original;
      const minPrice = watcher.min_price;
      const maxPrice = watcher.max_price;

      if (minPrice === null && maxPrice === null) {
        return h('span', { class: 'text-neutral-500' }, 'Any price');
      }

      if (minPrice !== null && maxPrice !== null) {
        return h('span', {}, `${minPrice} - ${maxPrice} SEK`);
      }

      if (minPrice !== null) {
        return h('span', {}, `Min: ${minPrice} SEK`);
      }

      if (maxPrice !== null) {
        return h('span', {}, `Max: ${maxPrice} SEK`);
      }

      return h('span', { class: 'text-neutral-500' }, 'Any price');
    },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;

      const watcher = row.original;
      const minPrice = watcher.min_price;
      const maxPrice = watcher.max_price;

      switch (filterValue) {
        case 'any':
          return minPrice === null && maxPrice === null;
        case 'with_range':
          return minPrice !== null || maxPrice !== null;
        case 'budget': {
          // Budget: either max price is < 1000 or (no max and min < 1000)
          if (maxPrice !== null && maxPrice !== undefined)
            return maxPrice < 1000;
          if (minPrice !== null && minPrice !== undefined)
            return minPrice < 1000;
          return minPrice === null && maxPrice === null; // Any price could be budget
        }
        case 'mid': {
          // Mid-range: 1000-5000 SEK
          const effectiveMin = minPrice || 0;
          const effectiveMax = maxPrice || Infinity;
          return (
            (effectiveMin >= 1000 && effectiveMin <= 5000) ||
            (effectiveMax >= 1000 && effectiveMax <= 5000) ||
            (effectiveMin < 1000 && effectiveMax > 5000)
          );
        }
        case 'premium': {
          // Premium: > 5000 SEK
          if (minPrice !== null && minPrice !== undefined)
            return minPrice > 5000;
          if (maxPrice !== null && maxPrice !== undefined)
            return maxPrice > 5000;
          return minPrice === null && maxPrice === null; // Any price could be premium
        }
        default:
          return true;
      }
    },
  },
  {
    accessorKey: 'last_run',
    header: 'Last Run',
    cell: ({ row }) => {
      return new Date(row.getValue('last_run')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    },
  },
  {
    accessorKey: 'notifications',
    header: () => h('div', { class: 'text-left' }, 'Enabled Notifications'),
    cell: ({ row }) => {
      const notifications = row.getValue('notifications') as Array<
        DiscordNotification | EmailNotification
      >;

      return h(
        'div',
        { class: 'flex flex-wrap items-center justify-start gap-2' },
        notifications.map((notification) =>
          h(UIcon, {
            name: NOTIFICATION_ICON_MAP[notification.kind],
            class: 'text-lg',
            title: notification,
          })
        )
      );
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const watcher = row.original;

      return h('div', { class: 'flex items-center justify-end gap-2' }, [
        watcher.status === 'active'
          ? h(
              UTooltip,
              {
                text: 'Pause',
                placement: 'top',
                delayDuration: 200,
              },
              h(UButton, {
                icon: 'i-lucide-pause',
                color: 'error',
                variant: 'ghost',
                size: 'xl',
                'aria-label': 'Pause',
                onClick: () => {
                  stop(watcher.id!);
                },
              })
            )
          : h(
              UTooltip,
              {
                text: 'Start',
                placement: 'top',
                delayDuration: 200,
              },
              h(UButton, {
                icon: 'i-lucide-play',
                color: 'success',
                variant: 'ghost',
                size: 'xl',
                'aria-label': 'Start',
                onClick: () => {
                  start(watcher.id!);
                },
              })
            ),

        // Edit button with tooltip
        h(
          UTooltip,
          {
            text: 'Edit',
            placement: 'top',
            delayDuration: 200,
          },
          h(UButton, {
            icon: 'i-lucide-pencil',
            color: 'neutral',
            variant: 'ghost',
            size: 'xl',
            'aria-label': 'Edit',
            onClick: () => {
              openWatcherModal(watcher);
            },
          })
        ),

        // Trigger button with tooltip
        h(
          UTooltip,
          {
            text: 'Trigger',
            placement: 'top',
            delayDuration: 200,
          },
          h(UButton, {
            icon: 'i-lucide-zap',
            color: 'success',
            variant: 'ghost',
            size: 'xl',
            'aria-label': 'Trigger',
            onClick: () => {
              trigger(watcher.id!);
            },
          })
        ),

        // Actions dropdown (kept for other actions)
        h(
          UDropdownMenu,
          {
            content: {
              align: 'end',
            },
            items: [
              {
                type: 'label',
                label: 'Actions',
              },
              {
                label: 'Copy ID',
                onSelect() {
                  navigator.clipboard.writeText(row.original.id!);
                  toast.add({
                    title: 'ID copied to clipboard!',
                    color: 'success',
                    icon: 'i-lucide-circle-check',
                  });
                },
              },
              {
                label: row.getIsExpanded() ? 'Collapse' : 'Expand',
                onSelect() {
                  row.toggleExpanded();
                },
              },
              {
                type: 'separator',
              },
              {
                label: 'Delete',
                color: 'error',
                onSelect() {
                  openConfirmationModal(watcher.id!);
                },
              },
            ],
            'aria-label': 'Actions dropdown',
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              size: 'xl',
              'aria-label': 'Actions dropdown',
            })
        ),
      ]);
    },
  },
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = useTemplateRef<any>('table');
</script>

<template>
  <div class="flex-1 divide-y divide-(--ui-border-accented) w-full">
    <div v-if="hasError" class="p-4 text-center">
      <p class="text-red-500 mb-2">Failed to load watchers</p>
      <UButton label="Try again" @click="refresh" />
    </div>

    <WatcherTableFilters
      v-if="table?.tableApi"
      :table="table"
      :refreshing="refreshing"
      :active-filters="activeFilters"
      @refresh="refresh"
      @clear-all-filters="handleClearAllFilters"
    />

    <UTable
      ref="table"
      :data="watchers ?? []"
      :columns="columns"
      :loading="refreshing || isLoading"
      sticky
      class="h-96"
      aria-label="Watcher table"
    >
      <template #expanded="{ row }">
        <pre>{{ row.original }}</pre>
      </template>
    </UTable>

    <div class="px-4 py-3.5 text-sm text-(--ui-text-muted)">
      {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
      {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s)
      selected.
    </div>
  </div>
</template>
