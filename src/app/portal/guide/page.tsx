/**
 * Partner Guide — in-depth onboarding tutorial + reference for the portal.
 * Bilingual, chaptered, written for a first-time user who may never have
 * used a reporting platform before. Static content, no data required.
 */

import Link from 'next/link';
import { TIER_LADDER, NTR_FACTS } from '@/facts';
import { getPortalLang, t } from '@/lib/portal-lang';

export const dynamic = 'force-dynamic';

function Chapter({
  no, en, ar, children,
}: { no: string; en: string; ar: string; children: React.ReactNode }) {
  return (
    <section id={`ch-${no}`} className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="section-rule" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight text-brand-800">
            <span className="mx-2 font-mono text-sm text-gold-600">{no}</span>
            {en}
          </h2>
          <div className="text-brand-700">{ar}</div>
        </div>
      </div>
      <div className="space-y-4 text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function Step({ n, en, ar }: { n: number; en: React.ReactNode; ar?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
        {n}
      </div>
      <div>
        <div>{en}</div>
        {ar && <div className="text-sm text-brand-700">{ar}</div>}
      </div>
    </div>
  );
}

function Callout({ tone = 'info', children }: { tone?: 'info' | 'gold' | 'warn'; children: React.ReactNode }) {
  const styles = {
    info: 'border-brand-200 bg-brand-50 text-brand-800',
    gold: 'border-gold-300 bg-gold-50 text-gold-700',
    warn: 'border-amber-300 bg-amber-50 text-amber-800',
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>{children}</div>;
}

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-brand-600 underline underline-offset-2">{children}</Link>
);

const TIER_UNLOCKS_AR: Record<string, string> = {
  REGISTERED: 'الإدراج في السجل، نورة، طلبات الجمع، الدليل',
  ACTIVE: 'ختم العضوية، مقارنات الإمارة، السوق، شهادة تحويل كل ربع',
  CERTIFIED: 'علامة الاعتماد، بيان تحويل موثّق للاستدامة، أهلية الحوافز، أولوية التعريف بالمستقبلين',
  ELITE: 'تكريم سنوي، ملف وطني مميز، مقعد استشاري، أولوية البرامج التجريبية',
};
const TIER_EARNED_AR: Record<string, string> = {
  REGISTERED: 'هوية موثّقة وملف أساسي',
  ACTIVE: 'تقريران ربعيان معتمدان متتاليان',
  CERTIFIED: 'أربعة أرباع من التقارير وتدقيق سلسلة الحيازة',
  ELITE: 'تميّز مستدام ومساهمة في الأهداف الوطنية',
};

