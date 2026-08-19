/**
 * Seeds the six `content_pages` rows that `nav-links.ts` links to
 * (`faqs`, `shipping-policy`, `returns`, `about-us`, `privacy-policy`,
 * `terms-of-service`). Without these rows the routes 404 — the page
 * component (`/[locale]/p/[slug]`) calls `notFound()` on a missing row.
 *
 *   npm run seed:content-pages
 *
 * Upserts on slug (`onConflict: 'slug'`), so it's safe to re-run: it
 * overwrites the copy below but never creates a duplicate. Uses the
 * service-role client the same way `scripts/seed/load.ts` does — RLS
 * on `content_pages` only allows admins to write, and this script has
 * no session to be an admin with.
 */

import { createClient } from '@supabase/supabase-js';

type Page = {
  slug: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
};

const pages: Page[] = [
  {
    slug: 'about-us',
    title_en: 'About Us',
    title_ar: 'من نحن',
    body_en: `Jannati is a beauty and personal care destination built for the Gulf, carrying skincare, makeup, fragrance, and haircare from brands shoppers already trust alongside a curated selection of new discoveries.

We ship across the GCC and price everything in your local currency, so what you see at checkout is what you pay — no surprise conversions, no guessing.

Every product on Jannati is sourced through authorized channels. We don't sell grey-market stock, and we stand behind what we carry.

Our team is based in the region we serve, which means support that understands local shipping timelines, payment habits, and what "getting it right" actually looks like for customers here.`,
    body_ar: `جنتي وجهة للجمال والعناية الشخصية صُممت لمنطقة الخليج، تضم منتجات العناية بالبشرة والمكياج والعطور والعناية بالشعر من ماركات موثوقة إلى جانب مجموعة مختارة من الاكتشافات الجديدة.

نشحن إلى دول مجلس التعاون الخليجي ونعرض الأسعار بعملتك المحلية، فما تراه عند الدفع هو ما تدفعه فعلاً — دون تحويلات مفاجئة أو تخمين.

كل منتج على جنتي مصدره قنوات معتمدة. نحن لا نبيع بضائع من السوق الموازي، ونقف خلف كل ما نعرضه.

فريقنا موجود في المنطقة التي نخدمها، مما يعني دعمًا يفهم مواعيد الشحن المحلية وعادات الدفع وما يعنيه "إنجاز الأمر بشكل صحيح" فعليًا لعملائنا هنا.`,
  },
  {
    slug: 'faqs',
    title_en: 'Frequently Asked Questions',
    title_ar: 'الأسئلة الشائعة',
    body_en: `Which countries do you ship to?
We currently ship across the GCC. Available countries are shown at checkout.

How long does delivery take?
Most orders arrive within 2-5 business days, depending on your country and city.

What payment methods do you accept?
We accept major cards and, in supported countries, cash on delivery. Available options are shown at checkout.

How do I know if an item is authentic?
Everything we sell is sourced through authorized channels. We don't carry grey-market or counterfeit stock.

Can I change or cancel my order?
Contact us as soon as possible after placing your order. Once an order has shipped, we can no longer change it.

How do I return an item?
See our Returns page for the full policy and steps.

How do I contact support?
Use the contact form on our Contact page, or reach us through the channels listed there.`,
    body_ar: `إلى أي دول تشحنون؟
نشحن حاليًا إلى دول مجلس التعاون الخليجي. الدول المتاحة تظهر عند الدفع.

كم يستغرق التوصيل؟
تصل معظم الطلبات خلال 2 إلى 5 أيام عمل، حسب دولتك ومدينتك.

ما وسائل الدفع المتاحة؟
نقبل البطاقات الرئيسية، وفي الدول المدعومة، الدفع عند الاستلام. الخيارات المتاحة تظهر عند الدفع.

كيف أتأكد أن المنتج أصلي؟
كل ما نبيعه مصدره قنوات معتمدة. نحن لا نتعامل مع بضائع السوق الموازي أو المقلدة.

هل يمكنني تعديل أو إلغاء طلبي؟
تواصل معنا في أقرب وقت ممكن بعد تقديم الطلب. بمجرد شحن الطلب، لا يمكننا تعديله.

كيف أعيد منتجًا؟
راجع صفحة الإرجاع للاطلاع على السياسة الكاملة والخطوات.

كيف أتواصل مع الدعم؟
استخدم نموذج التواصل في صفحة اتصل بنا، أو تواصل معنا عبر القنوات المذكورة هناك.`,
  },
  {
    slug: 'shipping-policy',
    title_en: 'Shipping Policy',
    title_ar: 'سياسة الشحن',
    body_en: `Coverage
We ship to countries across the GCC. The countries and cities we currently deliver to are shown at checkout — if your address isn't listed there, we don't yet serve it.

Delivery times
Most orders arrive within 2-5 business days of dispatch. Delivery times can vary by country, city, and courier load, especially around holidays and sale periods.

Shipping costs
Shipping costs are calculated at checkout based on your delivery address and order size. Any free-shipping threshold currently running is shown at checkout.

Order tracking
Once your order ships, you'll receive tracking details so you can follow it to your door.

Delays
Occasionally, weather, customs, or courier delays push delivery past the usual window. If your order is significantly late, contact us and we'll look into it.`,
    body_ar: `التغطية
نشحن إلى دول مجلس التعاون الخليجي. الدول والمدن التي نوصل إليها حاليًا تظهر عند الدفع — إذا لم يكن عنوانك مدرجًا هناك، فنحن لا نخدمه بعد.

مدة التوصيل
تصل معظم الطلبات خلال 2 إلى 5 أيام عمل من تاريخ الشحن. قد تختلف مدة التوصيل حسب الدولة والمدينة وحجم عمل شركة الشحن، خاصة خلال العطلات وفترات التخفيضات.

تكاليف الشحن
تُحسب تكلفة الشحن عند الدفع بناءً على عنوان التوصيل وحجم الطلب. أي حد أدنى للشحن المجاني معمول به حاليًا يظهر عند الدفع.

تتبع الطلب
بمجرد شحن طلبك، ستصلك تفاصيل التتبع لمتابعته حتى باب منزلك.

التأخيرات
في بعض الأحيان، قد تؤدي عوامل الطقس أو الجمارك أو تأخيرات شركة الشحن إلى تجاوز مدة التوصيل المعتادة. إذا تأخر طلبك بشكل كبير، تواصل معنا وسنتابع الأمر.`,
  },
  {
    slug: 'returns',
    title_en: 'Returns & Refunds',
    title_ar: 'الإرجاع والاسترداد',
    body_en: `Return window
You may request a return within 14 days of delivery.

Condition
Items must be unused, unopened, and in their original packaging. For hygiene reasons, opened beauty and personal care products cannot be returned unless they arrived damaged or defective.

How to start a return
Contact us through the Contact page with your order number and the reason for return. We'll confirm eligibility and send you next steps.

Refunds
Once we receive and inspect a returned item, we'll process your refund to the original payment method. Refunds typically post within 5-10 business days after approval.

Damaged or incorrect items
If an item arrives damaged, defective, or different from what you ordered, contact us within 48 hours of delivery with photos, and we'll arrange a replacement or refund at no cost to you.`,
    body_ar: `مدة الإرجاع
يمكنك طلب إرجاع خلال 14 يومًا من تاريخ التسليم.

الحالة المطلوبة
يجب أن تكون المنتجات غير مستخدمة وغير مفتوحة وفي عبوتها الأصلية. لأسباب صحية، لا يمكن إرجاع منتجات التجميل والعناية الشخصية المفتوحة إلا إذا وصلت تالفة أو معيبة.

كيفية بدء عملية الإرجاع
تواصل معنا عبر صفحة اتصل بنا مع ذكر رقم طلبك وسبب الإرجاع. سنتحقق من الأهلية ونرسل لك الخطوات التالية.

الاسترداد
بمجرد استلام المنتج المرتجع وفحصه، سنقوم بمعالجة استرداد المبلغ إلى وسيلة الدفع الأصلية. عادةً ما يظهر الاسترداد خلال 5 إلى 10 أيام عمل بعد الموافقة.

المنتجات التالفة أو الخاطئة
إذا وصل منتج تالفًا أو معيبًا أو مختلفًا عمّا طلبته، تواصل معنا خلال 48 ساعة من التسليم مع إرفاق صور، وسنرتب لك الاستبدال أو الاسترداد دون أي تكلفة عليك.`,
  },
  {
    slug: 'privacy-policy',
    title_en: 'Privacy Policy',
    title_ar: 'سياسة الخصوصية',
    body_en: `What we collect
When you shop with us, we collect what's needed to process your order and support you: your name, contact details, shipping address, and order history. If you create an account, we store your login details securely.

How we use it
We use your information to fulfil orders, provide customer support, send order updates, and — only if you opt in — send you marketing about new products and offers.

Payment data
We don't store your full card details. Payments are processed by our payment provider, and we only keep what's needed to show your order history and handle refunds.

Sharing
We share your data with the couriers and payment providers needed to deliver your order, and don't sell your personal data to third parties.

Your rights
You can ask us to access, correct, or delete your personal data at any time, and unsubscribe from marketing emails whenever you like. Contact us through the Contact page to make a request.

Cookies
We use cookies to keep you signed in, remember your cart, and understand how the site is used, so we can improve it.`,
    body_ar: `ما الذي نجمعه
عند التسوق معنا، نجمع ما يلزم لمعالجة طلبك ودعمك: اسمك وبيانات التواصل وعنوان الشحن وسجل الطلبات. إذا أنشأت حسابًا، نخزّن بيانات تسجيل الدخول بشكل آمن.

كيف نستخدمها
نستخدم بياناتك لإتمام الطلبات وتقديم دعم العملاء وإرسال تحديثات الطلبات، وفقط في حال موافقتك، إرسال تسويق حول المنتجات والعروض الجديدة.

بيانات الدفع
لا نخزّن بيانات بطاقتك الكاملة. تتم معالجة المدفوعات عبر مزوّد الدفع الخاص بنا، ونحتفظ فقط بما يلزم لعرض سجل طلباتك ومعالجة الاسترداد.

المشاركة
نشارك بياناتك مع شركات الشحن ومزودي الدفع اللازمين لتوصيل طلبك، ولا نبيع بياناتك الشخصية لأطراف ثالثة.

حقوقك
يمكنك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها في أي وقت، وإلغاء الاشتراك من الرسائل التسويقية متى شئت. تواصل معنا عبر صفحة اتصل بنا لتقديم طلبك.

ملفات تعريف الارتباط
نستخدم ملفات تعريف الارتباط لإبقائك مسجّلاً للدخول وتذكّر سلة التسوق وفهم كيفية استخدام الموقع لتحسينه.`,
  },
  {
    slug: 'terms-of-service',
    title_en: 'Terms of Service',
    title_ar: 'الشروط والأحكام',
    body_en: `Using our site
By placing an order with Jannati, you agree to these terms. Please read them before you shop.

Orders and pricing
Prices are shown in the currency of your selected country and include any taxes required by law, unless stated otherwise. We reserve the right to correct pricing errors and to cancel orders affected by them, with a full refund.

Product information
We work to keep product descriptions, images, and pricing accurate, but occasional errors can happen. We'll always contact you before fulfilling an order affected by a pricing or availability error.

Payments
Payment is processed at checkout through our payment provider. Your order is confirmed once payment is successfully authorized.

Shipping and returns
See our Shipping Policy and Returns & Refunds pages for delivery timelines and how to return an item.

Account responsibility
If you create an account, you're responsible for keeping your login details secure and for activity under your account.

Changes to these terms
We may update these terms from time to time. Continued use of the site after changes take effect means you accept the updated terms.

Contact
Questions about these terms can be sent through our Contact page.`,
    body_ar: `استخدام موقعنا
بإتمام طلب مع جنتي، فإنك توافق على هذه الشروط. يُرجى قراءتها قبل التسوق.

الطلبات والأسعار
تُعرض الأسعار بعملة الدولة التي اخترتها وتشمل أي ضرائب مطلوبة قانونًا، ما لم يُذكر خلاف ذلك. نحتفظ بالحق في تصحيح أخطاء التسعير وإلغاء الطلبات المتأثرة بها، مع استرداد كامل للمبلغ.

معلومات المنتج
نعمل على إبقاء أوصاف المنتجات وصورها وأسعارها دقيقة، لكن قد تحدث أخطاء أحيانًا. سنتواصل معك دائمًا قبل تنفيذ أي طلب متأثر بخطأ في السعر أو التوفر.

المدفوعات
تتم معالجة الدفع عند إتمام الطلب عبر مزوّد الدفع الخاص بنا. يُعتبر طلبك مؤكدًا بمجرد الموافقة على الدفع بنجاح.

الشحن والإرجاع
راجع صفحتي سياسة الشحن والإرجاع والاسترداد لمعرفة مواعيد التوصيل وكيفية إرجاع منتج.

مسؤولية الحساب
إذا أنشأت حسابًا، فأنت مسؤول عن الحفاظ على سرية بيانات تسجيل الدخول وعن أي نشاط يتم تحت حسابك.

التعديلات على هذه الشروط
قد نقوم بتحديث هذه الشروط من وقت لآخر. استمرارك في استخدام الموقع بعد سريان التعديلات يعني موافقتك على الشروط المحدّثة.

التواصل
يمكن إرسال الأسئلة حول هذه الشروط عبر صفحة اتصل بنا.`,
  },
];

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const supabase = client();

  const rows = pages.map((page) => ({
    slug: page.slug,
    title_ar: page.title_ar,
    title_en: page.title_en,
    body_ar: page.body_ar,
    body_en: page.body_en,
    published: true,
  }));

  const { error } = await supabase.from('content_pages').upsert(rows, { onConflict: 'slug' });
  if (error) throw new Error(`seeding content pages: ${error.message}`);

  console.log(`Seeded ${rows.length} content pages: ${rows.map((r) => r.slug).join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
