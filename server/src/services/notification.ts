import { ofetch } from 'ofetch';

import { NOTIFICATION_CONFIG } from '@/constants/notifications';
import logger from '@/integrations/logger';

import type { BlocketAd } from 'blocket.js';
import type { Notification } from '@/types/watchers';

/**
 * Formats a Blocket ad for notification
 * @param ad The Blocket ad to format
 * @returns Formatted ad information
 */
function formatAdInfo(ad: BlocketAd) {
  return {
    title: ad.subject,
    price: `${ad.price?.value}${ad.price?.suffix || ''}`,
    url: ad.share_url,
    image: ad.images && ad.images.length > 0 ? ad.images[0].url : null,
    description: ad.body,
  };
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param retryDelay Base delay between retries
 * @returns Result of the function or throws error after max retries
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  retryDelay: number,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn({
        message: `Retry attempt ${attempt + 1}/${maxRetries} failed`,
        error: lastError,
        attempt: attempt + 1,
        maxRetries,
      });

      if (attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay =
          retryDelay * Math.pow(1.5, attempt) * (0.9 + Math.random() * 0.2);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after multiple retries');
}

/**
 * Sends a notification to Discord via webhook with retry capability
 * @param ads List of Blocket ads to notify about
 * @param webhookUrl Custom webhook URL or undefined to use default
 */
export async function sendDiscordNotification(
  ads: BlocketAd[],
  webhookUrl?: string,
): Promise<void> {
  const { enabled, username, avatarUrl, maxRetries, retryDelay } =
    NOTIFICATION_CONFIG.discord;

  // Use provided webhook URL or fall back to config
  const targetWebhookUrl = webhookUrl || NOTIFICATION_CONFIG.discord.webhookUrl;

  if (!enabled || !targetWebhookUrl) {
    logger.debug('Discord notifications disabled or missing webhook URL');
    return;
  }

  try {
    const { enableBatching, batchSize } = NOTIFICATION_CONFIG.general;

    if (enableBatching && ads.length > 1) {
      // Process ads in batches
      for (let i = 0; i < ads.length; i += batchSize) {
        const batch = ads.slice(i, i + batchSize);

        logger.info({
          message: 'Sending Discord notification batch',
          batchSize: batch.length,
          batchNumber: Math.floor(i / batchSize) + 1,
          totalBatches: Math.ceil(ads.length / batchSize),
        });

        await sendDiscordBatch(
          batch,
          targetWebhookUrl,
          username,
          avatarUrl,
          maxRetries,
          retryDelay,
        );

        // Wait a bit between batches
        if (i + batchSize < ads.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } else {
      // Process ads individually
      logger.info({
        message: 'Sending individual Discord notifications',
        count: ads.length,
      });

      for (const ad of ads) {
        await sendDiscordSingle(
          ad,
          targetWebhookUrl,
          username,
          avatarUrl,
          maxRetries,
          retryDelay,
        );

        // Wait a bit between requests to avoid rate limits
        if (ads.indexOf(ad) < ads.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  } catch (error) {
    logger.error({
      error: error as Error,
      message: 'Error sending Discord notification',
      adsCount: ads.length,
    });
  }
}

/**
 * Sends a batch of ads to Discord
 */
async function sendDiscordBatch(
  ads: BlocketAd[],
  webhookUrl: string,
  username: string,
  avatarUrl: string,
  maxRetries: number,
  retryDelay: number,
): Promise<void> {
  if (ads.length === 0) return;

  const defaultUsername = username || 'Blocket Bot';
  const defaultAvatarUrl = avatarUrl || ads[0]?.images?.[0]?.url || undefined;

  const embeds = ads.map((ad) => {
    const adInfo = formatAdInfo(ad);
    return {
      title: adInfo.title,
      url: adInfo.url,
      description:
        adInfo.description?.substring(0, 200) +
        (adInfo.description?.length > 200 ? '...' : ''),
      fields: [
        {
          name: 'Price',
          value: adInfo.price,
          inline: true,
        },
      ],
      thumbnail: adInfo.image ? { url: adInfo.image } : undefined,
      timestamp: new Date().toISOString(),
    };
  });

  await withRetry(
    async () => {
      await ofetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: defaultUsername,
          avatar_url: defaultAvatarUrl,
          content: `Found ${ads.length} new listings!`,
          embeds: embeds.slice(0, 10),
        }),
      });
      logger.debug({
        message: 'Batch Discord notification sent successfully',
        count: ads.length,
      });
    },
    maxRetries,
    retryDelay,
  );
}

/**
 * Sends a single ad to Discord
 */
async function sendDiscordSingle(
  ad: BlocketAd,
  webhookUrl: string,
  username: string,
  avatarUrl: string,
  maxRetries: number,
  retryDelay: number,
): Promise<void> {
  const adInfo = formatAdInfo(ad);

  const defaultUsername = username || 'Blocket Bot';
  const defaultAvatarUrl = avatarUrl || ad.images?.[0]?.url || undefined;

  await withRetry(
    async () => {
      await ofetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: defaultUsername,
          avatar_url: defaultAvatarUrl,
          embeds: [
            {
              title: adInfo.title,
              url: adInfo.url,
              description:
                adInfo.description?.substring(0, 200) +
                (adInfo.description?.length > 200 ? '...' : ''),
              fields: [
                {
                  name: 'Price',
                  value: adInfo.price,
                  inline: true,
                },
              ],
              thumbnail: adInfo.image ? { url: adInfo.image } : undefined,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
      logger.debug({
        message: 'Single Discord notification sent successfully',
        ad: adInfo.title,
      });
    },
    maxRetries,
    retryDelay,
  );
}

/**
 * Sends an email notification (feature flagged off by default, upcoming feature)
 * @param ads List of Blocket ads to notify about
 * @param email Custom email address or undefined to use default
 */
async function sendEmailNotification(
  ads: BlocketAd[],
  email?: string,
): Promise<void> {
  const { enabled } = NOTIFICATION_CONFIG.email;

  // Feature flagged off by default
  if (!enabled) {
    return;
  }

  // Email implementation would go here when feature flag is enabled
  logger.info({
    message: 'Email notification would be sent',
    count: ads.length,
    email: email || 'default',
    enabled: false,
  });
}

/**
 * Sends notifications about new ads through configured channels
 * @param ads List of new Blocket ads
 * @param notifications Optional specific notification configurations
 */
export async function notifyAboutAds(
  ads: BlocketAd[],
  notifications?: Notification[],
): Promise<void> {
  if (!ads || !ads.length) {
    logger.debug('No ads to notify about');
    return;
  }

  logger.info({
    message: 'Sending notifications for new ads',
    count: ads.length,
    customNotifications: notifications ? notifications.length : 0,
  });

  const notificationPromises: Promise<void>[] = [];

  if (notifications && notifications.length > 0) {
    // Use provided notification configurations
    for (const notification of notifications) {
      if (notification.kind === 'DISCORD') {
        notificationPromises.push(
          sendDiscordNotification(ads, notification.webhook_url),
        );
      } else if (notification.kind === 'EMAIL') {
        notificationPromises.push(
          sendEmailNotification(ads, notification.email),
        );
      }
    }
  } else {
    // Fall back to default notification behavior
    notificationPromises.push(sendDiscordNotification(ads));
    notificationPromises.push(sendEmailNotification(ads));
  }

  // Send notifications in parallel
  await Promise.all(notificationPromises);
}
