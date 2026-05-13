import { DemoSection } from '@/components/demo/demo-section';
import { FaqSection } from '@/components/marketing/faq-section';
import { ForProfessionals } from '@/components/marketing/for-professionals';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { RevealOnScroll } from '@/components/marketing/reveal-on-scroll';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import { WhyDifferent } from '@/components/marketing/why-different';

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <WhyDifferent />
        <DemoSection />
        <ForProfessionals />
        <FaqSection />
      </main>
      <SiteFooter />
      <RevealOnScroll />
    </>
  );
}
