import { useState } from 'react';

import {
  HawkCheckbox,
  HawkCheckboxGroup,
  HawkChipInput,
  HawkCodeInput,
  HawkCombobox,
  HawkCurrencyInput,
  HawkDataState,
  HawkDateInput,
  HawkDropdown,
  HawkFileUpload,
  HawkHandleInput,
  HawkKeypad,
  HawkMultiSelect,
  HawkPasswordInput,
  HawkPhoneInput,
  HawkRadioGroup,
  HawkRating,
  HawkSearchInput,
  HawkSlotPicker,
  HawkStepper,
  HawkSwitch,
  HawkTextArea,
  HawkTextInput,
  HawkTimeInput,
  IconMail,
} from '@ohlify/hawk-ui';

import {
  PreviewGrid,
  PreviewPage,
  PreviewSection,
  PreviewStage,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

const BANKS = [
  { value: 'gtb', label: 'GTBank', description: '058' },
  { value: 'zenith', label: 'Zenith Bank', description: '057' },
  { value: 'access', label: 'Access Bank', description: '044' },
  { value: 'kuda', label: 'Kuda', description: '090267', disabled: true },
];

/**
 * @HawkPage slug=40-input-text name=Text inputs group=Inputs
 * @HawkStates default focus disabled readonly error readonly-error
 *
 * The triad, demonstrated on every combination.
 */
export function PageTextInput() {
  const [value, setValue] = useState('Adaeze Okonkwo');

  return (
    <PreviewPage
      title="Text inputs"
      kicker="Inputs · 40–47, 50, 63, 69"
      intro="Every input-family component carries three independent booleans — disabled, readOnly, error — never one collapsed state enum."
    >
      <PreviewSection
        title="The triad"
        rule="The pre-Hawk app had disabled and errorMessage but no readOnly, so locked-but-readable data was faked with disabled — muting information the user needs to read. Note that the read-only field below keeps full ink contrast while the disabled one does not."
      >
        <PreviewGrid columns={2}>
          <HawkTextInput label="Enabled" value={value} onChange={setValue} />
          <HawkTextInput label="Disabled" value={value} state={{ disabled: true }} />
          <HawkTextInput
            label="Read-only"
            value={value}
            state={{ readOnly: true }}
            hint="Legible and real, but locked right now."
          />
          <HawkTextInput
            label="Error"
            value="adaeze@"
            state={{ error: true, errorText: 'That does not look like an email address' }}
          />
          <HawkTextInput
            label="Read-only + error"
            value={value}
            state={{
              readOnly: true,
              error: true,
              errorText: 'Does not match your verified identity',
            }}
            hint="A KYC field under review that failed a prior check."
          />
          <HawkTextInput
            label="Disabled + error"
            value={value}
            state={{ disabled: true, error: true, errorText: 'Hidden while disabled' }}
            hint="The error is suppressed: an error ring on a control nobody can touch is noise the user cannot act on."
          />
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="Variants">
        <PreviewGrid columns={2}>
          <HawkTextInput label="With a glyph" leadingIcon={IconMail} placeholder="you@example.com" />
          <HawkTextInput label="With a counter" maxLength={40} showCount value={value} onChange={setValue} />
          <HawkPhoneInput label="Phone" />
          <HawkPasswordInput label="Password" showStrength value="hunter2" />
          <HawkHandleInput label="Handle" value="adaeze" available />
          <HawkHandleInput label="Handle" value="taken" available={false} />
          <HawkTextArea label="Bio" maxLength={280} rows={3} placeholder="Tell clients about yourself" />
          <div className="flex flex-col gap-hawk-4">
            <HawkSearchInput placeholder="Search professionals" />
            <HawkSearchInput placeholder="Searching…" searching value="tax" />
          </div>
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="default">
          <HawkTextInput placeholder="Enter a value" />
        </PreviewState>
        <PreviewState name="focus" note="Click into the field.">
          <HawkTextInput placeholder="Enter a value" />
        </PreviewState>
        <PreviewState name="disabled">
          <HawkTextInput value="Locked" state={{ disabled: true }} />
        </PreviewState>
        <PreviewState name="readonly" note="Full ink retained.">
          <HawkTextInput value="Adaeze Okonkwo" state={{ readOnly: true }} />
        </PreviewState>
        <PreviewState name="error">
          <HawkTextInput value="bad" state={{ error: true, errorText: 'Invalid' }} />
        </PreviewState>
        <PreviewState name="readonly-error">
          <HawkTextInput
            value="Adaeze O."
            state={{ readOnly: true, error: true, errorText: 'Name mismatch' }}
          />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=41-input-currency name=Currency & stepper group=Inputs
 * @HawkStates default preset max disabled
 *
 * Kobo in, kobo out.
 */
export function PageCurrency() {
  const [amount, setAmount] = useState(500_000);
  const [minutes, setMinutes] = useState(15);

  return (
    <PreviewPage
      title="Currency & stepper"
      kicker="Inputs · 41, 49"
      intro="The currency input takes and emits kobo, never naira and never a float. The user types whole naira; the component converts on every keystroke, so the caller never sees a display string."
    >
      <PreviewSection
        title="Currency"
        rule="Digits only. A currency field that accepts '12.5.3' and silently coerces it is a field that will one day post a wrong journal."
      >
        <PreviewGrid columns={2}>
          <HawkCurrencyInput label="Amount" value={amount} onChange={setAmount} />
          <HawkCurrencyInput
            label="With presets"
            value={amount}
            onChange={setAmount}
            presets={[100_000, 500_000, 1_000_000, 5_000_000]}
          />
          <HawkCurrencyInput
            label="Capped"
            value={amount}
            onChange={setAmount}
            maxKobo={1_000_000}
            hint="Cannot exceed ₦10,000."
          />
          <HawkCurrencyInput label="Disabled" value={amount} state={{ disabled: true }} />
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="Stepper">
        <div className="flex flex-wrap gap-hawk-7">
          <HawkStepper label="Minimum call length" value={minutes} onChange={setMinutes} min={5} max={60} step={5} suffix="min" />
          <HawkStepper label="Disabled" value={3} state={{ disabled: true }} />
        </div>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="default">
          <HawkCurrencyInput value={250_000} onChange={() => {}} />
        </PreviewState>
        <PreviewState name="preset">
          <HawkCurrencyInput value={100_000} onChange={() => {}} presets={[100_000, 500_000]} />
        </PreviewState>
        <PreviewState name="max">
          <HawkCurrencyInput value={1_000_000} onChange={() => {}} maxKobo={1_000_000} />
        </PreviewState>
        <PreviewState name="disabled">
          <HawkCurrencyInput value={250_000} state={{ disabled: true }} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=53-dropdown name=Dropdown & combobox group=Inputs
 * @HawkStates default loading empty error disabled
 *
 * Selection with its own four data states.
 */
export function PageDropdown() {
  const [bank, setBank] = useState<string | undefined>(undefined);
  const [interests, setInterests] = useState<string[]>(['tax']);

  return (
    <PreviewPage
      title="Dropdown, combobox & multi-select"
      kicker="Inputs · 52–53, 67–68"
      intro="A dropdown backed by a network list can be loading, empty or in error, and each needs to say so inside the menu rather than by showing an empty box."
    >
      <PreviewSection title="Dropdown">
        <PreviewGrid columns={2}>
          <HawkDropdown label="Bank" options={BANKS} value={bank} onChange={setBank} />
          <HawkDropdown
            label="Loading"
            options={[]}
            dataState={HawkDataState.LOADING}
            onChange={() => {}}
          />
          <HawkDropdown
            label="Empty"
            options={[]}
            dataState={HawkDataState.EMPTY}
            emptyMessage="No banks available right now"
            onChange={() => {}}
          />
          <HawkDropdown
            label="Error"
            options={[]}
            errorMessage="Could not load banks"
            onRetry={() => {}}
            onChange={() => {}}
          />
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Combobox"
        note="Filters locally when the caller does not supply a query handler, and defers to the caller when it does — a combobox over a paginated endpoint must not silently filter only the page it happens to be holding."
      >
        <div className="max-w-sm">
          <HawkCombobox label="Search banks" options={BANKS} value={bank} onChange={setBank} />
        </div>
      </PreviewSection>

      <PreviewSection
        title="Multi-select"
        rule="At the cap, unselected options are disabled rather than hidden: hiding them would make the list appear to lose entries, and the user could not see what they would gain by deselecting."
      >
        <div className="max-w-sm">
          <HawkMultiSelect
            label="Interests"
            max={3}
            options={[
              { value: 'tax', label: 'Tax law' },
              { value: 'property', label: 'Property' },
              { value: 'startup', label: 'Startups' },
              { value: 'family', label: 'Family law' },
            ]}
            value={interests}
            onChange={setInterests}
          />
        </div>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="default">
          <HawkDropdown options={BANKS} onChange={() => {}} />
        </PreviewState>
        <PreviewState name="loading">
          <HawkDropdown options={[]} dataState={HawkDataState.LOADING} onChange={() => {}} />
        </PreviewState>
        <PreviewState name="empty">
          <HawkDropdown options={[]} dataState={HawkDataState.EMPTY} onChange={() => {}} />
        </PreviewState>
        <PreviewState name="error">
          <HawkDropdown options={[]} errorMessage="Could not load" onChange={() => {}} />
        </PreviewState>
        <PreviewState name="disabled">
          <HawkDropdown options={BANKS} state={{ disabled: true }} onChange={() => {}} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=54-checkbox name=Selection controls group=Inputs
 * @HawkStates unchecked checked indeterminate disabled readonly
 *
 * Checkbox, radio, switch and rating.
 */
export function PageSelection() {
  const [checked, setChecked] = useState(true);
  const [role, setRole] = useState('professional');
  const [on, setOn] = useState(true);
  const [stars, setStars] = useState(4);
  const [days, setDays] = useState<string[]>(['mon', 'wed']);

  return (
    <PreviewPage
      title="Selection controls"
      kicker="Inputs · 54–58, 62"
      intro="All four render a real input beneath a styled box rather than faking the control with a div. The native element is what gives them keyboard behaviour, form participation and correct announcement for free."
    >
      <PreviewSection
        title="Checkbox"
        note="readOnly has no native effect on a checkbox, so the guard is on the handler. Without it, a read-only checkbox would still toggle."
      >
        <div className="flex flex-col gap-hawk-4">
          <HawkCheckbox label="I agree to the terms" checked={checked} onChange={setChecked} />
          <HawkCheckbox
            label="With a description"
            description="Extra context the user needs before deciding."
            checked={checked}
            onChange={setChecked}
          />
          <HawkCheckbox label="Indeterminate" indeterminate onChange={() => {}} />
          <HawkCheckbox label="Disabled" checked state={{ disabled: true }} />
          <HawkCheckbox label="Read-only" checked state={{ readOnly: true }} />
        </div>
      </PreviewSection>

      <PreviewSection title="Radio & checkbox groups">
        <PreviewGrid columns={2}>
          <HawkRadioGroup
            label="I am a"
            options={[
              { value: 'client', label: 'Client', description: 'I want to talk to someone' },
              { value: 'professional', label: 'Professional', description: 'I want to be paid for my time' },
            ]}
            value={role}
            onChange={setRole}
          />
          <HawkCheckboxGroup
            label="Available days"
            inline
            options={[
              { value: 'mon', label: 'Mon' },
              { value: 'tue', label: 'Tue' },
              { value: 'wed', label: 'Wed' },
              { value: 'thu', label: 'Thu' },
            ]}
            value={days}
            onChange={setDays}
          />
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Switch"
        note="A role=switch button rather than a checkbox: a switch takes effect immediately, and announcing it as a checkbox implies a form the user must still submit."
      >
        <div className="flex max-w-md flex-col gap-hawk-5">
          <HawkSwitch label="Accept video calls" checked={on} onChange={setOn} />
          <HawkSwitch
            label="Hide amounts"
            description="Masks every amount across the app."
            checked={on}
            onChange={setOn}
            reversed
          />
          <HawkSwitch label="Disabled" checked state={{ disabled: true }} />
        </div>
      </PreviewSection>

      <PreviewSection title="Rating">
        <div className="flex flex-col gap-hawk-4">
          <HawkRating value={stars} onChange={setStars} />
          <HawkRating value={4.6} readOnly showValue count={128} />
        </div>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="unchecked">
          <HawkCheckbox label="Option" onChange={() => {}} />
        </PreviewState>
        <PreviewState name="checked">
          <HawkCheckbox label="Option" checked onChange={() => {}} />
        </PreviewState>
        <PreviewState name="indeterminate">
          <HawkCheckbox label="Option" indeterminate onChange={() => {}} />
        </PreviewState>
        <PreviewState name="disabled">
          <HawkCheckbox label="Option" checked state={{ disabled: true }} />
        </PreviewState>
        <PreviewState name="readonly">
          <HawkCheckbox label="Option" checked state={{ readOnly: true }} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=45-input-otp name=Code, keypad & pickers group=Inputs
 * @HawkStates default filled error locked
 *
 * OTP, passcode, dates, files and slots.
 */
export function PageCode() {
  const [code, setCode] = useState('');
  const [tags, setTags] = useState<string[]>(['Tax law', 'Property']);
  const [slot, setSlot] = useState<string | undefined>('14:30');

  return (
    <PreviewPage
      title="Code, keypad & pickers"
      kicker="Inputs · 43–46, 51, 60–61, 146"
      intro="One input per cell, because the alternative — a single field styled to look like cells — breaks the platform's own SMS autofill, which is the most valuable affordance an OTP field has."
    >
      <PreviewSection title="OTP & passcode">
        <PreviewGrid columns={2}>
          <div className="max-w-xs">
            <HawkCodeInput label="Verification code" length={6} value={code} onChange={setCode} />
          </div>
          <div className="max-w-[12rem]">
            <HawkCodeInput label="Passcode" length={4} masked value="12" onChange={() => {}} />
          </div>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Keypad"
        note="Used on the app-lock screen in place of the platform keyboard: it is faster for digits, and a full keyboard on a passcode screen is a shoulder-surfing surface the keypad avoids."
      >
        <PreviewStage>
          <HawkKeypad onDigit={() => {}} onBackspace={() => {}} />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Dates & times"
        rule="Native pickers. A hand-rolled calendar is a large surface to get wrong — locale, keyboard navigation, screen-reader semantics — and the native control already handles all three, including the mobile wheel users know."
      >
        <PreviewGrid columns={2}>
          <HawkDateInput label="Date of birth" />
          <HawkTimeInput label="Available from" />
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="Chips & files">
        <PreviewGrid columns={2}>
          <HawkChipInput label="Specialities" value={tags} onChange={setTags} max={5} />
          <HawkFileUpload
            label="Identity document"
            accept="image/*,.pdf"
            files={[
              { id: '1', name: 'nin-front.jpg', size: 284_120 },
              { id: '2', name: 'nin-back.jpg', progress: 0.62 },
              { id: '3', name: 'proof.pdf', error: 'File is larger than 5 MB' },
            ]}
            onSelect={() => {}}
            onRemove={() => {}}
          />
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Slot picker"
        rule="Unavailable slots stay visible rather than being filtered out. Seeing that 14:00 exists but is taken tells the user something real about demand; silently omitting it makes the day look sparse and the professional look unavailable."
      >
        <div className="max-w-md">
          <HawkSlotPicker
            label="Pick a time"
            value={slot}
            onChange={setSlot}
            slots={[
              { time: '09:00', available: true },
              { time: '09:30', available: false, reason: 'Already booked' },
              { time: '10:00', available: true },
              { time: '14:00', available: false, reason: 'Already booked' },
              { time: '14:30', available: true },
              { time: '15:00', available: true },
            ]}
          />
        </div>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="default">
          <HawkCodeInput length={4} onChange={() => {}} />
        </PreviewState>
        <PreviewState name="filled">
          <HawkCodeInput length={4} value="1234" onChange={() => {}} />
        </PreviewState>
        <PreviewState name="error">
          <HawkCodeInput length={4} value="12" state={{ error: true, errorText: 'Wrong code' }} onChange={() => {}} />
        </PreviewState>
        <PreviewState name="locked" note="Disabled with the wait stated.">
          <HawkCodeInput
            length={4}
            masked
            state={{ disabled: true, error: true, errorText: 'Locked until 14:38' }}
          />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}
