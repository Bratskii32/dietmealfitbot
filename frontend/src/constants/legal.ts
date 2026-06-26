const GOOGLE_OFFER_URL =
  'https://docs.google.com/document/d/1sACgfRUYk7ZCVXphK1eGivewlphZ539K/edit?usp=drive_link&ouid=103071657921641283300&rtpof=true&sd=true';
const GOOGLE_PRIVACY_URL =
  'https://docs.google.com/document/d/1ZXC-poYu1OEZ4zq3Jxs2fhv24siVBIza/edit?usp=drive_link&ouid=103071657921641283300&rtpof=true&sd=true';

const DOMAIN_OFFER_URL = 'https://tvoy-dietolog.ru/oferta';
const DOMAIN_PRIVACY_URL = 'https://tvoy-dietolog.ru/privacy';

/** Переключить на true после подключения домена tvoy-dietolog.ru */
const USE_CUSTOM_DOMAIN = false;

export const OFFER_URL = USE_CUSTOM_DOMAIN ? DOMAIN_OFFER_URL : GOOGLE_OFFER_URL;
export const PRIVACY_URL = USE_CUSTOM_DOMAIN ? DOMAIN_PRIVACY_URL : GOOGLE_PRIVACY_URL;