export default async function PartnerGuidePage() {
  const lang = await getPortalLang();
  const ar = lang === 'ar';
  const year = new Date().getUTCFullYear();
  const streams = NTR_FACTS.taxonomy.wasteStreams;

  const chapters: Array<[string, string]> = [
    ['01', t(lang, 'Start here', 'ابدأوا هنا')], ['02', t(lang, 'First 10 minutes', 'أول عشر دقائق')],
    ['03', t(lang, 'Noura', 'نورة')], ['04', t(lang, 'How a load moves', 'كيف تتحرك الحمولة')],
    ['05', t(lang, 'Quarterly report', 'التقرير الربعي')], ['06', t(lang, 'Membership ladder', 'سلّم العضوية')],
    ['07', t(lang, 'Pickups', 'طلبات الجمع')], ['08', t(lang, 'Marketplace', 'السوق')],
    ['09', t(lang, 'Sustainability', 'الاستدامة')], ['10', t(lang, 'FAQ', 'أسئلة شائعة')],
  ];

  const faq: Array<[string, string]> = ar
    ? [
        ['من يرى أرقامي؟', 'فريق الشبكة فقط. الشركاء الآخرون لا يرون بياناتكم أبدًا. مقارنات الإمارة تجميعية من ثلاثة شركاء على الأقل، والأرقام الفردية لا تُكشف. هذه قاعدة صارمة في المنصة.'],
        ['أخطأت في تقرير مرسل', 'أخبروا نورة. إن كان التقرير لا يزال قيد المراجعة تصحّحه مباشرة، وإن كان معتمدًا توجّه تصحيحًا إلى فريق الشبكة.'],
        ['هل أستطيع استخدام المنصة بالعربية فقط؟', 'نعم. أخبروا نورة مرة واحدة وستتذكر وتتحدث بالعربية أولًا دائمًا.'],
        ['فاتني ربع. هل هناك مشكلة؟', 'لا. تظهر مكانتكم «معرّضة للخطر» لتعرفوا، وإكمال السجل مع نورة، حتى متأخرًا، يعيدها. الشبكة لا تعاقب، بل تدعوكم للعودة.'],
        ['حمولة لم أستطع تحويلها وذهبت إلى المكب. هل أسجّلها؟', 'نعم، دائمًا. سجّلوها مع سببها (سجاد بظهر PVC، تلوث شديد، لا مستقبل ضمن المسافة). رقم التحويل لا يكون موثوقًا إلا إذا حُسبت الحمولات غير المحوَّلة أيضًا. لا تُخصم نقاط على الصدق.'],
        ['لمن أرفع ما لا تحله نورة؟', 'استخدموا «صوتكم» لإرسال طلب أو شكوى مباشرة إلى فريق الشبكة. كل مدخل يُقرأ ويُتابع.'],
      ]
    : [
        ['Who sees my numbers?', 'Only the network team. Other partners never see your data. Emirate benchmarks are aggregates of at least three partners; individual figures are never exposed. This is a hard rule of the platform.'],
        ['I made a mistake in a submitted report.', 'Tell Noura. If the report is still in review she corrects it directly; if it was already approved she routes a correction to the network team.'],
        ['Can I use the platform only in Arabic?', 'Yes. Tell Noura once and she will remember and speak Arabic first, always.'],
        ['I missed a quarter. Am I in trouble?', 'No. Your standing shows At-risk so you know, and completing the record with Noura, even late, restores it. The network never penalises; it invites you back.'],
        ['A load I could not divert went to landfill. Do I log it?', 'Yes, always. Log it with its reason (PVC-backed carpet, heavy contamination, no offtaker within range). The diversion number is only credible if the non-diverted loads are counted too. Honesty is never penalised.'],
        ['Who do I contact for something Noura cannot solve?', 'Use Your Voice to send a request or complaint directly to network staff. Every entry is read and tracked.'],
      ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-card-hover sm:p-8"
        style={{ background: 'linear-gradient(135deg, #141C30, #1F2A44 60%, #3A3F8F)' }}
      >
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">
            {t(lang, 'Partner Guide · دليل الشريك', 'دليل الشريك · Partner Guide')}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t(lang, 'Everything you need to use Naseej', 'كل ما تحتاجونه لاستخدام نسيج')}
          </h1>
          <div className="mt-1 text-lg text-white/85">
            {t(lang, 'Step by step, in your language', 'خطوة بخطوة، وبلغتكم')}
          </div>
          <p className="mt-3 max-w-2xl text-sm text-white/75">
            {t(
              lang,
              'Ten short chapters. Read the first four and you are ready; the rest is reference for whenever you need it. And remember: you can always just ask Noura.',
              'عشرة فصول قصيرة. اقرأوا الأربعة الأولى وأنتم جاهزون، والباقي مرجع متى احتجتموه. وتذكّروا: يمكنكم دائمًا سؤال نورة.',
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {chapters.map(([n, title]) => (
              <a key={n} href={`#ch-${n}`} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-white/90 transition hover:bg-white/20">
                {n} · {title}
              </a>
            ))}
          </div>
        </div>
      </section>

      <Chapter no="01" en={t(lang, 'What this platform is', 'ما هي هذه المنصة')} ar={t(lang, 'ما هي هذه المنصة', 'What this platform is')}>
        <p>
          {t(
            lang,
            'The Naseej Textile Recovery Platform gives textile recovery in the UAE one register and one ledger. Every participant enrols once. Every load is logged at removal, graded before it moves, routed to the offtaker who can use it, and counted whatever its fate. Your membership, your diversion reports, your certificates and your benefits all live here, in your language.',
            'منصة نسيج لاستعادة المنسوجات تمنح استعادة المنسوجات في الإمارات سجلًا واحدًا ودفترًا واحدًا. كل مشارك ينضم مرة واحدة. كل حمولة تُسجَّل عند الإزالة، وتُصنَّف قبل أن تتحرك، وتُوجَّه إلى المستقبل القادر على استخدامها، وتُحتسب أيًا كان مآلها. عضويتكم وتقارير التحويل والشهادات والمزايا كلها هنا، وبلغتكم.',
          )}
        </p>
        <p>
          {t(
            lang,
            'The platform is an independent partner network operated by Nuraiya. It is aligned with the UAE’s net-zero and landfill-diversion goals. It does not represent any government body, and its certification is the network’s own recognition.',
            'المنصة شبكة شركاء مستقلة تشغّلها نورايا. تتماشى مع أهداف الإمارات للحياد المناخي والتحويل عن المكب. لا تمثل أي جهة حكومية، واعتمادها هو تقدير الشبكة نفسها.',
          )}
        </p>
        <Callout tone="gold">
          <b>{t(lang, 'The one rule that matters: ', 'القاعدة الوحيدة المهمة: ')}</b>
          {t(
            lang,
            'the more complete your quarterly diversion reporting, the higher your standing, and the more the network can do for you. Reporting is how you climb.',
            'كلما اكتمل تقرير التحويل الربعي ارتفعت مكانتكم وزاد ما تستطيع الشبكة فعله لكم. التقارير هي طريق الصعود.',
          )}
        </Callout>
      </Chapter>

      <Chapter no="02" en={t(lang, 'Your first 10 minutes', 'أول عشر دقائق')} ar={t(lang, 'أول عشر دقائق', 'Your first 10 minutes')}>
        <Step n={1} en={ar
          ? <>افتحوا <A href="/portal/profile">الملف</A> وراجعوا ما تعرفه الشبكة عن منشأتكم: الغرف أو المواقع أو المساحة المفروشة أو الطاقة، أنواع المواد، جهة الاتصال. أكملوا الناقص، وعداد الاكتمال يدلكم.</>
          : <>Open <A href="/portal/profile">Profile</A> and check what the network knows about your organisation: rooms, sites, floor area or capacity, material types, contact. Fill anything missing. The completeness meter shows you how far along you are.</>} />
        <Step n={2} en={ar
          ? <>اضغطوا زر <b>نورة</b> (في زاوية كل شاشة) وسلّموا عليها. تعرف رقم سجلكم وتاريخكم مسبقًا. جرّبوا سؤالها عن أي شيء يخص عضويتكم.</>
          : <>Tap the <b>Noura</b> button (corner of every screen) and say hello. She already knows your registry number and history. Try asking her anything about your membership.</>} />
        <Step n={3} en={ar
          ? <>انظروا إلى <A href="/portal">الصفحة الرئيسية</A>: بطاقة العضوية تريكم موقعكم وكم بقي من الأرباع المعتمدة للمستوى التالي.</>
          : <>Look at your <A href="/portal">home screen</A>: your tier card shows where you stand and exactly how many approved quarters remain to the next level.</>} />
        <Callout>
          {t(lang, 'Nothing here requires training. If you are ever unsure what to do next, the answer is always the same: ', 'لا شيء هنا يحتاج تدريبًا. إذا احترتم في الخطوة التالية فالجواب واحد دائمًا: ')}
          <b>{t(lang, 'ask Noura', 'اسألوا نورة')}</b>.
        </Callout>
      </Chapter>

      <Chapter no="03" en={t(lang, 'Meet Noura, your one door to the network', 'نورة، بابكم الواحد إلى الشبكة')} ar={t(lang, 'نورة، بابكم الواحد إلى الشبكة', 'Meet Noura, your one door to the network')}>
        <p>
          {t(
            lang,
            'Noura is the network director. She is not a form and not a call centre. She remembers every conversation. Talk to her the way you would talk to a trusted colleague, in Arabic or English, formally or casually.',
            'نورة هي مديرة الشبكة. ليست نموذجًا ولا مركز اتصال. تتذكر كل محادثة. تحدثوا معها كما تتحدثون مع زميل موثوق، بالعربية أو الإنجليزية، رسميًا أو ودّيًا.',
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-mist p-4">
            <div className="mb-2 text-sm font-semibold text-brand-800">{t(lang, 'Noura can:', 'نورة تستطيع:')}</div>
            <ul className="list-disc space-y-1 ps-5 text-sm">
              <li>{t(lang, 'Log a load the moment it leaves your site and open a pickup request', 'تسجيل الحمولة لحظة مغادرتها موقعكم وفتح طلب جمع')}</li>
              <li>{t(lang, 'Complete your entire quarterly diversion report with you in chat', 'إكمال تقرير التحويل الربعي كاملًا معكم في المحادثة')}</li>
              <li>{t(lang, 'Read an Excel file in any layout, even messy ones', 'قراءة ملف إكسل بأي تنسيق، حتى الفوضوي منه')}</li>
              <li>{t(lang, 'Read photos of weighbridge tickets, manifests and handwritten notes', 'قراءة صور تذاكر الميزان وبيانات النفايات والملاحظات اليدوية')}</li>
              <li>{t(lang, 'Convert bales, rolls or m² into tonnes using placeholder priors, then confirm with you', 'تحويل البالات أو اللفائف أو المساحة إلى أطنان بقيم استرشادية ثم التأكيد معكم')}</li>
              <li>{t(lang, 'Tell you your emirate benchmark after every submission', 'إخباركم بمقارنة إمارتكم بعد كل إرسال')}</li>
              <li>{t(lang, 'Update your profile so you are never asked twice', 'تحديث ملفكم حتى لا تُسألوا مرتين')}</li>
            </ul>
          </div>
          <div className="rounded-xl bg-mist p-4">
            <div className="mb-2 text-sm font-semibold text-brand-800">{t(lang, 'Noura will never:', 'نورة لن تفعل أبدًا:')}</div>
            <ul className="list-disc space-y-1 ps-5 text-sm">
              <li>{t(lang, 'Promise a tier change or certification. Those are approved by network officials only', 'الوعد بتغيير مستوى أو اعتماد. تلك يعتمدها مسؤولو الشبكة فقط')}</li>
              <li>{t(lang, 'Show you another partner’s data. Benchmarks are always aggregates', 'إظهار بيانات شريك آخر. المقارنات تجميعية دائمًا')}</li>
              <li>{t(lang, 'Favour any recycler or buyer. Routing follows grade, acceptance spec, distance and capacity', 'تفضيل أي معيد تدوير أو مشترٍ. التوجيه يتبع الدرجة ومواصفات القبول والمسافة والطاقة')}</li>
              <li>{t(lang, 'Scold you for a late quarter. There is always an easy path back', 'لومكم على ربع متأخر. هناك دائمًا طريق سهل للعودة')}</li>
            </ul>
          </div>
        </div>
        <Callout tone="gold">
          {t(lang, 'Good first messages to try: ', 'رسائل أولى جيدة للتجربة: ')}
          <i>&quot;عندنا 300 متر سجاد طالع من الطابق الرابع، وش نسوي؟&quot;</i> ·
          <i> &quot;How do I reach the next tier?&quot;</i> ·
          <i> &quot;وش وضع تقريري لهذا الربع؟&quot;</i>
        </Callout>
      </Chapter>

      <Chapter no="04" en={t(lang, 'How a load moves through Naseej', 'كيف تتحرك الحمولة عبر نسيج')} ar={t(lang, 'كيف تتحرك الحمولة عبر نسيج', 'How a load moves through Naseej')}>
        <p>
          {t(
            lang,
            'Four steps, the same for a hotel strip-out, a charity bin or a factory roll end. The order matters: counting comes before collecting.',
            'أربع خطوات، نفسها لإزالة سجاد فندق أو صندوق جمعية خيرية أو بقايا لفائف مصنع. الترتيب مهم: الإحصاء قبل الجمع.',
          )}
        </p>
        <Step n={1} en={ar
          ? <><b>سجّلوا عند الإزالة.</b> لحظة خروج المادة من الاستخدام أخبروا نورة أو افتحوا طلب جمع: التيار، الكمية التقديرية، الموقع، تاريخ الجاهزية. أطنان أو بالات أو لفائف أو أمتار مربعة، أيها أسهل.</>
          : <><b>Log at removal.</b> The moment material comes out of use, tell Noura or post a pickup: stream, rough quantity, where, ready from. Tonnes, bales, rolls or m², whichever is easiest.</>}
          ar={ar ? undefined : 'سجّلوا عند الإزالة'} />
        <Step n={2} en={ar
          ? <><b>تُصنَّف عند الاستلام.</b> قبل أن تتحرك الحمولة تُصنَّف: التيار، نوع البوليمر أو الألياف، نوع الظهر للسجاد، الوزن، درجة التلوث (نظيف / خفيف / شديد)، الرطوبة، صورة. السجاد بظهر PVC والحمولات شديدة التلوث تُوجَّه بشكل منفصل.</>
          : <><b>Graded at intake.</b> Before it moves, the load is graded: stream, polymer or fibre type, backing type for carpet, weight, contamination (clean / light / heavy), moisture, photo. PVC-backed carpet and heavily contaminated loads are routed separately.</>}
          ar={ar ? undefined : 'تُصنَّف عند الاستلام'} />
        <Step n={3} en={ar
          ? <><b>تُوجَّه حسب الدرجة.</b> نورة تطابق الحمولة مع المستقبل القادر على استخدامها فعلًا: إعادة استخدام، تبرع، مسار بوليمر، مسار ألياف، تدوير تنازلي أو تصدير. حسب الدرجة ومواصفات القبول والمسافة والطاقة، لا حسب من يدفع للشبكة.</>
          : <><b>Routed by grade.</b> Noura matches the load to the offtaker who can actually use it: reuse, donation, polymer route, fibre route, downcycling or export. By grade, acceptance spec, distance and capacity, never by who pays the network.</>}
          ar={ar ? undefined : 'تُوجَّه حسب الدرجة'} />
        <Step n={4} en={ar
          ? <><b>كل مآل يُحتسب.</b> عند تأكيد الجمع تُسجَّل الحمولة في سلسلة الحيازة. الحمولة التي لا يمكن تثمينها تُسجَّل أيضًا وتُوجَّه إلى المكب مع سببها. رقم التحويل لا يكون موثوقًا إلا إذا حُسب غير المحوَّل أيضًا.</>
          : <><b>Every fate counted.</b> When the pickup is confirmed the load enters the chain of custody. A load that cannot be valorised is still logged and routed to landfill with its reason. The diversion number is only credible if the non-diverted loads are counted too.</>}
          ar={ar ? undefined : 'كل مآل يُحتسب'} />
        <div className="rounded-xl bg-mist p-4 text-sm">
          <div className="mb-2 font-semibold text-brand-800">{t(lang, 'The streams Noura recognises', 'التيارات التي تعرفها نورة')}</div>
          <div className="flex flex-wrap gap-2">
            {streams.map((s) => (
              <span key={s.code} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink">
                {ar ? s.ar : s.en}
              </span>
            ))}
          </div>
        </div>
      </Chapter>

      <Chapter no="05" en={t(lang, 'The quarterly diversion report, three ways to submit', 'تقرير التحويل الربعي، ثلاث طرق للإرسال')} ar={t(lang, 'تقرير التحويل الربعي، ثلاث طرق للإرسال', 'The quarterly diversion report, three ways to submit')}>
        <p>
          {t(
            lang,
            'Once a quarter, the network asks every partner what happened: how much textile you generated or received, how much left to a productive fate, and where each load went. If you logged your loads as they moved, the report is mostly already written. Choose whichever way is easiest:',
            'مرة كل ربع تسأل الشبكة كل شريك عمّا حدث: كم من المنسوجات أنتجتم أو استلمتم، كم خرج إلى مآل إنتاجي، وأين ذهبت كل حمولة. إذا سجّلتم حمولاتكم أثناء تحركها فالتقرير مكتوب في معظمه. اختاروا الأسهل لكم:',
          )}
        </p>
        <Step n={1} en={ar
          ? <><b>المحادثة فقط.</b> قولوا الأرقام لنورة بكلمات عادية. تعيد عليكم ما فهمته وتسأل فقط عمّا ينقص فعلًا، سؤالًا أو اثنين على الأكثر.</>
          : <><b>Just chat.</b> Tell Noura your figures in plain words. She will play back what she understood and ask only for what is genuinely missing, at most a question or two.</>} />
        <Step n={2} en={ar
          ? <><b>أرسلوا أي ملف.</b> أرفقوا ملف إكسل بتنسيقكم ووحداتكم: كجم، أطنان، بالات، مختلط، لا يهم. نورة تحوّل وترتّب كل شيء ثم تطلب تأكيدكم.</>
          : <><b>Send any file.</b> Attach your own Excel, in your own layout, with your own units: kg, tonnes, bales, mixed, it does not matter. Noura converts and structures everything, then asks you to confirm.</>} />
        <Step n={3} en={ar
          ? <><b>أرسلوا صورة.</b> صورة تذكرة الميزان أو بيان النفايات أو الملاحظات اليدوية تكفي.</>
          : <><b>Send a photo.</b> A picture of a weighbridge ticket, a waste manifest or handwritten notes works too.</>} />
        <p>
          {t(
            lang,
            'After you confirm and submit, the network’s validation step checks the figures against your history and emirate patterns. Once an official approves the report, it counts toward your tier, and you immediately receive your emirate benchmark and one practical insight in return. If something looks unusual, Noura will come back with a friendly question, never an accusation.',
            'بعد التأكيد والإرسال تتحقق خطوة التدقيق في الشبكة من الأرقام مقابل تاريخكم وأنماط إمارتكم. وعندما يعتمد المسؤول التقرير يُحتسب لمستواكم، وتتلقون فورًا مقارنة إمارتكم وملاحظة عملية واحدة. وإن بدا شيء غير معتاد تعود نورة بسؤال ودّي، لا اتهام.',
          )}
        </p>
        <Callout>
          <b>{t(lang, 'Never asked twice: ', 'لا تُسألون مرتين: ')}</b>
          {t(
            lang,
            'anything you tell Noura once, such as room count, floor area, material types, capacity or contacts, is remembered. Future reports get faster every quarter.',
            'كل ما تخبرون به نورة مرة واحدة، مثل عدد الغرف أو المساحة أو أنواع المواد أو الطاقة أو جهات الاتصال، يبقى محفوظًا. التقارير القادمة تصبح أسرع كل ربع.',
          )}
        </Callout>
      </Chapter>

      <Chapter no="06" en={t(lang, 'The membership ladder, certificates, and standing', 'سلّم العضوية والشهادات والمكانة')} ar={t(lang, 'سلّم العضوية والشهادات والمكانة', 'The membership ladder, certificates, and standing')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-muted">
                <th className="p-2 text-start">{t(lang, 'Tier', 'المستوى')}</th>
                <th className="p-2 text-start">{t(lang, 'How you earn it', 'كيف تكسبونه')}</th>
                <th className="p-2 text-start">{t(lang, 'What it unlocks', 'ماذا يفتح')}</th>
              </tr>
            </thead>
            <tbody>
              {TIER_LADDER.map((tier) => (
                <tr key={tier.code} className="border-t border-line/70">
                  <td className="p-2 font-medium text-brand-800">{ar ? `${tier.nameAr} · ${tier.nameEn}` : `${tier.nameEn} · ${tier.nameAr}`}</td>
                  <td className="p-2">{ar ? TIER_EARNED_AR[tier.code] : tier.earnedBy}</td>
                  <td className="p-2">{ar ? TIER_UNLOCKS_AR[tier.code] : tier.unlocks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {t(
            lang,
            'From Certified Recovery Partner upward you can download your bilingual certificate from your home screen (the “Certificate” button on your tier card). Every certificate carries a QR code: anyone who scans it sees a live confirmation of your standing from the network, without any of your figures. Show it to clients, auditors, anyone.',
            'من مستوى شريك الاستعادة المعتمد فصاعدًا يمكنكم تنزيل شهادتكم ثنائية اللغة من الصفحة الرئيسية (زر «الشهادة» على بطاقة العضوية). كل شهادة تحمل رمز QR: من يمسحه يرى تأكيدًا حيًا لمكانتكم من الشبكة دون أي من أرقامكم. اعرضوها على العملاء والمدققين وأي جهة.',
          )}
        </p>
        <p>
          {t(
            lang,
            'Standing is separate from tier: Good means your reporting is current; At-risk means one quarter was missed; Paused means two or more. Nothing is ever taken away permanently. Completing your record with Noura restores standing.',
            'المكانة مستقلة عن المستوى: «جيدة» تعني أن تقاريركم محدثة، «معرّضة للخطر» تعني ربعًا واحدًا فائتًا، «موقوفة مؤقتًا» تعني ربعين أو أكثر. لا يُسحب شيء نهائيًا أبدًا. إكمال سجلكم مع نورة يعيد المكانة.',
          )}
        </p>
        <Callout tone="gold">
          <b>{t(lang, 'Certification is annual. ', 'الاعتماد سنوي. ')}</b>
          {t(
            lang,
            `Your certificate carries a year seal (e.g. ${year}) and is valid through 31 December. It renews automatically as long as your quarterly reporting stays current. A full year without an approved report lapses the certification (by official decision, with re-certification always open). The yearly stamp is what makes the certificate credible to clients and auditors: it proves the data behind it is fresh.`,
            `شهادتكم تحمل ختم سنة (مثل ${year}) وتسري حتى 31 ديسمبر. تتجدد تلقائيًا ما دامت تقاريركم الربعية محدثة. سنة كاملة بلا تقرير معتمد تُنهي الاعتماد (بقرار رسمي، وإعادة الاعتماد متاحة دائمًا). الختم السنوي هو ما يجعل الشهادة موثوقة لدى العملاء والمدققين: يثبت أن البيانات خلفها حديثة.`,
          )}
        </Callout>
      </Chapter>

      <Chapter no="07" en={t(lang, 'Pickup requests', 'طلبات الجمع')} ar={t(lang, 'طلبات الجمع', 'Pickup requests')}>
        <Step n={1} en={ar
          ? <><b>اعرضوا:</b> عندما تكون لديكم حمولة جاهزة (سجاد، بياضات، ملابس، أقمشة تقنية، عشب صناعي) افتحوا <A href="/portal/collection">طلبات الجمع</A> أو أخبروا نورة: ماذا، كم، أين، ومتى تكون جاهزة.</>
          : <><b>Post:</b> when you have a load ready (carpet, linen, apparel, technical textile, turf), open <A href="/portal/collection">Pickups</A> or tell Noura: what, how much, where, and when it is ready.</>} />
        <Step n={2} en={ar
          ? <><b>الحجز:</b> معيد تدوير أو ناقل أو فارز أو جمعية خيرية في الشبكة يحجز حمولتكم. ترون من، ومتى يأتون.</>
          : <><b>Claimed:</b> a recycler, haulier, sorter or charity in the network claims your load. You see who, and when they are coming.</>} />
        <Step n={3} en={ar
          ? <><b>تم الجمع:</b> بعد الجمع تؤكدون الوزن الفعلي، وتُسجَّل الحركة في سلسلة الحيازة. التحويل الموثّق يُحتسب لمستوى النخبة.</>
          : <><b>Picked up:</b> after pickup you confirm the actual weight, and the transfer is recorded in the chain of custody. Verified diversion counts toward Elite.</>} />
        <Callout tone="gold">
          {t(lang, 'Material that used to go straight to landfill becomes a recorded contribution, and a step up the ladder.', 'المادة التي كانت تذهب مباشرة إلى المكب تصبح مساهمة مسجَّلة، وخطوة أعلى في السلّم.')}
        </Callout>
      </Chapter>

      <Chapter no="08" en={t(lang, 'The marketplace', 'السوق')} ar={t(lang, 'السوق', 'The marketplace')}>
        <p>
          {ar
            ? <>اعرضوا حمولات السجاد أو الملابس أو منسوجات الضيافة أو الألياف الخام أو المنتجات المعاد تدويرها أو طاقة المعالجة في <A href="/portal/market">السوق</A>، وتصفّحوا ما يعرضه الأعضاء الآخرون. المهتمون يتواصلون عبر المنصة، والأسعار والدفع تُتفق <b>مباشرة بينكم</b>. الشبكة تستضيف المطابقة، لا الصفقة.</>
            : <>List carpet, apparel, hospitality textiles, fibre feedstock, recycled products or processing capacity in <A href="/portal/market">Market</A>, and browse what other members offer. Interested parties connect through the platform; prices and payment are agreed <b>directly between you</b>. The network hosts the matchmaking, not the transaction.</>}
        </p>
      </Chapter>

      <Chapter no="09" en={t(lang, 'Your sustainability page', 'صفحة الاستدامة')} ar={t(lang, 'صفحة الاستدامة', 'Your sustainability page')}>
        <p>
          {ar
            ? <><A href="/portal/esg">الاستدامة</A> تعرض المساهمة المناخية التقديرية لتحويلكم الموثّق: الأطنان التي خرجت إلى إعادة استخدام أو تبرع أو تدوير أو تدوير تنازلي أو تصدير بدلًا من المكب، ومعدل التحويل الناتج. معامل الانبعاثات المتجنَّبة ({NTR_FACTS.esg.indicativeFactorTCO2ePerTon} طن مكافئ لكل طن) قيمة مؤقتة.</>
            : <><A href="/portal/esg">Sustainability</A> shows the estimated climate contribution of your verified diversion: the tonnes that went to reuse, donation, recycling, downcycling or export instead of landfill, and the diversion rate that results. The avoided-emissions factor ({NTR_FACTS.esg.indicativeFactorTCO2ePerTon} tCO₂e per tonne) is a placeholder.</>}
        </p>
        <Callout tone="warn">
          {t(
            lang,
            'These figures are indicative estimates, clearly labelled. They are not tradeable carbon credits. As the UAE’s carbon-market infrastructure matures, partners with a verified diversion history will be best placed. Your reporting today is your eligibility tomorrow.',
            'هذه الأرقام تقديرات استرشادية موسومة بوضوح. ليست أرصدة كربونية قابلة للتداول. ومع نضوج بنية أسواق الكربون في الإمارات سيكون الشركاء أصحاب سجل التحويل الموثّق في الموقع الأفضل. تقاريركم اليوم هي أهليتكم غدًا.',
          )}
        </Callout>
      </Chapter>

      <Chapter no="10" en={t(lang, 'Common questions', 'أسئلة شائعة')} ar={t(lang, 'أسئلة شائعة', 'Common questions')}>
        <div className="space-y-3">
          {faq.map(([q, a]) => (
            <div key={q} className="rounded-xl border border-line bg-mist/50 p-4">
              <div className="text-sm font-semibold text-brand-800">{q}</div>
              <p className="mt-1 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </Chapter>

      <div className="rounded-2xl border border-gold-300 bg-gold-50 p-5 text-center text-sm text-gold-700">
        {t(lang, 'Still unsure about anything? Open the chat and ask. ', 'ما زلتم غير متأكدين من شيء؟ افتحوا المحادثة واسألوا. ')}
        <Link href="/portal/chat" className="font-semibold underline underline-offset-2">
          {t(lang, 'Noura is online now', 'نورة متصلة الآن')}
        </Link>
      </div>
    </div>
  );
}
