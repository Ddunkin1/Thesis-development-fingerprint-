/** What the gym stores about the member and how to have it removed. Plain language, no legal wall of text. */
export function PrivacyCard({ privacy }: {
  privacy: { consentGiven: boolean; consentOn: string | null; withdrawnOn: string | null; fingersStored: number };
}) {
  return (
    <details className="rounded-2xl border bg-card">
      <summary className="cursor-pointer p-4 font-medium">My data and privacy</summary>
      <div className="space-y-3 border-t p-4 text-sm">
        <p className="font-medium">
          {privacy.consentGiven
            ? `Consent given${privacy.consentOn ? ` on ${privacy.consentOn}` : ""}. Fingerprints stored: ${privacy.fingersStored}.`
            : `Consent withdrawn${privacy.withdrawnOn ? ` on ${privacy.withdrawnOn}` : ""}. No fingerprint is stored.`}
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>The gym keeps your name, account, membership, payments, visits, streak and badges.</li>
          <li>For check-in it keeps a fingerprint template, which is a numeric code. No fingerprint image is stored. The template is encrypted in the database.</li>
          <li>It is used to run your membership: checking you in and showing your progress.</li>
          <li>Gym staff at the front desk can see your membership and visits. Other members see only your first name and last initial, and only if you are on the leaderboard.</li>
          <li>You may ask to see or correct your data, withdraw your consent, or have your account deleted. Ask at the front desk.</li>
          <li>Withdrawing consent removes your fingerprint. If your account is deleted, payment records may be kept with your name for the gym&apos;s accounts.</li>
        </ul>
        <p className="text-muted-foreground">Your rights are protected by the Data Privacy Act of 2012 (Republic Act 10173).</p>
      </div>
    </details>
  );
}
