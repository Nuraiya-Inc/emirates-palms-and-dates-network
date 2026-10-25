/**
 * Portal — chat with Noura. Same runtime as the console chat
 * (/api/portal/chat), wrapped in the partner portal's skin.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ChatWindow from '@/components/ChatWindow';
import { getPortalLang, t } from '@/lib/portal-lang';

export const dynamic = 'force-dynamic';

export default async function PortalChatPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const lang = await getPortalLang();
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect('/dashboard');

  const agent = await prisma.agent.findUnique({ where: { slug: 'nou-00' } });
  if (!agent || !agent.isActive) redirect('/portal');

  let thread = await prisma.chatThread.findUnique({
    where: { userId_agentId: { userId: session.user.id, agentId: agent.id } },
  });
  if (!thread) {
    thread = await prisma.chatThread.create({
      data: { userId: session.user.id, agentId: agent.id, title: 'Chat with Noura' },
    });
  }

  const recent = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const messages = recent.reverse();

  const initial = messages.map((m) => ({
    id: m.id,
    role: m.role as 'USER' | 'ASSISTANT',
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    modelUsed: m.modelUsed,
    tokensIn: m.tokensIn,
    tokensOut: m.tokensOut,
    cachedTokensIn: m.cachedTokensIn,
  }));

  return (
    <div className="space-y-4">
      <header className="fade-up">
        <div className="section-rule" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-brand-800">
          {t(lang, 'Noura · نورة', 'نورة · Noura')}
        </h1>
        <p className="text-sm text-muted">
          {t(
            lang,
            'Your network director: loads, diversion reports, questions, requests. Send an Excel, a photo of a weighbridge ticket, or a voice note; she takes it from there. Arabic or English.',
            'مديرة الشبكة: الحمولات وتقارير التحويل والأسئلة والطلبات. أرسلوا ملف إكسل أو صورة تذكرة الميزان أو رسالة صوتية، وهي تتولى الباقي. بالعربية أو الإنجليزية.',
          )}
        </p>
      </header>
      <div className="fade-up fade-up-1">
        <ChatWindow
          agentSlug={agent.slug}
          agentName={t(lang, 'Noura, Network Director', 'نورة، مديرة الشبكة')}
          agentTier={agent.tier}
          initialMessages={initial}
          initialPrefill=""
        />
      </div>
    </div>
  );
}
