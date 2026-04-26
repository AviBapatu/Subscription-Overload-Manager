import React from 'react';
import dayjs from 'dayjs';

/**
 * PrivacyBanner — displayed at the top of the Dashboard.
 * Shows last Gmail sync time and a link to manage Gmail access.
 */
const PrivacyBanner = ({ lastGmailSync }) => (
    <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-2xl px-5 py-4 text-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-primary mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
        <div className="flex-1 min-w-0">
            <span className="font-semibold text-on-surface">Privacy First —</span>{' '}
            We only read billing-related emails (invoices, receipts, renewals) to detect subscriptions.
            Your email content is never stored on our servers.{' '}
            {lastGmailSync && (
                <span className="opacity-70">Last scanned {dayjs(lastGmailSync).fromNow()}.</span>
            )}
        </div>
        <a href="/profile" className="shrink-0 text-xs font-bold text-primary uppercase tracking-widest hover:underline whitespace-nowrap self-center">
            Manage Access
        </a>
    </div>
);

export default PrivacyBanner;
