import TelegramBot from 'node-telegram-bot-api';
import {
  deleteUserData,
  upsertPremiumUser,
  getUser,
  acceptConsent,
  markPdfGiftSent,
  hasConsent,
  getLatestPlan,
} from '../db/repository.js';
import { generateMenuPdfBuffer } from '../services/pdf.js';
import { SAMPLE_3_DAY_MENU, getSample7DayMenu } from '../services/sampleMenu.js';
import { WeekPlan } from '../services/claude.js';
import { prices } from '../routes/payment.js';

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

const WELCOME_BACK_MESSAGE = `С возвращением! 👋

Твой персональный AI-диетолог готов помочь.
Открой приложение, чтобы посмотреть рацион или задать вопрос.`;

const GIFT_MESSAGE = `🎁 Твой подарок — меню на 3 дня в PDF!

Бесплатно: меню на 3 дня и 3 вопроса диетологу в день.
Premium (299 ⭐/мес): полный рацион на 7 дней, безлимитный чат и обновление меню.`;

function openAppKeyboard(frontendUrl: string) {
  return {
    inline_keyboard: [
      [{ text: '📱 Открыть приложение', web_app: { url: frontendUrl } }],
      [{ text: '📄 Политика конфиденциальности', callback_data: 'privacy' }],
    ],
  };
}

function giftKeyboard(frontendUrl: string) {
  return {
    inline_keyboard: [
      [{ text: '🚀 Хочу полный рацион', web_app: { url: frontendUrl } }],
      [{ text: '📄 Хочу PDF на неделю', callback_data: 'buy_pdf_week' }],
    ],
  };
}

async function getMenuForPdf(telegramId: string, days: 3 | 7): Promise<WeekPlan> {
  const planRow = await getLatestPlan(telegramId);
  if (planRow) {
    const plan = JSON.parse(planRow.plan_data) as WeekPlan;
    return { ...plan, days: plan.days.slice(0, days) };
  }
  return days === 3 ? SAMPLE_3_DAY_MENU : getSample7DayMenu();
}

async function sendGiftPdf(bot: TelegramBot, chatId: number, telegramId: string) {
  const menu = await getMenuForPdf(telegramId, 3);
  const pdf = await generateMenuPdfBuffer(menu, 'Меню на 3 дня — @dietmealfitbot');
  await bot.sendDocument(chatId, pdf, {
    caption: '🎁 Подарок: меню на 3 дня',
  }, {
    filename: 'menu-3-dnya.pdf',
    contentType: 'application/pdf',
  });
}

async function sendWeekPdf(bot: TelegramBot, chatId: number, telegramId: string) {
  const menu = await getMenuForPdf(telegramId, 7);
  const pdf = await generateMenuPdfBuffer(menu, 'Меню на 7 дней — @dietmealfitbot');
  await bot.sendDocument(chatId, pdf, {
    caption: '📄 Твоё меню на неделю',
  }, {
    filename: 'menu-nedelya.pdf',
    contentType: 'application/pdf',
  });
}

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
    const telegramId = String(msg.from?.id);
    const user = await getUser(telegramId);

    if (hasConsent(user)) {
      await bot.sendMessage(chatId, WELCOME_BACK_MESSAGE, {
        reply_markup: openAppKeyboard(frontendUrl),
      });
      return;
    }

    await bot.sendMessage(chatId, START_MESSAGE, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Принять и начать', callback_data: 'accept_start' }],
          [{ text: '📄 Политика конфиденциальности', callback_data: 'privacy' }],
        ],
      },
    });
  });

  bot.on('callback_query', async (query) => {
    if (!query.message || !query.from) return;
    const chatId = query.message.chat.id;
    const telegramId = String(query.from.id);

    if (query.data === 'privacy') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, PRIVACY_POLICY);
      return;
    }

    if (query.data === 'accept_start') {
      await bot.answerCallbackQuery(query.id);
      const isFirstAccept = await acceptConsent(telegramId, query.from.first_name);
      const user = await getUser(telegramId);

      if (isFirstAccept && !user?.pdf_gift_sent) {
        try {
          await sendGiftPdf(bot, chatId, telegramId);
          await markPdfGiftSent(telegramId);
        } catch (err) {
          console.error('PDF gift error:', err);
        }
        await bot.sendMessage(chatId, GIFT_MESSAGE, {
          reply_markup: giftKeyboard(frontendUrl),
        });
      }

      await bot.sendMessage(chatId, 'Готово! Открой приложение 👇', {
        reply_markup: openAppKeyboard(frontendUrl),
      });
      return;
    }

    if (query.data === 'buy_pdf_week') {
      await bot.answerCallbackQuery(query.id);
      const title = 'PDF меню на 7 дней';
      const description = 'Полное меню на неделю в PDF-формате';
      await bot.sendInvoice(chatId, title, description, 'pdf_weekly', '', 'XTR', [
        { label: title, amount: prices.pdf_weekly },
      ]);
      return;
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

    if (payload === 'pdf_weekly') {
      try {
        await sendWeekPdf(bot, msg.chat.id, telegramId);
        await bot.sendMessage(msg.chat.id, '✅ PDF на неделю отправлен!');
      } catch (err) {
        console.error('Week PDF error:', err);
        await bot.sendMessage(msg.chat.id, 'Не удалось отправить PDF. Напиши /start');
      }
      return;
    }

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
      '🎉 Premium активирован!\n\n✅ Меню на 7 дней\n✅ Безлимитный чат\n✅ Обновление рациона\n\nОткрой приложение 👇',
      { reply_markup: openAppKeyboard(process.env.FRONTEND_URL || 'http://localhost:5173') }
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
  const amount = prices[plan];
  const title = plan === 'monthly' ? 'Premium на 1 месяц' : 'Premium на 1 год';
  const description =
    plan === 'monthly'
      ? 'Меню на 7 дней, безлимитный чат, обновление рациона'
      : 'Premium на 1 год (скидка 30%)';

  await bot.sendInvoice(chatId, title, description, plan, '', 'XTR', [
    { label: title, amount },
  ]);
}
