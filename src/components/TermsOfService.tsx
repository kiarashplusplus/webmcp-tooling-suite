import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@phosphor-icons/react'

interface TermsOfServiceProps {
  onBack?: () => void
  embedded?: boolean
}

export function TermsOfService({ onBack, embedded = false }: TermsOfServiceProps) {
  const content = (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <h1 className="text-2xl font-bold text-foreground mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-6">Last updated: December 4, 2025</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          By accessing or using the LLMFeed Analyzer ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
          If you do not agree to these Terms, you may not use the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          The LLMFeed Analyzer is an open-source tool that provides validation, discovery, archival, and RAG preparation 
          for LLMFeed/WebMCP ecosystem feeds. The Service is provided free of charge for personal and commercial use.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">3. Disclaimer of Warranties</h2>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-3">
          <p className="text-sm text-foreground/90 leading-relaxed font-medium">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
            INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
            NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
          </p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          The initiators, maintainers, and contributors of this open-source project make no warranty that:
        </p>
        <ul className="text-sm text-foreground/80 space-y-2 list-disc pl-5 mb-3">
          <li>The Service will meet your requirements</li>
          <li>The Service will be uninterrupted, timely, secure, or error-free</li>
          <li>The results obtained from the Service will be accurate or reliable</li>
          <li>Any errors in the Service will be corrected</li>
          <li>The validation or signature verification results are guaranteed to be accurate</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">4. Limitation of Liability</h2>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-3">
          <p className="text-sm text-foreground/90 leading-relaxed font-medium">
            IN NO EVENT SHALL THE INITIATORS, MAINTAINERS, CONTRIBUTORS, OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
            DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, 
            OR IN CONNECTION WITH THE SERVICE OR THE USE OR OTHER DEALINGS IN THE SERVICE.
          </p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          This includes, but is not limited to:
        </p>
        <ul className="text-sm text-foreground/80 space-y-2 list-disc pl-5 mb-3">
          <li>Direct, indirect, incidental, special, consequential, or punitive damages</li>
          <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
          <li>Damages resulting from unauthorized access to or use of our servers</li>
          <li>Damages resulting from any bugs, viruses, or other harmful code</li>
          <li>Damages resulting from reliance on validation or signature verification results</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">5. User Responsibilities</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          You are responsible for:
        </p>
        <ul className="text-sm text-foreground/80 space-y-2 list-disc pl-5 mb-3">
          <li>Ensuring your use of the Service complies with all applicable laws and regulations</li>
          <li>The accuracy and legality of any feeds you publish to the public directory</li>
          <li>Maintaining the confidentiality of your GitHub account credentials</li>
          <li>All activities that occur under your account</li>
          <li>Not using the Service for any unlawful or prohibited purpose</li>
          <li>Not attempting to interfere with or disrupt the Service</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">6. Data Storage</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          By default, all data is stored locally in your browser's localStorage. When you sign in with GitHub and 
          publish feeds to the public directory:
        </p>
        <ul className="text-sm text-foreground/80 space-y-2 list-disc pl-5 mb-3">
          <li>Your GitHub username will be associated with published feeds</li>
          <li>Published feeds become publicly visible in the directory</li>
          <li>You may unpublish feeds you have published at any time</li>
          <li>We do not store your GitHub access tokens on our servers</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">7. Third-Party Content</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          The Service may display, include, or make available third-party content (including feeds published by other users) 
          or provide links to third-party websites. We do not control, endorse, or assume responsibility for any third-party 
          content. Your use of third-party content is at your own risk.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">8. Open Source License</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          The LLMFeed Analyzer is open-source software released under the MIT License. You may view, fork, and contribute 
          to the source code on GitHub. The MIT License permits use, copying, modification, merging, publishing, distribution, 
          sublicensing, and/or selling copies of the Software, subject to the license conditions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">9. Indemnification</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          You agree to defend, indemnify, and hold harmless the initiators, maintainers, and contributors from and against 
          any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the Service or 
          violation of these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">10. Modifications to Terms</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. 
          Your continued use of the Service after changes constitutes acceptance of the modified Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">11. Termination</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          We may terminate or suspend access to the Service immediately, without prior notice or liability, for any reason, 
          including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">12. Governing Law</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          These Terms shall be governed by and construed in accordance with the laws of the State of California, 
          United States, without regard to its conflict of law provisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">13. Contact</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          For questions about these Terms, please open an issue on our{' '}
          <a 
            href="https://github.com/kiarashplusplus/webmcp-tooling-suite/issues" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-accent underline underline-offset-2"
          >
            GitHub repository
          </a>.
        </p>
      </section>

      <section className="pt-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          By using the LLMFeed Analyzer, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </p>
      </section>
    </div>
  )

  if (embedded) {
    return <div className="p-4">{content}</div>
  }

  return (
    <Card className="glass-card rounded-2xl p-6 max-w-4xl mx-auto">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
      )}
      <ScrollArea className="h-[70vh]">
        <div className="pr-4">
          {content}
        </div>
      </ScrollArea>
    </Card>
  )
}

export function TermsLink({ className }: { className?: string }) {
  return (
    <a 
      href="#terms" 
      onClick={(e) => {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('show-terms'))
      }}
      className={className || "text-primary/80 hover:text-accent transition-colors underline underline-offset-2"}
    >
      Terms of Service
    </a>
  )
}
