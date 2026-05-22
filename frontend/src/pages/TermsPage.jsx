export default function TermsPage() {
  const S = {
    page: {
      maxWidth: 720, margin: '0 auto', padding: '48px 24px',
      fontFamily: 'system-ui, sans-serif', color: 'var(--text)',
      lineHeight: 1.7,
    },
    header: {
      fontFamily: 'Cinzel, serif', fontSize: 26, fontWeight: 700,
      color: 'var(--gold)', marginBottom: 4,
    },
    updated: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 36 },
    divider: { border: 'none', borderTop: '1px solid var(--border)', margin: '28px 0' },
    section: { marginBottom: 28 },
    sectionTitle: {
      fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--accent2)', marginBottom: 10,
    },
    ul: { paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 },
    li: { fontSize: 14, color: 'var(--text)' },
    footer: {
      marginTop: 40, padding: '16px 20px', borderRadius: 10,
      background: 'var(--bg2)', border: '1px solid var(--border)',
      fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
    },
  };

  const sections = [
    { title: '1. Eligibility', items: [
      'You must be at least 13 years old to use Tickd.',
      'By registering, you confirm that the information you provide is accurate and up to date.',
      'You may only hold one account. Duplicate accounts may be removed.',
    ]},
    { title: '2. Acceptable Behaviour', items: [
      'Treat all other users with respect at all times.',
      'Swearing, offensive language, and profanity are not permitted anywhere on the platform, including usernames, messages, and suggestions.',
      'Harassment, bullying, threats, or intimidation of any other user will result in immediate account suspension.',
      'Hate speech of any kind — including content that discriminates based on race, gender, religion, nationality, sexual orientation, or disability — is strictly forbidden.',
      'Do not impersonate other users, public figures, or Tickd staff.',
      'Do not share, solicit, or distribute any personal information of other users without their explicit consent.',
    ]},
    { title: '3. Usernames and Content', items: [
      'Usernames must be appropriate and inoffensive. Tickd reserves the right to remove or rename any username deemed unsuitable.',
      'Messages, suggestions, and any other user-generated content must be appropriate for all audiences.',
      'Inappropriate, sexual, violent, or otherwise offensive content is not allowed and will be removed without notice.',
    ]},
    { title: '4. Fair Use', items: [
      'Do not attempt to exploit, hack, or manipulate the platform, its systems, or other users\' accounts.',
      'Cheating, including artificially inflating XP, gold, or dungeon progress through unauthorised means, is not permitted.',
      'Do not use automated scripts, bots, or tools to interact with Tickd.',
      'Gifting and trading features must be used in good faith. Using them to manipulate or scam other users will result in a ban.',
    ]},
    { title: '5. Account Security', items: [
      'You are responsible for keeping your account credentials secure.',
      'Do not share your password with anyone.',
      'If you suspect your account has been compromised, contact us immediately.',
      'Tickd is not liable for any loss resulting from unauthorised access to your account caused by your own negligence.',
    ]},
    { title: '6. Suggestions and Feedback', items: [
      'Suggestions submitted through the platform must be constructive and respectful.',
      'Spam suggestions or those containing inappropriate content will be deleted without notice.',
      'By submitting a suggestion, you grant Tickd the right to use that idea without obligation or compensation.',
    ]},
    { title: '7. Privacy', items: [
      'Your data is stored securely and will not be sold to third parties.',
      'Privacy settings on your profile are your responsibility to configure.',
      'By using Tickd, you consent to your data being stored and processed as necessary to run the service.',
    ]},
    { title: '8. Enforcement', items: [
      'Tickd reserves the right to warn, suspend, or permanently ban any account that violates these terms.',
      'Serious violations (harassment, hacking, hate speech) will result in an immediate permanent ban with no appeal.',
      'Lesser violations may result in a warning first, followed by suspension if behaviour continues.',
      'Tickd\'s decisions on enforcement are final.',
    ]},
    { title: '9. Changes to These Terms', items: [
      'These terms may be updated at any time. Continued use of Tickd after changes are posted constitutes acceptance of the new terms.',
      'It is your responsibility to check these terms periodically.',
    ]},
    { title: '10. Disclaimer', items: [
      'Tickd is provided as-is. We do not guarantee uninterrupted availability of the service.',
      'We are not responsible for any loss of data or progress resulting from technical issues.',
      'Tickd is a fantasy pixel-art dungeon-crawler game and is intended purely for entertainment.',
    ]},
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={S.page}>
        <div style={S.header}>⚔️ Terms &amp; Conditions</div>
        <div style={S.updated}>Last updated: May 2026</div>
        <hr style={S.divider} />

        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
          By creating an account and using Tickd, you agree to the following terms.
          If you do not agree, please do not use the platform.
        </p>

        {sections.map(sec => (
          <div key={sec.title} style={S.section}>
            <div style={S.sectionTitle}>{sec.title}</div>
            <ul style={S.ul}>
              {sec.items.map((item, i) => (
                <li key={i} style={S.li}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <hr style={S.divider} />
        <div style={S.footer}>
          By using Tickd, you agree to play fair, be kind, and help make this community a great place for everyone.<br />
          Questions? Contact us via{' '}
          <a href="https://github.com/3terrabytes/tickd" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent2)', textDecoration: 'none' }}>
            GitHub
          </a>.
        </div>
      </div>
    </div>
  );
}
