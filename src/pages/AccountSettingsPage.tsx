import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { defaultAccountSettings, type AccountSettings } from '../db/schema';
import {
  Bell,
  CreditCard,
  LockKeyhole,
  PlugZap,
  Save,
  Shield,
  Smartphone,
  Trash2,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

interface AccountSettingsPageProps {
  showToast: (msg: string) => void;
}

type SettingsTab = 'account' | 'notifications' | 'privacy' | 'billing' | 'integrations';

const tabs: Array<{ key: SettingsTab; label: string; icon: LucideIcon }> = [
  { key: 'account', label: 'Account', icon: UserCog },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'privacy', label: 'Privacy', icon: Shield },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'integrations', label: 'Integrations', icon: PlugZap },
];

function mergeSettings(settings?: AccountSettings): AccountSettings {
  const defaults = defaultAccountSettings();
  if (!settings) return defaults;
  return {
    notifications: {
      email: { ...defaults.notifications.email, ...settings.notifications?.email },
      inApp: { ...defaults.notifications.inApp, ...settings.notifications?.inApp },
      sms: { ...defaults.notifications.sms, ...settings.notifications?.sms },
    },
    privacy: { ...defaults.privacy, ...settings.privacy },
    billing: { ...defaults.billing, ...settings.billing },
  };
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100">
      <span>
        <span className="block text-sm font-black text-slate-950">{label}</span>
        {description && <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-[#2563EB]' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

export default function AccountSettingsPage({ showToast }: AccountSettingsPageProps) {
  const { currentUser, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [settings, setSettings] = useState<AccountSettings>(() => mergeSettings(currentUser?.accountSettings));
  const [emailEditing, setEmailEditing] = useState(false);
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone.replace(/^\+254/, '') || '');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <UserCog className="mx-auto h-10 w-10 text-[#2563EB]" />
          <h1 className="mt-3 text-lg font-black text-slate-950">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage your account settings.</p>
        </div>
      </div>
    );
  }

  const updateNotification = <Group extends keyof AccountSettings['notifications'], Key extends keyof AccountSettings['notifications'][Group]>(
    group: Group,
    key: Key,
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [group]: {
          ...prev.notifications[group],
          [key]: value,
        },
      },
    }));
  };

  const updatePrivacy = <Key extends keyof AccountSettings['privacy']>(key: Key, value: AccountSettings['privacy'][Key]) => {
    setSettings(prev => ({ ...prev, privacy: { ...prev.privacy, [key]: value } }));
  };

  const saveAccount = () => {
    updateUser(currentUser._id, {
      email: email.trim() || currentUser.email,
      phone: phone.startsWith('+254') ? phone : `+254${phone.replace(/^0/, '')}`,
    });
    setEmailEditing(false);
    showToast('Settings saved ✓');
  };

  const saveSettings = () => {
    updateUser(currentUser._id, { accountSettings: settings });
    showToast('Settings saved ✓');
  };

  const deactivateAccount = () => {
    updateUser(currentUser._id, { isSuspended: true });
    showToast('Account deactivated.');
  };

  const confirmDeleteAccount = () => {
    if (deleteText !== 'DELETE') {
      showToast('Type DELETE to confirm account deletion.');
      return;
    }
    updateUser(currentUser._id, { isSuspended: true });
    logout();
    setDeleteOpen(false);
    showToast('Account deletion request recorded.');
  };

  const renderAccount = () => (
    <div className="space-y-5">
      <SectionCard title="Account access">
        <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
          Email address
          <div className="mt-2 flex gap-2">
            <input disabled={!emailEditing} value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-900 outline-none disabled:text-slate-500" />
            <button type="button" onClick={() => setEmailEditing(editing => !editing)} className="rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]">Change Email</button>
          </div>
        </label>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Password</p>
          <button onClick={() => showToast('Password reset link prepared for this demo account.')} className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
            <LockKeyhole className="h-4 w-4" />
            Change Password
          </button>
        </div>
        <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
          Phone number
          <div className="mt-2 flex items-center rounded-2xl border border-slate-200 bg-slate-50">
            <span className="px-3 text-sm font-black text-slate-400">+254</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="min-w-0 flex-1 bg-transparent p-3 pl-0 text-sm normal-case tracking-normal text-slate-900 outline-none" />
          </div>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Account type</p>
            <p className="mt-1 text-sm font-black capitalize text-slate-950">{currentUser.role}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Account status</p>
            <p className={`mt-1 text-sm font-black ${currentUser.isSuspended ? 'text-red-600' : 'text-emerald-600'}`}>{currentUser.isSuspended ? 'Suspended' : 'Active'}</p>
          </div>
        </div>
        <button onClick={saveAccount} className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
          <Save className="h-4 w-4" />
          Save account
        </button>
      </SectionCard>

      <SectionCard title="Danger zone">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={deactivateAccount} className="rounded-2xl border border-amber-200 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-50">Deactivate Account</button>
          <button onClick={() => setDeleteOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      </SectionCard>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-5">
      <SectionCard title="Email notifications">
        <Toggle checked={settings.notifications.email.newApplication} onChange={(value) => updateNotification('email', 'newApplication', value)} label="New application received" />
        <Toggle checked={settings.notifications.email.candidateMessage} onChange={(value) => updateNotification('email', 'candidateMessage', value)} label="Candidate message" />
        <Toggle checked={settings.notifications.email.applicationStatus} onChange={(value) => updateNotification('email', 'applicationStatus', value)} label="Application status update" />
        <Toggle checked={settings.notifications.email.weeklyDigest} onChange={(value) => updateNotification('email', 'weeklyDigest', value)} label="Weekly hiring digest" />
        <Toggle checked={settings.notifications.email.platformNews} onChange={(value) => updateNotification('email', 'platformNews', value)} label="Platform news & updates" />
        <Toggle checked={settings.notifications.email.promotions} onChange={(value) => updateNotification('email', 'promotions', value)} label="Promotional offers" />
      </SectionCard>
      <SectionCard title="In-app notifications">
        <Toggle checked={settings.notifications.inApp.newMatch} onChange={(value) => updateNotification('inApp', 'newMatch', value)} label="New match found" />
        <Toggle checked={settings.notifications.inApp.messageReceived} onChange={(value) => updateNotification('inApp', 'messageReceived', value)} label="Message received" />
        <Toggle checked={settings.notifications.inApp.jobPosted} onChange={(value) => updateNotification('inApp', 'jobPosted', value)} label="Job posted successfully" />
        <Toggle checked={settings.notifications.inApp.systemAnnouncements} onChange={(value) => updateNotification('inApp', 'systemAnnouncements', value)} label="System announcements" />
      </SectionCard>
      <SectionCard title="SMS notifications">
        <Toggle checked={settings.notifications.sms.newApplicationAlert} onChange={(value) => updateNotification('sms', 'newApplicationAlert', value)} label="New application alert" />
        <Toggle checked={settings.notifications.sms.interviewReminder} onChange={(value) => updateNotification('sms', 'interviewReminder', value)} label="Interview reminder" />
        <Toggle checked={settings.notifications.sms.paymentConfirmation} onChange={(value) => updateNotification('sms', 'paymentConfirmation', value)} label="Payment confirmation" />
      </SectionCard>
      <button onClick={saveSettings} className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
        <Save className="h-4 w-4" />
        Save notifications
      </button>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-5">
      <SectionCard title="Profile visibility">
        {[
          { value: 'public', label: 'Public', desc: 'Visible to all fundis.' },
          { value: 'verified', label: 'Verified fundis only', desc: 'Only verified fundis can see your profile details.' },
          { value: 'private', label: 'Private', desc: 'Hidden from profile search.' },
        ].map(option => (
          <button key={option.value} onClick={() => updatePrivacy('profileVisibility', option.value as AccountSettings['privacy']['profileVisibility'])} className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition ${settings.privacy.profileVisibility === option.value ? 'bg-blue-50 ring-1 ring-[#2563EB]' : 'bg-slate-50 hover:bg-slate-100'}`}>
            <span className={`h-4 w-4 rounded-full ring-2 ${settings.privacy.profileVisibility === option.value ? 'border-4 border-white bg-[#2563EB] ring-[#2563EB]' : 'bg-white ring-slate-300'}`} />
            <span>
              <span className="block text-sm font-black text-slate-950">{option.label}</span>
              <span className="text-xs text-slate-500">{option.desc}</span>
            </span>
          </button>
        ))}
      </SectionCard>
      <SectionCard title="Contact information">
        <Toggle checked={settings.privacy.showPhone} onChange={(value) => updatePrivacy('showPhone', value)} label="Show phone number on profile" />
        <Toggle checked={settings.privacy.showEmail} onChange={(value) => updatePrivacy('showEmail', value)} label="Show email on profile" />
        <Toggle checked={settings.privacy.allowDirectMessages} onChange={(value) => updatePrivacy('allowDirectMessages', value)} label="Allow direct messages from fundis" />
      </SectionCard>
      <SectionCard title="Data & analytics">
        <Toggle checked={settings.privacy.useDataForMatching} onChange={(value) => updatePrivacy('useDataForMatching', value)} label="Allow Fundilink to use my data for matching improvements" />
        <Toggle checked={settings.privacy.shareAnonymisedUsage} onChange={(value) => updatePrivacy('shareAnonymisedUsage', value)} label="Share anonymised usage data" />
      </SectionCard>
      <button onClick={saveSettings} className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
        <Save className="h-4 w-4" />
        Save privacy
      </button>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-5">
      <SectionCard title="Current plan">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-3xl font-black text-slate-950">{settings.billing.plan}</p>
          <p className="mt-2 text-sm text-slate-500">Core hiring tools are available on the Free plan.</p>
          <button onClick={() => showToast('Plan upgrades are coming soon.')} className="mt-4 rounded-full bg-[#F97316] px-4 py-2 text-xs font-black text-white">Upgrade Plan</button>
        </div>
      </SectionCard>
      <SectionCard title="Payment method">
        <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No payment method on file.</p>
        <button onClick={() => showToast('M-Pesa and card setup is coming soon.')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]">
          <Smartphone className="h-4 w-4" />
          Add M-Pesa / Card
        </button>
      </SectionCard>
      <SectionCard title="Billing history">
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No billing history yet.</p>
      </SectionCard>
    </div>
  );

  const renderIntegrations = () => (
    <SectionCard title="Coming soon">
      {['WhatsApp Business', 'Google Calendar', 'M-Pesa automated payments'].map(item => (
        <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <PlugZap className="h-5 w-5 text-[#F97316]" />
          <span className="text-sm font-black text-slate-950">{item}</span>
        </div>
      ))}
    </SectionCard>
  );

  const contentByTab: Record<SettingsTab, ReactNode> = {
    account: renderAccount(),
    notifications: renderNotifications(),
    privacy: renderPrivacy(),
    billing: renderBilling(),
    integrations: renderIntegrations(),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-5 py-8 sm:px-8 lg:px-10">
      <header className="border-b border-slate-200 pb-7">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Dashboard &gt; Settings</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Account settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Private controls for account access, notifications, privacy, billing, and future integrations.</p>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black transition ${activeTab === tab.key ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'}`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {contentByTab[activeTab]}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Delete account</h2>
                <p className="text-xs text-slate-500">Type DELETE to confirm.</p>
              </div>
            </div>
            <input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="DELETE" className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black outline-none focus:border-red-500" />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700">Cancel</button>
              <button onClick={confirmDeleteAccount} className="rounded-full border border-red-200 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-50">Delete Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
