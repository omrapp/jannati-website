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
    body_en: `Jannati is a beauty and personal-care destination built for the Gulf, carrying skincare, makeup, fragrance, and haircare brands shoppers already trust, alongside a curated selection of new discoveries.

We ship across the GCC and price everything in your local currency, so what you see at checkout is what you pay — no surprise conversions, no guessing.

Every product on Jannati is sourced through authorized channels. We don't sell grey-market stock, and we stand behind everything we carry.

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
We accept major cards, and in supported countries, cash on delivery. Available options are shown at checkout.

How do I know if an item is authentic?
Everything we sell is sourced through authorized channels. We don't carry grey-market or counterfeit stock.

Can I change or cancel my order?
Contact us as soon as possible after placing your order. Once it's shipped, we can no longer change it.

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

We ship to Oman, Saudi Arabia, United Arab Emirates, Kuwait, Qatar, Bahrain, and internationally to the United States, United Kingdom, Switzerland, Norway, Denmark, Ireland, Sweden, Netherlands, Austria, Germany, Belgium, Finland, France, Italy, Spain, Iceland, Poland, and Romania.

Shipping costs

Costs vary by the total weight and volume of your order:

Oman — 1-4 business days, 2.000 OMR, via Dalilee.
United Arab Emirates — 4-7 business days, 3.500 OMR for the first 5kg, via Dalilee.
Saudi Arabia, Kuwait, Qatar, Bahrain — 4-7 business days, 7.100 OMR for the first 1.5kg, via Aramex.
United States — 4-7 business days, 12.000 OMR for the first 1.5kg, via DHL Express.
United Kingdom and other countries — 4-7 business days, 11.030 OMR for the first 2kg, via DHL Express.

Delivery times are estimates; minor delays can happen, especially in remote areas — check your tracking details for the latest status. Customs fees or taxes may apply on delivery outside the GCC, as set by your country's regulations.`,
    body_ar: `التغطية

نشحن إلى سلطنة عُمان، السعودية، الإمارات، الكويت، قطر، البحرين، وكذلك دوليًا إلى الولايات المتحدة الأمريكية والمملكة المتحدة وسويسرا والنرويج والدنمارك وأيرلندا والسويد وهولندا والنمسا وألمانيا وبلجيكا وفنلندا وفرنسا وإيطاليا وإسبانيا وآيسلندا وبولندا ورومانيا.

رسوم الشحن

تختلف تكلفة الشحن حسب الوزن الإجمالي وحجم الطلب:

سلطنة عُمان — 1 إلى 4 أيام عمل، 2.000 ر.ع، عبر Dalilee.
الإمارات — 4 إلى 7 أيام عمل، 3.500 ر.ع لأول 5 كيلو، عبر Dalilee.
السعودية، الكويت، قطر، البحرين — 4 إلى 7 أيام عمل، 7.100 ر.ع لأول 1.5 كيلو، عبر Aramex.
الولايات المتحدة الأمريكية — 4 إلى 7 أيام عمل، 12.000 ر.ع لأول 1.5 كيلو، عبر DHL Express.
المملكة المتحدة وباقي الدول — 4 إلى 7 أيام عمل، 11.030 ر.ع لأول 2 كيلو، عبر DHL Express.

مدة الشحن تقديرية وقد يحدث بعض التأخير الطفيف خاصة في المناطق النائية — يرجى مراجعة معلومات التتبع لمعرفة آخر حالة لشحنتك. قد تُفرض رسوم جمركية أو ضريبة عند التسليم خارج دول مجلس التعاون الخليجي حسب قوانين بلدك.`,
  },
  {
    slug: 'returns',
    title_en: 'Returns & Refunds',
    title_ar: 'الإرجاع والاسترداد',
    body_en: `Return or exchange window

You can request a return or exchange within 15 days of delivery if the item arrives damaged or defective, you receive the wrong item, or there's a manufacturing fault.

How to start a return

Contact us as soon as possible with your name, mobile number, order number, whether you want a return or exchange, the item(s) involved, and a short note on the reason.

Condition required

Items must be unused, unopened, and in their original condition to be accepted. Returns outside the 15-day window or with tampered packaging won't be accepted. Perishable items can't be returned.

Exchanges

If the item you want to exchange is out of stock, we'll contact you to choose a replacement or process a refund instead.

Return shipping

Return shipping costs are the customer's responsibility and aren't refundable — they'll be deducted from your refund, unless the item delivered doesn't match your order, in which case no shipping fee applies.

Refunds

Once we receive and inspect a returned item, we'll confirm whether it qualifies for a refund. Approved refunds are processed automatically to your original payment method.`,
    body_ar: `مدة الاسترجاع أو الاستبدال

يمكنك طلب استرجاع أو استبدال خلال 15 يومًا من الاستلام إذا وصلت البضاعة تالفة أو معيبة، أو استلمت شحنة خاطئة، أو كان هناك عيب مصنعي.

كيفية بدء عملية الإرجاع

تواصل معنا في أقرب وقت ممكن مع ذكر اسمك، رقم الموبايل، رقم الطلب، ما إذا كنت تريد استرجاعًا أو استبدالًا، المنتج(ات) المعنية، وسبب الطلب باختصار.

الحالة المطلوبة

يجب أن تبقى المنتجات غير مستخدمة وغير مفتوحة وفي حالتها الأصلية ليتم قبولها. لا تُقبل طلبات الإرجاع بعد مرور 15 يومًا أو إذا كانت العبوة تالفة. لا يمكن استرجاع المنتجات القابلة للتلف السريع.

الاستبدال

إذا لم يعد المنتج المطلوب للاستبدال متوفرًا لدينا، سنتواصل معك لاختيار بديل أو استرداد المبلغ بدلاً من ذلك.

تكاليف الشحن

تكاليف شحن الإرجاع على عاتق العميل وغير قابلة للاسترداد — تُخصم من المبلغ المسترد، إلا إذا كان المنتج المسلّم لا يطابق طلبك، وحينها لا تُفرض أي رسوم شحن.

الاسترداد

بعد استلام المنتج المرتجع وفحصه، سنؤكد لك ما إذا كان مؤهلاً للاسترداد. تتم معالجة المبالغ المستردة المعتمدة تلقائيًا إلى وسيلة الدفع الأصلية.`,
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
    body_en: `OVERVIEW

This website is operated by "Jannati", operated by {{legal_entity_name}}, holding commercial registration No. ({{registration_number}}). Throughout the site, the terms "we", "us" and "our" refer to Jannati. Jannati offers this website, including all information, tools and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies and notices stated here.

By visiting our site and/or purchasing something from us, you engage in our "Service" and agree to be bound by the following terms and conditions ("Terms of Service", "Terms"), including those additional terms and conditions and policies referenced herein and/or available by hyperlink. These Terms of Service apply to all users of the site, including without limitation users who are browsers, vendors, customers, and contributors of content.

Please read these Terms of Service carefully before accessing or using our website. By accessing or using any part of the site, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions of this agreement, then you may not access the website or use any services.

Any new features or tools added to the store are also subject to these Terms of Service. We reserve the right to update, change or replace any part of these Terms of Service by posting updates to our website. Your continued use of the website following any changes constitutes acceptance of those changes.

SECTION 1 - ONLINE STORE TERMS

By agreeing to these Terms of Service, you represent that you are at least the age of majority in your jurisdiction of residence, or that you have your parent or guardian's consent to use this site.

You may not use our products for any illegal or unauthorized purpose, nor may you, in using the Service, violate any laws in your jurisdiction (including but not limited to copyright laws). You must not transmit any worms, viruses, or any code of a destructive nature. A breach of any of these Terms will result in immediate termination of your access to the Service.

SECTION 2 - GENERAL CONDITIONS

We reserve the right to refuse service to anyone for any reason at any time.

You understand that your content (not including payment information) may be transferred unencrypted and involve transmissions over various networks. Payment information is always encrypted during transfer.

You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service without our express written permission.

SECTION 3 - ACCURACY, COMPLETENESS AND TIMELINESS OF INFORMATION

We are not responsible if information on this site is not accurate, complete, or current. Material on this site is provided for general information only and should not be relied upon as the sole basis for making decisions. Any reliance on material on this site is at your own risk.

SECTION 4 - MODIFICATIONS TO THE SERVICE AND PRICES

Prices for our products are subject to change without notice. We reserve the right to modify or discontinue the Service at any time without notice, and shall not be liable to you or any third party for any such modification, price change, suspension, or discontinuance.

SECTION 5 - PRODUCTS OR SERVICES

Certain products may be available exclusively online and may have limited quantities, subject to return or exchange only according to our Returns policy. We've made every effort to display product colors and images as accurately as possible, but cannot guarantee your device's display will be fully accurate. We reserve the right to limit sales of any product or Service to any person, region, or jurisdiction, and to discontinue any product at any time.

SECTION 6 - ACCURACY OF BILLING AND ACCOUNT INFORMATION

We reserve the right to refuse or cancel any order, including orders that appear to be placed by dealers, resellers, or distributors. You agree to provide current, complete, and accurate purchase and account information, and to promptly update it — including your email address and payment details — so we can complete your transactions and contact you as needed. See our Returns policy for more detail.

SECTION 7 - OPTIONAL TOOLS

We may give you access to third-party tools we neither monitor nor control. Such tools are provided "as is" without warranties of any kind, and any use of them is at your own risk. We may also offer new features or services through the website in the future, which are also subject to these Terms.

SECTION 8 - THIRD-PARTY LINKS

Certain content and services available through our Service may include materials from third parties, and third-party links on this site may lead to websites not affiliated with us. We are not responsible for the content, accuracy, or practices of third-party websites — please review their own terms carefully before engaging in any transaction with them.

SECTION 9 - USER COMMENTS, FEEDBACK AND OTHER SUBMISSIONS

If you send us comments, suggestions, or other submissions, you agree that we may edit, copy, publish, distribute, translate, and otherwise use them in any medium without restriction, with no obligation to keep them confidential, compensate you, or respond. You agree your submissions won't violate any third party's rights or contain unlawful, abusive, or obscene material. You are solely responsible for the accuracy of anything you submit.

SECTION 10 - PERSONAL INFORMATION

Your submission of personal information through the store is governed by our Privacy Policy.

SECTION 11 - ERRORS, INACCURACIES AND OMISSIONS

Our site may occasionally contain typographical errors, inaccuracies, or omissions related to product descriptions, pricing, promotions, shipping charges, and availability. We reserve the right to correct any such errors and to update or cancel orders if information is inaccurate, without prior notice, even after an order has been submitted.

SECTION 12 - PROHIBITED USES

In addition to other prohibitions in these Terms, you may not use the site or its content: for any unlawful purpose; to solicit others to perform unlawful acts; to violate any applicable regulations or laws; to infringe our intellectual property or that of others; to harass, abuse, or discriminate against anyone; to submit false or misleading information; to upload viruses or malicious code; to collect or track others' personal information; to spam, phish, or scrape; for any obscene purpose; or to interfere with the security of the Service. We reserve the right to terminate your access for violating any prohibited use.

SECTION 13 - DISCLAIMER OF WARRANTIES; LIMITATION OF LIABILITY

We do not guarantee that your use of the Service will be uninterrupted, timely, secure, or error-free, or that any results obtained through it will be accurate or reliable. The Service and all products delivered through it are provided "as is" and "as available", without warranties of any kind, express or implied. To the fullest extent permitted by law, Jannati, its officers, employees, affiliates, and suppliers will not be liable for any indirect, incidental, punitive, or consequential damages arising from your use of the Service.

SECTION 14 - INDEMNIFICATION

You agree to indemnify and hold harmless Jannati and our affiliates, officers, directors, agents, and employees from any claim or demand, including reasonable legal fees, arising from your breach of these Terms or violation of any law or third-party right.

SECTION 15 - SEVERABILITY

If any provision of these Terms is found unlawful, void, or unenforceable, that provision will be enforced to the fullest extent permitted by law, and the unenforceable portion severed, without affecting the validity of the remaining provisions.

SECTION 16 - TERMINATION

These Terms remain effective unless terminated by either you or us. You may terminate at any time by ceasing to use our site. We may terminate or suspend your access at any time, without notice, if we believe you've failed to comply with any term of these Terms — you'll remain liable for all amounts due up to the date of termination.

SECTION 17 - ENTIRE AGREEMENT

Our failure to enforce any right or provision of these Terms does not waive that right or provision. These Terms, together with our policies posted on this site, constitute the entire agreement between you and us regarding use of the Service, superseding any prior agreements or communications.

SECTION 18 - GOVERNING LAW

These Terms shall be governed by and construed in accordance with the laws of Oman.

SECTION 19 - CHANGES TO TERMS OF SERVICE

We may update these Terms of Service at any time by posting changes to our website. Your continued use of the site after changes take effect means you accept the updated Terms.

SECTION 20 - CONTACT INFORMATION

Questions about these Terms of Service can be sent through our Contact page.`,
    body_ar: `نظرة عامة

يتم تشغيل هذا الموقع من قبل "جنتي"، وتديره {{legal_entity_name}} الحاملة لسجل تجاري رقم ({{registration_number}}). في جميع أنحاء الموقع، تشير مصطلحات "نحن" و"لنا" و"موقعنا" إلى جنتي. تقدم جنتي هذا الموقع بما في ذلك جميع المعلومات والأدوات والخدمات المتاحة عليه لك، بشرط موافقتك على جميع الشروط والأحكام والسياسات والإشعارات الواردة هنا.

بزيارتك موقعنا و/أو شرائك أي شيء منا، فإنك تشارك في "خدمتنا" وتوافق على الالتزام بالشروط والأحكام التالية ("شروط الخدمة")، بما في ذلك أي شروط أو سياسات إضافية مشار إليها هنا أو متاحة عبر رابط. تنطبق شروط الخدمة هذه على جميع مستخدمي الموقع، بمن فيهم المتصفحون والموردون والعملاء والمساهمون بالمحتوى.

يُرجى قراءة شروط الخدمة هذه بعناية قبل الوصول إلى موقعنا أو استخدامه. باستخدامك أي جزء من الموقع، فإنك توافق على الالتزام بهذه الشروط. إذا لم توافق على جميع الشروط والأحكام، فلا يجوز لك الوصول إلى الموقع أو استخدام أي من خدماته.

تخضع أي ميزات أو أدوات جديدة تُضاف إلى المتجر لشروط الخدمة هذه أيضًا. نحتفظ بالحق في تحديث أو تغيير أو استبدال أي جزء من هذه الشروط بنشر التحديثات على موقعنا. استمرارك في استخدام الموقع بعد نشر أي تغييرات يعني موافقتك عليها.

القسم 1 - شروط المتجر الإلكتروني

بموافقتك على شروط الخدمة هذه، فإنك تقر بأنك بلغت سن الرشد القانوني في بلد إقامتك، أو أن لديك موافقة ولي أمرك على استخدام هذا الموقع.

لا يجوز لك استخدام منتجاتنا لأي غرض غير قانوني أو غير مصرح به، ولا يجوز لك في استخدامك للخدمة انتهاك أي قوانين في بلدك (بما في ذلك على سبيل المثال لا الحصر قوانين حقوق النشر). يجب ألا تنقل أي فيروسات أو أي شفرة ذات طبيعة تخريبية. أي مخالفة لهذه الشروط ستؤدي إلى إنهاء فوري لوصولك إلى الخدمة.

القسم 2 - الشروط العامة

نحتفظ بالحق في رفض تقديم الخدمة لأي شخص لأي سبب وفي أي وقت.

تدرك أن محتواك (باستثناء بيانات الدفع) قد يُنقل دون تشفير عبر شبكات مختلفة. تُشفَّر بيانات الدفع دائمًا أثناء النقل.

توافق على عدم إعادة إنتاج أو نسخ أو بيع أو استغلال أي جزء من الخدمة دون إذن كتابي صريح منا.

القسم 3 - دقة المعلومات واكتمالها وحداثتها

نحن غير مسؤولين إذا كانت المعلومات المتاحة على هذا الموقع غير دقيقة أو غير كاملة أو غير محدّثة. المواد المعروضة هنا لأغراض عامة فقط ولا ينبغي الاعتماد عليها وحدها لاتخاذ القرارات. أي اعتماد على هذه المواد يكون على مسؤوليتك الخاصة.

القسم 4 - التعديلات على الخدمة والأسعار

أسعار منتجاتنا قابلة للتغيير دون إشعار مسبق. نحتفظ بالحق في تعديل أو إيقاف الخدمة في أي وقت دون إشعار، ولن نكون مسؤولين تجاهك أو تجاه أي طرف ثالث عن أي تعديل أو تغيير في الأسعار أو تعليق أو إيقاف للخدمة.

القسم 5 - المنتجات أو الخدمات

قد تتوفر بعض المنتجات حصريًا عبر الإنترنت وبكميات محدودة، وتخضع للإرجاع أو الاستبدال وفقًا لسياسة الإرجاع لدينا فقط. نبذل قصارى جهدنا لعرض ألوان وصور المنتجات بأكبر قدر ممكن من الدقة، لكننا لا نضمن دقة عرضها على جهازك بشكل كامل. نحتفظ بالحق في تحديد مبيعات أي منتج أو خدمة لأي شخص أو منطقة، وفي إيقاف أي منتج في أي وقت.

القسم 6 - دقة بيانات الفوترة والحساب

نحتفظ بالحق في رفض أو إلغاء أي طلب، بما في ذلك الطلبات التي يبدو أنها مقدَّمة من موزعين أو معيدي بيع. توافق على تقديم معلومات شراء وحساب حديثة وكاملة ودقيقة، وعلى تحديثها فور تغيّرها — بما في ذلك بريدك الإلكتروني وبيانات الدفع — لنتمكن من إتمام معاملاتك والتواصل معك عند الحاجة. راجع سياسة الإرجاع لمزيد من التفاصيل.

القسم 7 - الأدوات الاختيارية

قد نمنحك إمكانية الوصول إلى أدوات تابعة لجهات خارجية لا نراقبها ولا نتحكم بها. تُقدَّم هذه الأدوات "كما هي" دون أي ضمانات، وأي استخدام لها يكون على مسؤوليتك الخاصة. قد نقدّم أيضًا ميزات أو خدمات جديدة عبر الموقع مستقبلاً، وتخضع هي الأخرى لهذه الشروط.

القسم 8 - روابط الجهات الخارجية

قد يتضمن بعض المحتوى أو الخدمات المتاحة عبر خدمتنا موادًا من جهات خارجية، وقد تقودك الروابط الخارجية على هذا الموقع إلى مواقع غير تابعة لنا. نحن غير مسؤولين عن محتوى أو دقة أو ممارسات مواقع الجهات الخارجية — يُرجى مراجعة شروطها الخاصة بعناية قبل إجراء أي معاملة معها.

القسم 9 - تعليقات المستخدمين وملاحظاتهم وطلباتهم الأخرى

إذا أرسلت لنا تعليقات أو اقتراحات أو أي مواد أخرى، فإنك توافق على أنه يجوز لنا تعديلها أو نسخها أو نشرها أو توزيعها أو ترجمتها واستخدامها بأي وسيلة دون قيود، دون التزام بالحفاظ على سريتها أو تعويضك أو الرد عليها. توافق على أن مساهماتك لن تنتهك حقوق أي طرف ثالث ولن تحتوي على مواد غير قانونية أو مسيئة. أنت المسؤول الوحيد عن دقة أي محتوى ترسله.

القسم 10 - المعلومات الشخصية

يخضع تقديمك للمعلومات الشخصية عبر المتجر لسياسة الخصوصية الخاصة بنا.

القسم 11 - الأخطاء والمعلومات غير الدقيقة أو الناقصة

قد يحتوي موقعنا أحيانًا على أخطاء مطبعية أو معلومات غير دقيقة أو ناقصة تتعلق بأوصاف المنتجات أو الأسعار أو العروض أو رسوم الشحن أو التوفر. نحتفظ بالحق في تصحيح أي من هذه الأخطاء وتحديث أو إلغاء الطلبات إذا كانت المعلومات غير دقيقة، دون إشعار مسبق، حتى بعد تقديم الطلب.

القسم 12 - الاستخدامات المحظورة

بالإضافة إلى المحظورات الأخرى الواردة في هذه الشروط، لا يجوز لك استخدام الموقع أو محتواه: لأي غرض غير قانوني؛ لحث آخرين على القيام بأعمال غير قانونية؛ لمخالفة أي أنظمة أو قوانين معمول بها؛ لانتهاك حقوق الملكية الفكرية الخاصة بنا أو بغيرنا؛ للتحرش بالآخرين أو الإساءة إليهم أو التمييز ضدهم؛ لتقديم معلومات كاذبة أو مضللة؛ لرفع فيروسات أو أكواد ضارة؛ لجمع أو تتبع بيانات الآخرين الشخصية؛ للرسائل المزعجة أو التصيّد أو الاستخراج الآلي للبيانات؛ لأي غرض فاحش؛ أو للتدخل في أمن الخدمة. نحتفظ بالحق في إنهاء وصولك عند مخالفة أي من هذه الاستخدامات المحظورة.

القسم 13 - إخلاء المسؤولية عن الضمانات وتحديد المسؤولية

لا نضمن أن استخدامك للخدمة سيكون متواصلاً أو آمنًا أو خاليًا من الأخطاء، أو أن أي نتائج تُستمد منها ستكون دقيقة أو موثوقة. تُقدَّم الخدمة وجميع المنتجات المسلَّمة عبرها "كما هي" و"حسب توفرها"، دون أي ضمانات من أي نوع. إلى أقصى حد يسمح به القانون، لن تكون جنتي أو موظفوها أو الشركات التابعة لها أو مورّدوها مسؤولين عن أي أضرار غير مباشرة أو عرضية أو تبعية ناتجة عن استخدامك للخدمة.

القسم 14 - التعويض

توافق على تعويض جنتي والشركات التابعة لها ومسؤوليها ووكلائها وموظفيها عن أي مطالبة أو دعوى، بما في ذلك أتعاب المحاماة المعقولة، ناشئة عن مخالفتك لهذه الشروط أو انتهاكك لأي قانون أو حق لطرف ثالث.

القسم 15 - قابلية الفصل

إذا تبيّن أن أي بند من هذه الشروط غير قانوني أو باطل أو غير قابل للتنفيذ، يُطبَّق ذلك البند إلى أقصى حد يسمح به القانون، ويُفصل الجزء غير القابل للتنفيذ دون أن يؤثر ذلك على صحة باقي البنود.

القسم 16 - الإنهاء

تظل هذه الشروط سارية ما لم تُنهَ من قبلك أو من قبلنا. يمكنك إنهاءها في أي وقت بالتوقف عن استخدام موقعنا. يجوز لنا إنهاء أو تعليق وصولك في أي وقت، دون إشعار، إذا رأينا أنك لم تلتزم بأي بند من هذه الشروط — وستبقى مسؤولاً عن جميع المبالغ المستحقة حتى تاريخ الإنهاء.

القسم 17 - الاتفاقية الكاملة

عدم قيامنا بفرض أي حق أو بند من هذه الشروط لا يعني تنازلنا عنه. تشكّل هذه الشروط، مع السياسات المنشورة على هذا الموقع، الاتفاقية الكاملة بينك وبيننا بشأن استخدام الخدمة، وتحل محل أي اتفاقيات أو مراسلات سابقة.

القسم 18 - القانون الحاكم

تخضع هذه الشروط وتُفسَّر وفقًا لقوانين سلطنة عُمان.

القسم 19 - التغييرات على شروط الخدمة

قد نُحدّث شروط الخدمة هذه في أي وقت بنشر التغييرات على موقعنا. استمرارك في استخدام الموقع بعد سريان التغييرات يعني موافقتك على الشروط المحدّثة.

القسم 20 - معلومات التواصل

يمكن إرسال أي استفسارات حول شروط الخدمة هذه عبر صفحة تواصل معنا.`,
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
