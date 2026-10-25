/**
 * Seed script — Naseej Textile Recovery Platform (v0).
 *
 *   1. Admin user (platform owner) + network staff demo user
 *   2. The 7-agent roster from src/lib/agents
 *   3. Emirate baseline (indicative allocations of the reported national
 *      figure — see src/facts)
 *   4. "NTR Operations" project (internal task workstream)
 *   5. Demo partners across the ten participant types (Dubai and Abu Dhabi
 *      weighted) + one partner-portal login (Marina Crescent Hotels)
 *
 * Idempotent — safe to re-run after editing agent specs or facts.
 *
 * Usage: npm run db:seed
 *   Required env: SEED_CEO_PASSWORD (admin), optional SEED_PARTNER_PASSWORD.
 */

import {
  PrismaClient,
  UserRole,
  SafaEntity,
  ProjectStatus,
  PartnerType,
  PartnerSizeClass,
  PartnerTier,
  Region,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AGENT_SPECS } from '../src/lib/agents';
import { REGION_BASELINE } from '../src/facts';

const prisma = new PrismaClient();

const REGION3: Record<string, string> = {
  ABU_DHABI: 'AUH', DUBAI: 'DXB', SHARJAH: 'SHJ', AJMAN: 'AJM',
  UMM_AL_QUWAIN: 'UAQ', RAS_AL_KHAIMAH: 'RAK', FUJAIRAH: 'FUJ',
};

const DEMO_OFFICIAL_EMAIL = 'demo.official@naseej.nuraiya.ai';
const DEMO_PARTNER_EMAIL = 'demo.hotel@partners.naseej.nuraiya.ai';
const DEMO_PARTNER_REGISTRY = `NTR-${REGION3.DUBAI}-00001`;

