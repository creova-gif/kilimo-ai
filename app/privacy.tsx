import React from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';
import { useColorScheme } from 'react-native';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111111';
  const subTextColor = isDark ? '#a1a1aa' : '#52525b';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <Text style={[styles.title, { color: textColor }]}>Privacy Policy</Text>
      <Text style={[styles.date, { color: subTextColor }]}>
        Last Updated: May 25, 2026 · Effective: May 25, 2026
      </Text>
      <Text style={[styles.intro, { color: subTextColor }]}>
        KILIMO AI ("we," "our," or "us") is operated by Kilimo AI Ltd., a company registered in
        Tanzania. This Privacy Policy explains how we collect, use, store, and share your personal
        information when you use the KILIMO AI mobile application ("App"). By using the App, you
        consent to the practices described below.
      </Text>

      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      <Section title="1. Data Controller" color={textColor} sub={subTextColor}>
        Kilimo AI Ltd. is the data controller responsible for your personal information. Contact us
        at:{'\n\n'}
        Email: privacy@kilimo.ai{'\n'}
        Address: Dar es Salaam, Tanzania{'\n'}
        Phone: +255 22 000 0000
      </Section>

      <Section title="2. Information We Collect" color={textColor} sub={subTextColor}>
        We collect the following categories of personal data:{'\n\n'}
        <Bold>a) Account & Identity Data{'\n'}</Bold>— Full name, phone number, and Agro ID
        identifier you provide during registration.{'\n\n'}
        <Bold>b) Farm Profile Data{'\n'}</Bold>— Region, district, farm size (acres), primary crops,
        livestock presence, and irrigation method.{'\n\n'}
        <Bold>c) Location Data{'\n'}</Bold>— Approximate location (region/district level) for
        weather forecasts and market price relevance. GPS coordinates are only accessed if you use
        the Farm Map feature, and only while the app is in use.{'\n\n'}
        <Bold>d) Agricultural Activity Data{'\n'}</Bold>— Crop scan images and AI diagnosis results,
        farm task records, market orders, contract farming records, and livestock logs.{'\n\n'}
        <Bold>e) Voice & Audio Data{'\n'}</Bold>— Audio recordings made through the Sankofa AI voice
        feature for transcription purposes only. Recordings are sent to OpenAI Whisper for
        transcription and are not stored by us after processing.{'\n\n'}
        <Bold>f) Financial Data{'\n'}</Bold>— Wallet transaction history and M-Pesa linked phone
        number (if you choose to link it). We do not store full M-Pesa credentials.{'\n\n'}
        <Bold>g) Device & Diagnostic Data{'\n'}</Bold>— Device type, operating system version, and
        app version. If crash reporting is enabled for a release, we collect anonymized crash and
        error diagnostics (stack traces and device context, via Sentry) to fix bugs. We do not use
        third-party behavioural or advertising analytics.
      </Section>

      <Section title="3. How We Use Your Data" color={textColor} sub={subTextColor}>
        We use your personal data to:{'\n\n'}— Create and manage your Agro ID account{'\n'}— Provide
        AI-powered crop diagnosis, farming advice, and market insights{'\n'}— Deliver weather
        forecasts tailored to your region{'\n'}— Process wallet transactions and co-operative
        payments{'\n'}— Send in-app notifications and (with consent) SMS alerts about crop threats
        {'\n'}— Improve our AI models using anonymized, aggregated agricultural data{'\n'}— Comply
        with legal obligations under Tanzanian law{'\n'}— Prevent fraud and ensure platform security
      </Section>

      <Section title="4. Legal Basis for Processing" color={textColor} sub={subTextColor}>
        We process your data under the following legal bases:{'\n\n'}—{' '}
        <Bold>Contract performance:</Bold> To provide the services you signed up for.{'\n'}—{' '}
        <Bold>Legitimate interests:</Bold> To improve the App, detect fraud, and ensure security.
        {'\n'}— <Bold>Consent:</Bold> For SMS notifications, voice recording, and camera access —
        you may withdraw consent at any time in Settings.{'\n'}— <Bold>Legal compliance:</Bold> To
        meet obligations under Tanzanian law and applicable data protection regulations.
      </Section>

      <Section title="5. Third-Party Services" color={textColor} sub={subTextColor}>
        We share data with the following trusted third parties:{'\n\n'}
        <Bold>OpenAI (USA){'\n'}</Bold>— Crop scan images and chat messages are sent to OpenAI's API
        for AI analysis. OpenAI processes this data under its own privacy policy. We do not send
        identifiable personal information alongside image data.{'\n\n'}
        <Bold>Supabase (USA/EU){'\n'}</Bold>— Our backend database and authentication provider. Data
        may be stored on servers in the EU or USA with appropriate safeguards.{'\n\n'}
        <Bold>Africa's Talking (Kenya){'\n'}</Bold>— Used to deliver critical SMS alerts to your
        registered phone number when enabled.{'\n\n'}
        <Bold>Safaricom Daraja / M-Pesa (Kenya/Tanzania){'\n'}</Bold>— Used to process M-Pesa
        payments when you initiate a transaction.{'\n\n'}
        <Bold>OpenWeatherMap (USA){'\n'}</Bold>— Used to retrieve weather forecasts based on your
        region.{'\n\n'}
        We do not sell your personal data to any third party.
      </Section>

      <Section
        title="6. Camera, Microphone & Location Permissions"
        color={textColor}
        sub={subTextColor}
      >
        The App requests the following device permissions:{'\n\n'}— <Bold>Camera:</Bold> To capture
        crop photos for AI disease diagnosis. Images are processed by OpenAI and not stored on our
        servers unless you save the result.{'\n'}— <Bold>Photo Library:</Bold> To allow you to
        upload existing crop photos for diagnosis.{'\n'}— <Bold>Microphone:</Bold> To capture voice
        input for the Sankofa AI assistant. Audio is sent to OpenAI Whisper for transcription only.
        {'\n'}— <Bold>Location:</Bold> For the Farm Map feature and precise weather data. You may
        deny location permission; region-level weather will still work from your profile.{'\n\n'}
        You can revoke any permission at any time through your device's Settings app.
      </Section>

      <Section title="7. Data Retention" color={textColor} sub={subTextColor}>
        — Account data: Retained for as long as your account is active, plus 90 days after deletion
        request.{'\n'}— Crop scan images: Not stored on our servers; processed in real-time only.
        {'\n'}— Voice recordings: Deleted immediately after transcription.{'\n'}— Farm activity
        logs: Retained for 3 years to support historical yield analysis.{'\n'}— Financial
        transaction records: Retained for 7 years as required by Tanzanian financial regulations.
        {'\n'}— Crash & error diagnostics: Retained by our error-reporting provider (Sentry) for up
        to 90 days.
      </Section>

      <Section title="8. Your Rights" color={textColor} sub={subTextColor}>
        Under applicable data protection law, you have the right to:{'\n\n'}— <Bold>Access:</Bold>{' '}
        Request a copy of your personal data.{'\n'}— <Bold>Correction:</Bold> Request correction of
        inaccurate data.{'\n'}— <Bold>Deletion:</Bold> Request deletion of your account and
        associated data (subject to legal retention requirements).{'\n'}— <Bold>Portability:</Bold>{' '}
        Receive your farm data in a structured, machine-readable format (CSV/JSON).{'\n'}—{' '}
        <Bold>Objection:</Bold> Object to processing based on legitimate interests.{'\n'}—{' '}
        <Bold>Withdraw consent:</Bold> Withdraw consent for SMS or voice features at any time
        without affecting prior processing.{'\n\n'}
        To exercise any right, email privacy@kilimo.ai. We will respond within 30 days.
      </Section>

      <Section title="9. Data Security" color={textColor} sub={subTextColor}>
        We implement the following security measures:{'\n\n'}— All data transmitted between the App
        and our servers is encrypted using TLS 1.3.{'\n'}— Agro IDs are generated using
        cryptographically secure random identifiers.{'\n'}— Authentication tokens are stored in the
        device's secure keychain (not plain storage).{'\n'}— We conduct regular security audits and
        vulnerability assessments.{'\n'}— Access to production databases is restricted to authorised
        personnel only.{'\n\n'}
        In the event of a data breach affecting your rights, we will notify you within 72 hours as
        required by applicable law.
      </Section>

      <Section title="10. Children's Privacy" color={textColor} sub={subTextColor}>
        KILIMO AI is not directed at children under the age of 16. We do not knowingly collect
        personal data from minors. If you believe a minor has registered, please contact us at
        privacy@kilimo.ai and we will delete the account.
      </Section>

      <Section title="11. International Data Transfers" color={textColor} sub={subTextColor}>
        Your data may be transferred to and processed in countries outside Tanzania, including the
        United States and European Union, where our service providers operate. We ensure appropriate
        safeguards are in place (including Standard Contractual Clauses where required) for all
        international transfers.
      </Section>

      <Section title="12. Cookies & Diagnostics" color={textColor} sub={subTextColor}>
        The mobile app does not use browser cookies, and we do not use third-party behavioural or
        advertising analytics. Where crash reporting is enabled for a release, anonymized crash and
        error diagnostics (not linked to your identity) are collected via Sentry solely to diagnose
        and fix problems.
      </Section>

      <Section title="13. SMS Notifications" color={textColor} sub={subTextColor}>
        If you provide your phone number and enable SMS alerts, we will send critical farm alerts
        (e.g., disease detections, severe weather warnings) via Africa's Talking. You can disable
        SMS alerts at any time in Profile → Settings → Notifications. Standard carrier message rates
        may apply.
      </Section>

      <Section title="14. AI Disclaimer" color={textColor} sub={subTextColor}>
        Crop diagnoses, market predictions, and farming advice generated by KILIMO AI are provided
        for informational purposes only. They are derived from AI models and should not replace
        professional agronomic advice. We are not liable for decisions made solely on the basis of
        AI-generated recommendations.
      </Section>

      <Section title="15. Changes to This Policy" color={textColor} sub={subTextColor}>
        We may update this Privacy Policy from time to time. When we make material changes, we will
        notify you via in-app notification and update the "Last Updated" date above. Continued use
        of the App after changes take effect constitutes acceptance of the updated policy.
      </Section>

      <Section title="16. Contact & Complaints" color={textColor} sub={subTextColor}>
        For privacy questions or to exercise your rights:{'\n\n'}
        Email: privacy@kilimo.ai{'\n'}
        Kilimo AI Ltd., Dar es Salaam, Tanzania{'\n\n'}
        If you are unsatisfied with our response, you may lodge a complaint with the Tanzania
        Communications Regulatory Authority (TCRA) or relevant data protection authority in your
        jurisdiction.
      </Section>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontFamily: 'Inter_700Bold' }}>{children}</Text>;
}

function Section({
  title,
  children,
  color,
  sub,
}: {
  title: string;
  children: React.ReactNode;
  color: string;
  sub: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <Text style={[styles.sectionText, { color: sub }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  date: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  intro: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 20 },
  divider: { height: 1, marginBottom: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  sectionText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
});
