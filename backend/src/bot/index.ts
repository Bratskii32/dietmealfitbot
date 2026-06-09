import TelegramBot from 'node-telegram-bot-api';
import { deleteUserData, upsertPremiumUser } from '../db/repository.js';

const PRIVACY_POLICY = `📄 Политика конфиденциальности @dietmealfitbot

1. Какие данные собираем: имя (из Telegram), возраст, пол, рост, вес, цели питания, аллергии, история чата с AI.

2. Зачем: исключительно для составления персонального рациона питания внутри приложения.

3. Где хранятся: на защищённом сервере. Не передаются третьим лицам, не используются в рекламных целях.

4. Как удалить: напиши /delete — все твои данные будут удалены в течение 24 часов.

5. Оператор данных: бот @dietmealfitbot, разработчик — физическое лицо, Россия.

6. Основание обработки: согласие пользователя (ст. 9 ФЗ №152).`;

const START_MESSAGE = `Привет! Я AI-диетолог 🥗

Помогу составить персональный рацион питания, рецепты и отвечу на вопросы по питанию.

⚠️ Для работы мне нужны твои данные (возраст, вес, рост, цели питания).
Они хранятся только для персонализации твоего рациона и никому не передаются.

Нажимая «Принять и начать», ты соглашаешься с обработкой персональных данных
в соответствии с Федеральным законом №152-ФЗ «О персональных данных».

⚕️ Дисклеймер: бот не является медицинским устройством и не заменяет консультацию врача.`;

export function initBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не задан — бот не запущен');
    return null;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, START_MESSAGE, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Принять и начать', web_app: { url: frontendUrl } }],
          [{ text: '📄 Политика конфиденциальности', callback_data: 'privacy' }],
        ],
      },
    });
  });

  bot.on('callback_query', async (query) => {
    if (query.data === 'privacy' && query.message) {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(query.message.chat.id, PRIVACY_POLICY);
    }
  });

  bot.onText(/\/delete/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id);

    if (!telegramId) return;

    await deleteUserData(telegramId);

    await bot.sendMessage(
      chatId,
      '✅ Все твои данные удалены. Если захочешь вернуться — напиши /start'
    );
  });

  bot.on('pre_checkout_query', async (query) => {
    await bot.answerPreCheckoutQuery(query.id, true);
  });

  bot.on('successful_payment', async (msg) => {
    const telegramId = String(msg.from?.id);
    const payload = msg.successful_payment?.invoice_payload;

    if (!telegramId || !payload) return;

    const plan = payload as 'monthly' | 'yearly';
    const now = new Date();
    const premiumUntil = new Date(now);

    if (plan === 'monthly') {
      premiumUntil.setMonth(premiumUntil.getMonth() + 1);
    } else {
      premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);
    }

    await upsertPremiumUser(telegramId, msg.from?.first_name || '', premiumUntil.toISOString());

    await bot.sendMessage(
      msg.chat.id,
      '🎉 Premium активирован! Теперь у тебя безлимитные консультации с AI-диетологом.'
    );
  });

  console.log('Telegram бот запущен');
  return bot;
}

export async function sendStarsInvoice(
  bot: TelegramBot,
  chatId: number,
  plan: 'monthly' | 'yearly'
) {
  const { prices } = await import('../routes/payment.js');
  const amount = prices[plan];
  const title = plan === 'monthly' ? 'Premium на 1 месяц' : 'Premium на 1 год';
  const description =
    plan === 'monthly'
      ? 'Безлимитные консультации AI-диетолога на 30 дней'
      : 'Безлимитные консультации AI-диетолога на 1 год (скидка 30%)';

  await bot.sendInvoice(chatId, title, description, plan, '', 'XTR', [
    { label: title, amount },
  ]);
}