async function main() {
  console.log('🧵 Seeding Naseej Textile Recovery Platform…');

  // ─────────────────────────────────────────────
  // 1. Admin + staff users
  // ─────────────────────────────────────────────
  const adminEmail = (process.env.SEED_CEO_EMAIL ?? 'nima.vakili@kmigroup.com').toLowerCase();
  const adminName = process.env.SEED_CEO_NAME ?? 'Nima Vakili';
  const adminPassword = process.env.SEED_CEO_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    throw new Error('SEED_CEO_PASSWORD must be set (≥ 8 chars).');
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: UserRole.CEO,
      title: 'Platform Owner',
      canAccessAllEntities: true,
      canAccessAllAgents: true,
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: adminName,
      role: UserRole.CEO,
      title: 'Platform Owner',
      entity: SafaEntity.GROUP,
      canAccessAllEntities: true,
      canAccessAllAgents: true,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      isActive: true,
    },
  });
  console.log(`   ✔ Admin: ${admin.email}`);

  const staffPassword =
    process.env.SEED_STAFF_PASSWORD && process.env.SEED_STAFF_PASSWORD.length >= 8
      ? process.env.SEED_STAFF_PASSWORD
      : `${adminPassword}-ntr`;
  const staff = await prisma.user.upsert({
    where: { email: DEMO_OFFICIAL_EMAIL },
    update: { isActive: true },
    create: {
      email: DEMO_OFFICIAL_EMAIL,
      name: 'NTR Demo Official',
      role: UserRole.MD,
      title: 'Partner Network Supervisor (Demo)',
      entity: SafaEntity.GROUP,
      canAccessAllEntities: true,
      canAccessAllAgents: true,
      passwordHash: await bcrypt.hash(staffPassword, 12),
      isActive: true,
    },
  });
  console.log(`   ✔ Staff demo user: ${staff.email}`);

  // ─────────────────────────────────────────────
  // 2. Agents
  // ─────────────────────────────────────────────
  for (const spec of AGENT_SPECS) {
    const data = {
      name: spec.name,
      title: spec.title,
      tier: spec.tier,
      branch: spec.branch,
      reportsToSlug: spec.reportsToSlug,
      mission: spec.mission,
      decisionRights: spec.decisionRights.trim(),
      responsibilities: spec.responsibilities.trim(),
      kpis: spec.kpis.trim(),
      tools: spec.tools.trim(),
      systemPrompt: spec.systemPrompt,
      dailyRunBrief: spec.dailyRunBrief ?? null,
      model: spec.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      temperature: spec.temperature ?? 0.4,
      deployPhase: spec.deployPhase,
      isActive: true,
      dailyRunEnabled: false,
    };
    await prisma.agent.upsert({
      where: { slug: spec.slug },
      update: data,
      create: { slug: spec.slug, ...data },
    });
  }
  console.log(`   ✔ ${AGENT_SPECS.length} agents upserted`);

  // Deactivate any agents not in the current roster (clean fork hygiene).
  const activeSlugs = AGENT_SPECS.map((a) => a.slug);
  await prisma.agent.updateMany({
    where: { slug: { notIn: activeSlugs } },
    data: { isActive: false },
  });

  // ─────────────────────────────────────────────
  // 3. Regional baseline (indicative allocations — see src/facts)
  // ─────────────────────────────────────────────
  for (const r of REGION_BASELINE) {
    const data = {
      nameAr: r.nameAr,
      baselineQuality: r.baselineQuality,
      textileWasteTons: Math.round(r.textileWasteTons),
      landfilledTons: Math.round(r.landfilledTons),
      carpetTons: Math.round(r.carpetTons),
      apparelTons: Math.round(r.apparelTons),
      hospitalityTextileTons: Math.round(r.hospitalityTextileTons),
      otherTextileTons: Math.round(r.otherTextileTons),
      hotelRooms: r.hotelRooms,
      recyclers: r.recyclers,
      sorters: r.sorters,
      collectionPoints: r.collectionPoints,
    };
    await prisma.regionBaseline.upsert({
      where: { region: r.code as Region },
      update: data,
      create: { region: r.code as Region, ...data },
    });
  }
  console.log(`   ✔ ${REGION_BASELINE.length} regional baselines (indicative)`);

  // ─────────────────────────────────────────────
  // 4. Operations project (internal task workstream)
  // ─────────────────────────────────────────────
  const existingProject = await prisma.project.findFirst({ where: { name: 'NTR Operations' } });
  if (!existingProject) {
    await prisma.project.create({
      data: {
        slug: 'ntr-operations',
        name: 'NTR Operations',
        description:
          'Internal workstream of the recovery network agent team: follow-ups, chain-of-custody audits, campaigns, data-gap chases.',
        status: ProjectStatus.IN_FLIGHT,
        entity: SafaEntity.GROUP,
      },
    });
    console.log('   ✔ NTR Operations project created');
  }

  // ─────────────────────────────────────────────
  // 5. Demo partners (Dubai and Abu Dhabi weighted, all ten types)
  // ─────────────────────────────────────────────
  const partnerPassword =
    process.env.SEED_PARTNER_PASSWORD && process.env.SEED_PARTNER_PASSWORD.length >= 8
      ? process.env.SEED_PARTNER_PASSWORD
      : `${adminPassword}-hotel`;

  const partnerUser = await prisma.user.upsert({
    where: { email: DEMO_PARTNER_EMAIL },
    update: { isActive: true },
    create: {
      email: DEMO_PARTNER_EMAIL,
      name: 'Hessa Al Falasi',
      role: UserRole.VIEWER,
      title: 'Partner — Marina Crescent Hotels (Demo)',
      entity: SafaEntity.GROUP,
      passwordHash: await bcrypt.hash(partnerPassword, 12),
      isActive: true,
    },
  });

  const demoPartners: Array<{
    registryNo: string;
    nameEn: string;
    nameAr: string;
    type: PartnerType;
    sizeClass?: PartnerSizeClass;
    subtype?: string;
    region: Region;
    city?: string;
    tier?: PartnerTier;
    foundingMember?: boolean;
    contactName?: string;
    userId?: string;
    profileFacts?: Record<string, unknown>;
  }> = [
    {
      registryNo: DEMO_PARTNER_REGISTRY,
      nameEn: 'Marina Crescent Hotels',
      nameAr: 'فنادق هلال المارينا',
      type: PartnerType.HOSPITALITY,
      subtype: 'HOTEL',
      sizeClass: PartnerSizeClass.LARGE,
      region: Region.DUBAI,
      city: 'Dubai',
      foundingMember: true,
      contactName: 'Hessa Al Falasi',
      userId: partnerUser.id,
      profileFacts: {
        properties: 4,
        rooms: 1180,
        carpet_backing: 'polyolefin broadloom in corridors, tile in meeting rooms',
        linen_cycle: 'linen retired on a 24 month cycle',
        materials: 'nylon 6 carpet, poly-cotton linen, cotton towels',
      },
    },
    {
      registryNo: `NTR-${REGION3.DUBAI}-00002`,
      nameEn: 'Burj Line Facilities Management',
      nameAr: 'برج لاين لإدارة المرافق',
      type: PartnerType.FACILITY,
      sizeClass: PartnerSizeClass.LARGE,
      region: Region.DUBAI,
      city: 'Dubai',
      foundingMember: true,
      contactName: 'Rashid Al Mheiri',
      profileFacts: { sites: 62, portfolio: 'offices, residential towers, two malls', uniform_count: 3400 },
    },
    {
      registryNo: `NTR-${REGION3.DUBAI}-00003`,
      nameEn: 'Al Khaleej Flooring Contractors',
      nameAr: 'الخليج لمقاولات الأرضيات',
      type: PartnerType.INSTALLER,
      sizeClass: PartnerSizeClass.MEDIUM,
      region: Region.DUBAI,
      city: 'Dubai',
      foundingMember: true,
      contactName: 'Eng. Tariq Haddad',
      profileFacts: { crews: 6, typical_job_m2: 1500, strip_out_share: 0.6, materials: 'nylon 6,6 tile, PP broadloom' },
    },
    {
      registryNo: `NTR-${REGION3.DUBAI}-00004`,
      nameEn: 'Gulf Polymer Recovery',
      nameAr: 'الخليج لاستعادة البوليمرات',
      type: PartnerType.RECYCLER,
      subtype: 'POLYMER',
      sizeClass: PartnerSizeClass.MEDIUM,
      region: Region.DUBAI,
      city: 'Dubai Industrial City',
      foundingMember: true,
      contactName: 'Dr. Maryam Al Hammadi',
      profileFacts: { processes: 'carpet shear, face fibre separation, PP and nylon pelletising', capacity_tpy: 6000, accepts: 'polyolefin and latex backed carpet; no PVC backing' },
    },
    {
      registryNo: `NTR-${REGION3.ABU_DHABI}-00001`,
      nameEn: 'Mussafah Fibre Works',
      nameAr: 'مصفح لأشغال الألياف',
      type: PartnerType.RECYCLER,
      subtype: 'FIBER',
      sizeClass: PartnerSizeClass.SMALL,
      region: Region.ABU_DHABI,
      city: 'Mussafah',
      foundingMember: true,
      contactName: 'Faisal Al Ameri',
      profileFacts: { processes: 'cutting, pulling, nonwoven padding', capacity_tpy: 2400, accepts: 'cotton and poly-cotton linen, non-wearable apparel' },
    },
    {
      registryNo: `NTR-${REGION3.SHARJAH}-00001`,
      nameEn: 'Hamriyah Textile Sorting',
      nameAr: 'الحمرية لفرز المنسوجات',
      type: PartnerType.SORTER,
      sizeClass: PartnerSizeClass.MEDIUM,
      region: Region.SHARJAH,
      city: 'Hamriyah Free Zone',
      contactName: 'Imran Qureshi',
      profileFacts: { grades: 'wearable export, wipers, fibre feedstock', capacity_tpy: 9000, export_markets: 'East Africa, South Asia' },
    },
    {
      registryNo: `NTR-${REGION3.ABU_DHABI}-00002`,
      nameEn: 'Al Khair Clothing Bank',
      nameAr: 'بنك الخير للملابس',
      type: PartnerType.CHARITY,
      sizeClass: PartnerSizeClass.SMALL,
      region: Region.ABU_DHABI,
      city: 'Abu Dhabi',
      contactName: 'Umm Khalid Al Mazrouei',
      profileFacts: { collection_points: 18, programs: 'Ramadan drive, school uniform exchange' },
    },
    {
      registryNo: `NTR-${REGION3.DUBAI}-00005`,
      nameEn: 'Souq Line Retail Group',
      nameAr: 'مجموعة سوق لاين للتجزئة',
      type: PartnerType.RETAILER,
      sizeClass: PartnerSizeClass.LARGE,
      region: Region.DUBAI,
      city: 'Dubai',
      contactName: 'Noor Abdulrahman',
      profileFacts: { stores: 41, take_back: 'in-store bins for apparel and staff uniforms', materials: 'cotton, polyester, poly-cotton' },
    },
    {
      registryNo: `NTR-${REGION3.ABU_DHABI}-00003`,
      nameEn: 'Al Dhafra Haulage',
      nameAr: 'الظفرة للنقل',
      type: PartnerType.HAULIER,
      sizeClass: PartnerSizeClass.MEDIUM,
      region: Region.ABU_DHABI,
      city: 'Abu Dhabi',
      contactName: 'Salem Al Shehhi',
      profileFacts: { trucks: 14, service_area: 'Abu Dhabi, Al Ain, Dubai', baled_loads: true },
    },
    {
      registryNo: `NTR-${REGION3.DUBAI}-00006`,
      nameEn: 'Al Lisaili Diversion Unit',
      nameAr: 'وحدة الليسيلي للتحويل',
      type: PartnerType.DIVERSION_UNIT,
      sizeClass: PartnerSizeClass.MEDIUM,
      region: Region.DUBAI,
      city: 'Dubai',
      contactName: 'Hamad Al Ketbi',
      profileFacts: { role: 'transfer station textile pick-out line', capacity_tpy: 15000, streams: 'bulky carpet, mixed textile bags' },
    },
    {
      registryNo: `NTR-${REGION3.DUBAI}-00007`,
      nameEn: 'Emirates Loom Flooring',
      nameAr: 'الإمارات لوم للأرضيات',
      type: PartnerType.MANUFACTURER,
      subtype: 'FLOORING',
      sizeClass: PartnerSizeClass.MEDIUM,
      region: Region.DUBAI,
      city: 'Jebel Ali',
      contactName: 'Eng. Priya Nair',
      profileFacts: { products: 'carpet tile, broadloom', offcut_share: 0.04, materials: 'nylon 6 face, polyolefin backing' },
    },
  ];

  for (const p of demoPartners) {
    const { registryNo, profileFacts, ...rest } = p;
    await prisma.partner.upsert({
      where: { registryNo },
      update: {},
      create: {
        registryNo,
        ...rest,
        profileFacts: (profileFacts ?? undefined) as never,
      },
    });
  }
  console.log(`   ✔ ${demoPartners.length} demo partners (Marina Crescent Hotels has portal login: ${DEMO_PARTNER_EMAIL})`);

  // ─────────────────────────────────────────────
  // 6. Announcements (demo)
  // ─────────────────────────────────────────────
  const annCount = await prisma.announcement.count();
  if (annCount === 0) {
    await prisma.announcement.createMany({
      data: [
        {
          kind: 'DIRECTIVE',
          titleEn: 'Q3 diversion reporting window opens',
          titleAr: 'فتح نافذة تقارير التحويل للربع الثالث',
          bodyEn: 'Quarterly diversion reports are now open. Noura is ready to receive your load figures in any format: files, photos, weighbridge tickets or voice notes.',
          bodyAr: 'نافذة تقارير التحويل الفصلية مفتوحة الآن. نورة جاهزة لاستقبال أرقام حمولاتكم بأي صيغة: ملفات أو صور أو تذاكر الميزان أو رسائل صوتية.',
        },
        {
          kind: 'ADVISORY',
          titleEn: 'PVC-backed carpet: route separately',
          titleAr: 'السجاد بظهر PVC: يُوجَّه بشكل منفصل',
          bodyEn: 'Polymer recyclers in the network do not accept PVC-backed carpet tile. Grade the backing at removal and log PVC loads on their own ticket so they reach the right offtaker.',
          bodyAr: 'معيدو تدوير البوليمر في الشبكة لا يستلمون بلاط السجاد بظهر PVC. صنّفوا نوع الظهر عند الإزالة وسجّلوا حمولات PVC في تذكرة مستقلة لتصل إلى الجهة المناسبة.',
        },
        {
          kind: 'EVENT',
          titleEn: 'Back-to-school uniform take-back week',
          titleAr: 'أسبوع استرجاع الزي المدرسي',
          bodyEn: 'Retail and charity partners are invited to join the September uniform take-back week. RSVP to be listed as a drop-off point; certified partners are listed first.',
          bodyAr: 'شركاء التجزئة والجمعيات مدعوون للمشاركة في أسبوع استرجاع الزي المدرسي في سبتمبر. أكدوا المشاركة لإدراجكم كنقطة تسليم؛ الشركاء المعتمدون يُدرجون أولاً.',
          eventDate: new Date(Date.UTC(new Date().getUTCFullYear(), 8, 7)),
          rsvpEnabled: true,
        },
      ],
    });
    console.log('   ✔ 3 announcements');
  }

  // ─────────────────────────────────────────────
  // 7. Demo network activity (one ticket, one listing)
  // ─────────────────────────────────────────────
  const hotel = await prisma.partner.findUnique({ where: { registryNo: DEMO_PARTNER_REGISTRY } });
  const manufacturer = await prisma.partner.findUnique({ where: { registryNo: `NTR-${REGION3.DUBAI}-00007` } });
  if (hotel && (await prisma.collectionTicket.count()) === 0) {
    await prisma.collectionTicket.create({
      data: {
        partnerId: hotel.id,
        stream: 'PC_CARPET_BROADLOOM',
        estimatedTons: 4.8,
        region: hotel.region,
        city: hotel.city,
        locationNote: 'Loading bay B, rolled and strapped, polyolefin backing, floors 6 to 9 strip-out',
        status: 'OPEN',
      },
    });
    console.log('   ✔ demo collection ticket (Marina Crescent Hotels, 4.8 t broadloom)');
  }
  if (manufacturer && (await prisma.listing.count()) === 0) {
    await prisma.listing.create({
      data: {
        partnerId: manufacturer.id,
        category: 'CARPET_PI',
        title: 'Nylon 6 carpet tile offcuts, clean, 7 tons, ex-works Jebel Ali',
        qtyTons: 7,
        askPriceAed: 0,
        notes: 'Single polymer face, polyolefin backing, palletised. Free to a network recycler against a chain-of-custody record.',
        region: manufacturer.region,
      },
    });
    console.log('   ✔ demo listing (Emirates Loom Flooring, 7 t PI carpet offcuts)');
  }

  console.log('🧵 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
